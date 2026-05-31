import base64
import json
import re
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from agent_core.db import (
    add_message,
    create_connection,
    create_conversation,
    create_knowledge_draft_asset,
    create_knowledge_profile_draft,
    get_knowledge_profile_draft,
    list_knowledge_draft_assets,
    update_message,
    update_knowledge_profile_draft_status,
)
from agent_core.knowledge_service import (
    PROFILE_FIELD_TITLES,
    clean_profile_text,
    enterprise_profile_from_mapping,
    get_profile_detail,
    infer_enterprise_profile_from_text,
    save_enterprise_profile,
)
from agent_core.llm_gateway import LLMGateway, ProviderRequestError
from agent_core.rag_service import RAGService, chunk_text, extract_document_text
from agent_core.schemas import (
    EnterpriseProfileRequest,
    KnowledgeDraft,
    KnowledgeDraftAsset,
    KnowledgeDraftConfirmRequest,
    KnowledgeDraftConfirmResponse,
    KnowledgeDraftCreateRequest,
)


REQUIRED_DRAFT_FIELDS = [
    "company_name",
    "industry",
    "main_business",
    "detailed_intro",
    "products_services",
    "product_features",
    "user_pain_points",
    "trust_endorsements",
    "business_regions",
    "current_pain_points",
    "core_advantages",
    "target_keywords",
]


class KnowledgeDraftService:
    def __init__(
        self,
        data_dir: Path,
        llm_gateway: LLMGateway,
        rag_service: RAGService,
        project_root: Path,
    ) -> None:
        self.data_dir = data_dir
        self.llm_gateway = llm_gateway
        self.rag_service = rag_service
        self.project_root = project_root

    def create_draft(self, payload: KnowledgeDraftCreateRequest) -> KnowledgeDraft:
        draft_id = str(uuid.uuid4())
        draft_dir = self.data_dir / "knowledge_drafts" / draft_id
        draft_dir.mkdir(parents=True, exist_ok=True)
        conversation_id = create_conversation(self.data_dir, payload.conversation_id, payload.project_id)
        user_message = (
            payload.message.strip()
            if payload.message and payload.message.strip()
            else "请根据我上传的资料建立企业知识库。"
        )
        add_message(self.data_dir, conversation_id, "user", user_message)

        text_parts = []
        if payload.message:
            text_parts.append(payload.message.strip())
        asset_filenames = []
        for asset in payload.assets:
            suffix = Path(asset.filename).suffix.lower()
            file_path = draft_dir / f"{uuid.uuid4()}{suffix}"
            file_path.write_bytes(base64.b64decode(asset.content_base64))
            try:
                extracted_text = extract_document_text(file_path, asset.content_type)
                status = "parsed"
                error_message = None
                if extracted_text.strip():
                    text_parts.append(extracted_text)
            except Exception as error:
                extracted_text = ""
                status = "failed"
                error_message = str(error)
            create_knowledge_draft_asset(
                self.data_dir,
                draft_id=draft_id,
                filename=asset.filename,
                content_type=asset.content_type,
                file_path=str(file_path),
                extracted_text=extracted_text,
                status=status,
                error_message=error_message,
            )
            asset_filenames.append(asset.filename)

        raw_text = "\n\n".join(part for part in text_parts if part).strip()
        if not raw_text:
            raise ValueError("未解析到可用于建立知识库的文本内容")

        profile = self.extract_profile(raw_text, payload.project_id)
        missing_fields = compute_missing_fields(profile)
        confidence = {
            field: "high" if field not in missing_fields else "missing"
            for field in REQUIRED_DRAFT_FIELDS
        }
        source_summary = {
            "files": asset_filenames,
            "text_chars": len(raw_text),
            "text_chunks": len(chunk_text(raw_text)),
        }

        create_knowledge_profile_draft(
            self.data_dir,
            draft_id=draft_id,
            intent=payload.intent if payload.intent in {"create", "update"} else "create",
            project_id=payload.project_id,
            conversation_id=conversation_id,
            assistant_message_id=None,
            profile_json=json.dumps(profile.model_dump(), ensure_ascii=False),
            missing_fields_json=json.dumps(missing_fields, ensure_ascii=False),
            confidence_json=json.dumps(confidence, ensure_ascii=False),
            source_summary_json=json.dumps(source_summary, ensure_ascii=False),
            raw_text=raw_text,
        )
        draft = self.get_draft(draft_id)
        assistant_message_id = add_message(
            self.data_dir,
            conversation_id,
            "assistant",
            serialize_draft_message(
                draft,
                "我已根据资料生成企业知识库草稿。请先核对下方模板内容，确认后我再正式建立知识库并生成本地索引。",
            ),
            build_draft_message_metadata(draft, "approval-requested"),
        )
        with create_connection(self.data_dir) as conn:
            conn.execute(
                """
                UPDATE knowledge_profile_drafts
                SET assistant_message_id = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (assistant_message_id, draft_id),
            )
            conn.commit()
        return self.get_draft(draft_id)

    def extract_profile(self, raw_text: str, project_id: Optional[str]) -> EnterpriseProfileRequest:
        structured: Optional[Dict[str, Any]] = None
        try:
            structured = self.llm_gateway.extract_enterprise_profile(
                build_extraction_text(raw_text, self.project_root)
            )
        except ProviderRequestError:
            structured = None
        if structured:
            profile = enterprise_profile_from_mapping(structured, project_id or build_project_id(structured, raw_text))
        else:
            profile = infer_enterprise_profile_from_text(raw_text, project_id or build_project_id({}, raw_text))

        data = profile.model_dump()
        data["project_id"] = project_id or build_project_id(data, raw_text)
        data["company_name"] = clean_profile_text(data.get("company_name")) or "未命名企业知识库"
        return EnterpriseProfileRequest(**data)

    def get_draft(self, draft_id: str) -> KnowledgeDraft:
        row = get_knowledge_profile_draft(self.data_dir, draft_id)
        if row is None:
            raise KeyError(draft_id)
        return draft_from_row(row, list_knowledge_draft_assets(self.data_dir, draft_id))

    def confirm_draft(
        self,
        draft_id: str,
        payload: KnowledgeDraftConfirmRequest,
    ) -> KnowledgeDraftConfirmResponse:
        draft = self.get_draft(draft_id)
        if draft.status != "pending":
            raise ValueError("该知识库草稿已处理，不能重复确认")

        profile = payload.profile or draft.profile
        project_id = profile.project_id or draft.project_id or build_project_id(profile.model_dump(), profile.company_name)
        profile.project_id = project_id
        save_enterprise_profile(self.data_dir, profile)

        assets_dir = self.data_dir / "knowledge_assets" / project_id
        assets_dir.mkdir(parents=True, exist_ok=True)
        for asset in list_knowledge_draft_assets(self.data_dir, draft_id):
            source_path = Path(asset["file_path"])
            if not source_path.exists():
                continue
            target_path = assets_dir / f"{uuid.uuid4()}{source_path.suffix.lower()}"
            shutil.copy2(source_path, target_path)
            asset_id = self.rag_service.register_existing_asset(
                project_id=project_id,
                filename=asset["filename"],
                content_type=asset["content_type"],
                file_path=target_path,
            )
            self.rag_service.ingest_asset(asset_id, rebuild_profile=False)

        profile_after_assets = get_profile_detail(self.data_dir, project_id).profile
        save_enterprise_profile(self.data_dir, EnterpriseProfileRequest(**profile_after_assets.model_dump()))
        self.rag_service.index_project(project_id)
        update_knowledge_profile_draft_status(self.data_dir, draft_id, "confirmed")
        detail = get_profile_detail(self.data_dir, project_id)
        detail.index_status = self.rag_service.index_status(project_id)
        response = KnowledgeDraftConfirmResponse(
            ok=True,
            project_id=project_id,
            profile=detail.profile,
            entries=detail.entries,
            total=detail.total,
            index_status=detail.index_status,
        )
        if draft.conversation_id:
            if draft.assistant_message_id:
                update_message(
                    self.data_dir,
                    draft.assistant_message_id,
                    f"已建立「{response.profile.company_name}」企业知识库。\n\n已生成 {response.total} 条知识条目，并完成本地索引。后续 ChatBox、文章生成和网页生成都会优先检索这份企业资料。",
                    build_draft_message_metadata(draft, "output-available", True, status="confirmed"),
                )
            else:
                add_message(
                    self.data_dir,
                    draft.conversation_id,
                    "assistant",
                    f"已建立「{response.profile.company_name}」企业知识库。\n\n已生成 {response.total} 条知识条目，并完成本地索引。",
                )
        return response

    def reject_draft(self, draft_id: str) -> None:
        draft = self.get_draft(draft_id)
        if draft.status == "pending":
            update_knowledge_profile_draft_status(self.data_dir, draft_id, "rejected")
            if draft.assistant_message_id:
                update_message(
                    self.data_dir,
                    draft.assistant_message_id,
                    "已取消本次知识库草稿，未写入企业知识库。你可以继续上传资料或补充说明后重新生成。",
                    build_draft_message_metadata(draft, "output-available", False, status="rejected"),
                )


def draft_from_row(row, asset_rows) -> KnowledgeDraft:
    profile_data = parse_json(row["profile_json"], {})
    profile = EnterpriseProfileRequest(**profile_data)
    return KnowledgeDraft(
        id=row["id"],
        intent=row["intent"],
        project_id=row["project_id"],
        conversation_id=row["conversation_id"],
        assistant_message_id=row["assistant_message_id"],
        status=row["status"],
        profile=profile,
        missing_fields=parse_json(row["missing_fields_json"], []),
        confidence=parse_json(row["confidence_json"], {}),
        source_summary=parse_json(row["source_summary_json"], {}),
        assets=[
            KnowledgeDraftAsset(
                id=asset["id"],
                draft_id=asset["draft_id"],
                filename=asset["filename"],
                content_type=asset["content_type"],
                file_path=asset["file_path"],
                status=asset["status"],
                error_message=asset["error_message"],
                created_at=asset["created_at"],
                updated_at=asset["updated_at"],
            )
            for asset in asset_rows
        ],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


DRAFT_MESSAGE_MARKER = "__GEO_KNOWLEDGE_DRAFT__"


def serialize_draft_message(draft: KnowledgeDraft, content: str) -> str:
    payload = {
        "content": content,
        "draft": draft.model_dump(mode="json"),
    }
    return f"{DRAFT_MESSAGE_MARKER}{json.dumps(payload, ensure_ascii=False)}"


def build_draft_message_metadata(
    draft: KnowledgeDraft,
    confirmation_state: str,
    confirmation_approved: Optional[bool] = None,
    status: Optional[str] = None,
) -> dict:
    metadata = {
        "type": "knowledge_draft",
        "draft_id": draft.id,
        "draft": draft.model_dump(mode="json"),
        "confirmation_state": confirmation_state,
    }
    if confirmation_approved is not None:
        metadata["confirmation_approved"] = confirmation_approved
    if status:
        metadata["status"] = status
    return metadata


def parse_json(raw: str, fallback):
    try:
        return json.loads(raw or "")
    except json.JSONDecodeError:
        return fallback


def compute_missing_fields(profile: EnterpriseProfileRequest) -> list[str]:
    data = profile.model_dump()
    missing = []
    for field in REQUIRED_DRAFT_FIELDS:
        value = clean_profile_text(data.get(field))
        if not value or value in {"待补充", "未填", "未填写"}:
            missing.append(PROFILE_FIELD_TITLES[field])
    return missing


def build_project_id(data: Dict[str, Any], fallback_text: str) -> str:
    name = clean_profile_text(data.get("company_name")) or clean_profile_text(data.get("short_name"))
    if not name:
        match = re.search(r"([\u4e00-\u9fa5A-Za-z0-9（）()·\-]{4,40}(?:有限公司|有限责任公司|股份有限公司))", fallback_text)
        name = match.group(1) if match else "enterprise"
    slug = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", name).strip("-").lower()
    return f"kb-{slug[:36] or 'enterprise'}"


def build_extraction_text(raw_text: str, project_root: Path) -> str:
    skill_path = project_root / ".skills" / "knowledge-base-ingest" / "SKILL.md"
    skill_text = skill_path.read_text(encoding="utf-8") if skill_path.exists() else ""
    return (
        "请按照以下技能要求抽取企业知识库字段。\n\n"
        f"【技能要求】\n{skill_text}\n\n"
        "【用户资料】\n"
        f"{raw_text}"
    )
