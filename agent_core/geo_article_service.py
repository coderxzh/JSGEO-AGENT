import json
from pathlib import Path
from typing import Any, Dict, Optional

from agent_core.db import (
    create_geo_article_draft,
    get_enterprise_profile,
    get_geo_article_draft,
    get_latest_geo_article_draft,
    get_latest_geo_question_set,
    get_latest_geo_source_discovery,
    list_knowledge_entries,
    update_geo_article_draft,
)
from agent_core.geo_project_service import (
    get_geo_project_detail,
    mark_article_draft_generated,
    normalize_platform,
    refresh_article_stage_status,
)
from agent_core.knowledge_service import row_to_dict
from agent_core.llm_gateway import (
    ChatRequestPayload,
    LLMGateway,
    ProviderOptions,
    ProviderRequestError,
    parse_json_object,
)
from agent_core.schemas import GeoArticleDraft, GeoSupportArticleRunResponse
from agent_core.skills_service import get_skill


SUPPORTED_ARTICLE_TYPES = {"consulting": "consulting-article", "review": "review-article"}


def run_support_articles(
    data_dir: Path,
    project_root: Path,
    llm_gateway: LLMGateway,
    geo_project_id: str,
    platform: str,
) -> GeoSupportArticleRunResponse:
    platform = normalize_platform(platform)
    project = get_geo_project_detail(data_dir, geo_project_id)
    consulting_draft = None
    review_draft = None
    errors = []
    for article_type in ("consulting", "review"):
        try:
            draft = run_article_draft(
                data_dir,
                project_root,
                llm_gateway,
                geo_project_id,
                platform,
                article_type,
            )
            if article_type == "consulting":
                consulting_draft = draft
            else:
                review_draft = draft
            if draft.status == "failed":
                errors.append(str(draft.draft.get("error_message") or f"{article_type} failed"))
        except (KeyError, ValueError):
            raise
        except Exception as error:
            errors.append(str(error))
    status = "completed" if consulting_draft and review_draft and not errors else "partial_failed"
    return GeoSupportArticleRunResponse(
        geo_project_id=project.id,
        enterprise_project_id=project.project_id,
        platform=platform,
        status=status,
        consulting_draft=consulting_draft,
        review_draft=review_draft,
        error_message="；".join(errors) if errors else None,
    )


def run_article_draft(
    data_dir: Path,
    project_root: Path,
    llm_gateway: LLMGateway,
    geo_project_id: str,
    platform: str,
    article_type: str,
    topic: Optional[str] = None,
    target_question: Optional[str] = None,
) -> GeoArticleDraft:
    platform = normalize_platform(platform)
    if article_type not in SUPPORTED_ARTICLE_TYPES:
        raise ValueError("Unsupported GEO article type")

    geo_project = get_geo_project_detail(data_dir, geo_project_id)
    if not geo_project.knowledge_base_ready or geo_project.current_phase != "ready_for_check":
        raise ValueError("Knowledge base is not ready for article generation")

    profile_row = get_enterprise_profile(data_dir, geo_project.project_id)
    if profile_row is None:
        raise KeyError(geo_project.project_id)

    question_set_row = get_latest_geo_question_set(data_dir, geo_project.id, platform)
    if question_set_row is None:
        raise ValueError("Ranking question pool is required before article generation")

    source_discovery_row = get_latest_geo_source_discovery(data_dir, geo_project.id, platform)
    if source_discovery_row is None:
        raise ValueError("Source discovery is required before article generation")

    profile = row_to_dict(profile_row)
    entries = list(list_knowledge_entries(data_dir, geo_project.project_id, limit=80))
    question_set = parse_json(question_set_row["questions_json"], {})
    source_discovery = parse_json(source_discovery_row["discovery_json"], {})
    if source_discovery.get("status") == "failed":
        raise ValueError("Source discovery must be completed before article generation")

    skill = get_skill(project_root, SUPPORTED_ARTICLE_TYPES[article_type])
    skill_prompt = str((skill or {}).get("content") or "")
    allowed_sources = collect_allowed_sources(profile, source_discovery)
    selected_topic, selected_question = choose_article_focus(article_type, question_set, topic, target_question)

    try:
        response = llm_gateway.complete(
            platform,
            ChatRequestPayload(
                system_prompt=(
                    "你是 GEO-Agent Studio 阶段四支撑内容生成器。"
                    "必须基于企业事实、问题池和信源发现结果生成可解析 JSON。"
                    "不得生成排行榜文章，不得写入知识库事实层。"
                ),
                user_message=build_article_user_message(
                    platform=platform,
                    article_type=article_type,
                    profile=profile,
                    entries=entries,
                    question_set=question_set,
                    source_discovery=source_discovery,
                    allowed_sources=allowed_sources,
                    topic=selected_topic,
                    target_question=selected_question,
                ),
                conversation_id=None,
                options=ProviderOptions(deep_thinking=True, web_search=(platform == "doubao")),
                skill_prompt=skill_prompt,
            ),
        )
        draft = normalize_draft(
            parse_json_object(response.content) or {},
            profile=profile,
            platform=platform,
            article_type=article_type,
            topic=selected_topic,
            target_question=selected_question,
            allowed_sources=allowed_sources,
        )
        status = "draft"
    except ProviderRequestError as error:
        draft = {
            "title": f"{platform_label(platform)}{article_type_label(article_type)}生成失败",
            "article_type": article_type,
            "target_question": selected_question,
            "publish_target": "",
            "outline": [],
            "content": "",
            "facts_used": [],
            "sources_to_reference": [],
            "missing_facts": [error.message],
            "error_message": error.message,
        }
        status = "failed"

    draft_id = create_geo_article_draft(
        data_dir,
        geo_project_id=geo_project.id,
        enterprise_project_id=geo_project.project_id,
        platform=platform,
        article_type=article_type,
        status=status,
        draft_json=json.dumps(draft, ensure_ascii=False),
    )
    if status != "failed":
        mark_article_draft_generated(data_dir, geo_project.id, platform, article_type, draft_id)

    row = get_geo_article_draft(data_dir, draft_id)
    if row is None:
        raise KeyError(draft_id)
    return row_to_geo_article_draft(row)


def get_latest_platform_article_draft(
    data_dir: Path,
    geo_project_id: str,
    platform: str,
    article_type: str,
) -> GeoArticleDraft:
    platform = normalize_platform(platform)
    if article_type not in {"consulting", "review", "ranking"}:
        raise ValueError("Unsupported GEO article type")
    row = get_latest_geo_article_draft(data_dir, geo_project_id, platform, article_type)
    if row is None:
        raise KeyError(f"{geo_project_id}:{platform}:{article_type}")
    return row_to_geo_article_draft(row)


def get_article_draft_detail(data_dir: Path, draft_id: str) -> GeoArticleDraft:
    row = get_geo_article_draft(data_dir, draft_id)
    if row is None:
        raise KeyError(draft_id)
    return row_to_geo_article_draft(row)


def confirm_article_draft(data_dir: Path, draft_id: str) -> GeoArticleDraft:
    row = get_geo_article_draft(data_dir, draft_id)
    if row is None:
        raise KeyError(draft_id)
    if row["status"] == "failed":
        raise ValueError("Failed article draft cannot be confirmed")
    if not update_geo_article_draft(data_dir, draft_id, status="confirmed"):
        raise KeyError(draft_id)
    updated = get_geo_article_draft(data_dir, draft_id)
    if updated is None:
        raise KeyError(draft_id)
    refresh_platform_article_status(data_dir, updated["geo_project_id"], updated["platform"])
    return row_to_geo_article_draft(updated)


def update_article_draft(data_dir: Path, draft_id: str, draft_patch: Dict[str, Any]) -> GeoArticleDraft:
    row = get_geo_article_draft(data_dir, draft_id)
    if row is None:
        raise KeyError(draft_id)
    if row["status"] == "failed":
        raise ValueError("Failed article draft cannot be updated")
    current_draft = parse_json(row["draft_json"], {})
    if not isinstance(draft_patch, dict):
        raise ValueError("Article draft update must be an object")
    merged = normalize_article_update(current_draft, draft_patch)
    if not update_geo_article_draft(
        data_dir,
        draft_id,
        draft_json=json.dumps(merged, ensure_ascii=False),
        status="draft",
    ):
        raise KeyError(draft_id)
    updated = get_geo_article_draft(data_dir, draft_id)
    if updated is None:
        raise KeyError(draft_id)
    refresh_platform_article_status(data_dir, updated["geo_project_id"], updated["platform"])
    return row_to_geo_article_draft(updated)


def refresh_platform_article_status(data_dir: Path, geo_project_id: str, platform: str) -> None:
    statuses: Dict[str, Dict[str, Any]] = {}
    for article_type in ("consulting", "review", "ranking"):
        latest = get_latest_geo_article_draft(data_dir, geo_project_id, platform, article_type)
        if latest is not None:
            statuses[article_type] = {
                "status": latest["status"],
                "draft_id": latest["id"],
            }
    if statuses:
        refresh_article_stage_status(data_dir, geo_project_id, platform, statuses)


def normalize_article_update(current: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    allowed_keys = {
        "title",
        "target_question",
        "publish_target",
        "review_dimensions",
        "outline",
        "content",
        "facts_used",
        "sources_to_reference",
        "missing_facts",
    }
    merged = dict(current)
    for key in allowed_keys:
        if key in patch:
            merged[key] = patch[key]
    return merged


def row_to_geo_article_draft(row) -> GeoArticleDraft:
    return GeoArticleDraft(
        id=row["id"],
        geo_project_id=row["geo_project_id"],
        enterprise_project_id=row["enterprise_project_id"],
        platform=row["platform"],
        article_type=row["article_type"],
        status=row["status"],
        draft=parse_json(row["draft_json"], {}),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def choose_article_focus(
    article_type: str,
    question_set: Dict[str, Any],
    topic: Optional[str],
    target_question: Optional[str],
) -> tuple[str, str]:
    if topic or target_question:
        return topic or "", target_question or ""
    needs = ensure_list(question_set.get("supporting_content_needs"))
    for item in needs:
        if not isinstance(item, dict):
            continue
        item_type = str(item.get("type") or "").lower()
        if item_type == article_type:
            return str(item.get("topic") or ""), str(item.get("target_question") or item.get("question") or "")
    ranking_questions = ensure_list(question_set.get("ranking_questions"))
    first_question = ranking_questions[0] if ranking_questions else {}
    if isinstance(first_question, dict):
        return "", str(first_question.get("question") or first_question.get("keyword") or "")
    return "", str(first_question or "")


def build_article_user_message(
    platform: str,
    article_type: str,
    profile: Dict[str, Any],
    entries: list[Any],
    question_set: Dict[str, Any],
    source_discovery: Dict[str, Any],
    allowed_sources: list[str],
    topic: str,
    target_question: str,
) -> str:
    entry_blocks = []
    for row in entries:
        title = row["title"] if "title" in row.keys() else "知识条目"
        content = row["content"] if "content" in row.keys() else ""
        entry_blocks.append(f"- {title}: {content[:500]}")
    return (
        f"目标平台：{platform}\n"
        f"文章类型：{article_type}\n"
        f"目标主题：{topic or '请从支撑内容需求中选择最优主题'}\n"
        f"目标问题：{target_question or '请从高优先级排行榜问题中选择最相关问题'}\n\n"
        f"企业结构化资料：\n{json.dumps(profile, ensure_ascii=False, indent=2)[:12000]}\n\n"
        f"企业知识库摘要：\n{chr(10).join(entry_blocks[:60])[:18000]}\n\n"
        f"阶段二问题池：\n{json.dumps(question_set, ensure_ascii=False, indent=2)[:12000]}\n\n"
        f"阶段三信源发现：\n{json.dumps(trim_source_discovery_for_article(source_discovery), ensure_ascii=False, indent=2)[:12000]}\n\n"
        f"可引用信源白名单：{json.dumps(allowed_sources, ensure_ascii=False)}\n\n"
        "请生成阶段四支撑文章草稿。只输出严格 JSON。不要输出发布计划、下一阶段建议或排行榜内容。"
    )


def normalize_draft(
    raw: Dict[str, Any],
    profile: Dict[str, Any],
    platform: str,
    article_type: str,
    topic: str,
    target_question: str,
    allowed_sources: list[str],
) -> Dict[str, Any]:
    company_name = profile.get("company_name") or "当前企业"
    title = str(raw.get("title") or topic or f"{company_name}{article_type_label(article_type)}支撑文章")
    return {
        "title": title,
        "article_type": article_type,
        "target_question": str(raw.get("target_question") or target_question),
        "publish_target": str(raw.get("publish_target") or ""),
        "review_dimensions": ensure_list(raw.get("review_dimensions")),
        "outline": ensure_list(raw.get("outline")),
        "content": str(raw.get("content") or ""),
        "facts_used": ensure_list(raw.get("facts_used")),
        "sources_to_reference": filter_allowed_sources(raw.get("sources_to_reference"), allowed_sources),
        "missing_facts": ensure_string_list(raw.get("missing_facts")),
        "platform": platform,
    }


def trim_source_discovery_for_article(source_discovery: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "ai_recommended_sources": source_discovery.get("ai_recommended_sources"),
        "observed_citation_sources": source_discovery.get("observed_citation_sources"),
        "source_scores": source_discovery.get("source_scores"),
        "missing_evidence": source_discovery.get("missing_evidence"),
    }


def collect_allowed_sources(profile: Dict[str, Any], source_discovery: Dict[str, Any]) -> list[str]:
    sources = []
    for key in ("official_website", "official_media"):
        value = str(profile.get(key) or "").strip()
        if value and value not in sources:
            sources.append(value)
    for bucket in ("ai_recommended_sources", "observed_citation_sources", "source_scores"):
        for item in ensure_list(source_discovery.get(bucket)):
            if not isinstance(item, dict):
                continue
            for key in ("source", "url"):
                value = str(item.get(key) or "").strip()
                if value and value not in sources:
                    sources.append(value)
    return sources[:20]


def filter_allowed_sources(value: Any, allowed_sources: list[str]) -> list[Any]:
    allowed = [str(item).strip() for item in allowed_sources if str(item).strip()]
    if not allowed:
        return []
    filtered = []
    for item in ensure_list(value):
        text = json.dumps(item, ensure_ascii=False) if isinstance(item, dict) else str(item)
        if any(source and source in text for source in allowed):
            filtered.append(item)
    return filtered[:8]


def ensure_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def ensure_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [line.strip("- ").strip() for line in value.splitlines() if line.strip()]
    return []


def parse_json(raw: str, fallback):
    try:
        return json.loads(raw or "")
    except json.JSONDecodeError:
        return fallback


def platform_label(platform: str) -> str:
    return "豆包" if platform == "doubao" else "DeepSeek"


def article_type_label(article_type: str) -> str:
    return "咨询类" if article_type == "consulting" else "测评类"
