import argparse
import asyncio
import json
import logging
from pathlib import Path
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.responses import StreamingResponse

from agent_core.db import (
    add_knowledge_entry,
    add_message,
    cleanup_stale_phase_two_prompt_conversations,
    clear_conversation_history,
    count_knowledge_entries,
    create_connection,
    create_conversation,
    delete_conversation,
    get_conversation,
    get_conversation_summary,
    find_pending_phase_two_prompt_message,
    initialize_database,
    list_conversation_messages,
    list_conversations,
    list_knowledge_entries,
    list_projects,
    search_knowledge_entries,
    update_message,
)
from agent_core.geo_project_service import (
    cancel_phase_two,
    confirm_phase_two,
    ensure_geo_project,
    get_geo_project_detail,
    list_enterprise_geo_projects,
)
from agent_core.geo_article_service import (
    confirm_article_draft,
    get_article_draft_detail,
    get_latest_platform_article_draft,
    run_article_draft,
    run_support_articles,
    update_article_draft,
)
from agent_core.geo_report_service import (
    get_latest_platform_question_set,
    get_latest_platform_report,
    get_question_set_detail,
    get_report_detail,
    run_phase_two_report,
)
from agent_core.knowledge_service import (
    build_knowledge_context,
    delete_profile,
    get_profile_detail,
    list_profiles,
    row_to_knowledge_entry,
    save_enterprise_profile,
)
from agent_core.knowledge_draft_service import KnowledgeDraftService
from agent_core.llm_gateway import (
    DEFAULT_SYSTEM_PROMPT,
    ChatRequestPayload,
    LLMGateway,
    ProviderOptions,
    ProviderRequestError,
    SearchContext,
    provider_status,
    select_provider,
)
from agent_core.schemas import (
    ChatRequest,
    ChatResponse,
    ConfigStatusResponse,
    ConversationDetailResponse,
    ConversationMessage,
    ConversationSummary,
    ConversationsResponse,
    GeoPhaseTwoActionRequest,
    GeoPhaseTwoPromptRequest,
    GeoPhaseTwoPromptResponse,
    GeoArticleDraft,
    GeoArticleDraftActionRequest,
    GeoArticleDraftRunRequest,
    GeoArticleDraftUpdateRequest,
    GeoSupportArticleRunRequest,
    GeoSupportArticleRunResponse,
    GeoProject,
    GeoQuestionSet,
    GeoReport,
    GeoProjectEnsureRequest,
    GeoProjectsResponse,
    GeoWorkflowState,
    GeoSourceDiscoveryRunRequest,
    GeoSourceDiscovery,
    HealthResponse,
    EnterpriseProfileRequest,
    EnterpriseProfileDetailResponse,
    EnterpriseProfilesResponse,
    KnowledgeAssetCreateRequest,
    KnowledgeAssetResponse,
    KnowledgeDraft,
    KnowledgeDraftConfirmRequest,
    KnowledgeDraftConfirmResponse,
    KnowledgeDraftCreateRequest,
    KnowledgeEntriesResponse,
    KnowledgeEntryCreateRequest,
    KnowledgeEntrySearchRequest,
    KnowledgeIndexStatusResponse,
    ProjectsResponse,
)
from agent_core.rag_service import RAGService
from agent_core.skills_service import get_skill, list_skills
from agent_core.source_discovery_service import (
    get_latest_platform_source_discovery,
    get_source_discovery_detail,
    run_source_discovery,
)
from agent_core.workflow_state_service import get_geo_workflow_state


logger = logging.getLogger("geo-agent-backend")


def require_token(expected_token: str):
    def dependency(authorization: Optional[str] = Header(default=None)) -> None:
        if authorization != f"Bearer {expected_token}":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid backend session token",
            )

    return dependency


def load_environment(project_root: Optional[Path] = None) -> None:
    candidates = []
    if project_root:
        candidates.extend([project_root / ".env.local", project_root / ".env"])
    candidates.extend([Path.cwd() / ".env.local", Path.cwd() / ".env"])

    seen = set()
    for path in candidates:
        resolved = path.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        load_dotenv(resolved)


def write_provider_error(data_dir: Path, error: ProviderRequestError) -> None:
    logs_dir = data_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    with (logs_dir / "provider-errors.log").open("a", encoding="utf-8") as handle:
        handle.write(
            f"provider={error.provider} model={error.model} "
            f"status={error.status_code or 'network'} message={error.message}\n"
        )


def build_provider_error_response(data_dir: Path, conversation_id: str, error: ProviderRequestError) -> ChatResponse:
    logger.warning(
        "provider request failed provider=%s model=%s status=%s message=%s",
        error.provider,
        error.model,
        error.status_code,
        error.message,
    )
    write_provider_error(data_dir, error)
    content = (
        f"{error.message}\n\n"
        "请确认 .env 中的 API Key、模型名称和 base_url 正确；如果刚修改过 .env，请重启桌面端后再试。"
    )
    add_message(
        data_dir,
        conversation_id,
        "assistant",
        content,
        build_chat_message_metadata(
            provider=error.provider,
            model=error.model,
            status="error",
            error=error.message,
        ),
    )
    return ChatResponse(
        role="assistant",
        content=content,
        conversation_id=conversation_id,
        provider=error.provider,
        model=error.model,
        error=error.message,
        search_usage={},
        reasoning_content=None,
    )


def serialize_sources(sources) -> list[dict]:
    return [
        source.__dict__ if hasattr(source, "__dict__") else dict(source)
        for source in (sources or [])
    ]


def build_chat_message_metadata(
    *,
    provider: str,
    model: str,
    status: str = "completed",
    error: Optional[str] = None,
    sources: Optional[list[dict]] = None,
    search_queries: Optional[list[str]] = None,
    search_actions: Optional[list[dict]] = None,
    search_usage: Optional[dict] = None,
    reasoning_content: Optional[str] = None,
) -> dict:
    metadata = {
        "type": "chat_response",
        "provider": provider,
        "model": model,
        "status": status,
        "sources": sources or [],
        "search_queries": search_queries or [],
        "search_actions": search_actions or [],
        "search_usage": search_usage or {},
    }
    if error:
        metadata["error"] = error
    if reasoning_content:
        metadata["reasoning_content"] = reasoning_content
    return metadata


def llm_response_metadata(llm_response, status: str = "completed", error: Optional[str] = None) -> dict:
    return build_chat_message_metadata(
        provider=llm_response.provider,
        model=llm_response.model,
        status=status,
        error=error,
        sources=serialize_sources(llm_response.sources),
        search_queries=llm_response.search_queries,
        search_actions=llm_response.search_actions,
        search_usage=llm_response.search_usage,
        reasoning_content=llm_response.reasoning_content,
    )


def stage_summary_text(phase: int, platform: str, payload) -> str:
    label = platform_label(platform)
    if phase == 2:
        if getattr(payload, "status", "") == "failed":
            return f"{label}阶段二排行榜问题池生成失败：{getattr(payload, 'error_message', None) or '请检查配置后重试。'}"
        return f"已完成{label}阶段二：排行榜问题池已保存。下一步可以发现高权重信源。"
    if phase == 3:
        discovery = getattr(payload, "discovery", {}) or {}
        if discovery.get("status") == "failed":
            return f"{label}阶段三信源发现失败：{discovery.get('summary') or '请补充问题池或重试。'}"
        return f"已完成{label}阶段三：高权重信源发现结果已保存。下一步可以生成咨询类和测评类支撑内容。"
    if phase == 4:
        if getattr(payload, "status", "") != "completed":
            return f"{label}阶段四支撑内容部分生成失败：{getattr(payload, 'error_message', None) or '请查看失败项并重试。'}"
        return f"已完成{label}阶段四：咨询类和测评类支撑草稿已生成，请确认两篇草稿后再进入阶段五。"
    return f"{label}阶段结果已保存。"


async def stream_summary(summary: str, chunk_size: int = 8):
    for start in range(0, len(summary), chunk_size):
        yield ndjson_event({
            "type": "summary_delta",
            "text": summary[start:start + chunk_size],
        })
        await asyncio.sleep(0.018)


def make_chat_payload(
    conversation_id: str,
    payload: ChatRequest,
    knowledge_context: str = "",
    skill_prompt: str = "",
) -> ChatRequestPayload:
    search_context = None
    if payload.search_context:
        search_context = SearchContext(
            country=payload.search_context.country,
            region=payload.search_context.region,
            city=payload.search_context.city,
        )

    return ChatRequestPayload(
        system_prompt=DEFAULT_SYSTEM_PROMPT,
        user_message=payload.message,
        conversation_id=conversation_id,
        options=ProviderOptions(
            deep_thinking=payload.deep_thinking,
            web_search=payload.web_search,
        ),
        search_context=search_context,
        knowledge_context=knowledge_context or None,
        skill_prompt=skill_prompt or None,
    )


def is_knowledge_capture_message(message: str) -> bool:
    triggers = [
        "新建企业知识库",
        "创建企业知识库",
        "新增企业知识库",
        "补充企业资料",
        "补充资料",
        "编辑企业知识库",
        "更新企业知识库",
        "修改企业知识库",
        "录入企业信息",
        "建立企业知识库",
        "建立知识库",
        "创建知识库",
        "新建知识库",
        "写入知识库",
        "加入知识库",
        "保存到知识库",
    ]
    return any(trigger in message for trigger in triggers)


def extract_knowledge_content(message: str) -> str:
    separators = ["：", ":", "\n"]
    for separator in separators:
        if separator in message:
            candidate = message.split(separator, 1)[1].strip()
            if candidate:
                return candidate
    return message.strip()


def find_knowledge_context_rows(data_dir: Path, message: str, project_id: Optional[str], limit: int = 6):
    rows = search_knowledge_entries(data_dir, message, project_id, limit=limit)
    if rows or not project_id:
        return rows
    return list_knowledge_entries(data_dir, project_id, limit=limit)


def row_to_conversation(row) -> ConversationSummary:
    return ConversationSummary(
        id=row["id"],
        project_id=row["project_id"],
        title=row["title"],
        message_count=int(row["message_count"] if "message_count" in row.keys() else 0),
        last_message=row["last_message"] if "last_message" in row.keys() else None,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def row_to_message(row) -> ConversationMessage:
    return ConversationMessage(
        id=row["id"],
        conversation_id=row["conversation_id"],
        role=row["role"],
        content=row["content"],
        metadata=parse_metadata(row["metadata"] if "metadata" in row.keys() else "{}"),
        created_at=row["created_at"],
    )


def parse_metadata(raw: str) -> dict:
    try:
        value = json.loads(raw or "{}")
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def platform_label(platform: str) -> str:
    return "豆包" if platform == "doubao" else "DeepSeek"


def build_phase_two_prompt_content(project: GeoProject, platform: str) -> str:
    label = platform_label(platform)
    keywords = "、".join(project.initial_keywords[:8]) or "暂无初始关键词"
    return (
        f"「{project.company_name}」的企业知识库已完成阶段一准备，可以进入{label}平台的阶段二：排行榜问题池构建。\n\n"
        f"初始关键词：{keywords}\n\n"
        "阶段二会基于企业知识库和初始关键词，生成用户真实提问、筛选高优先级排行榜问题，"
        "并为下一步高权重信源发现提供查询线索。本轮不会生成或发布文章。"
    )


def build_phase_two_prompt_metadata(
    project: GeoProject,
    platform: str,
    confirmation_state: str = "approval-requested",
    confirmation_approved: Optional[bool] = None,
    report_id: Optional[str] = None,
    report: Optional[GeoReport] = None,
    status: Optional[str] = None,
) -> dict:
    metadata = {
        "type": "geo_phase_prompt",
        "geo_project_id": project.id,
        "enterprise_project_id": project.project_id,
        "platform": platform,
        "phase": 2,
        "flow": "ranking_question_pool",
        "project": project.model_dump(mode="json"),
        "confirmation_state": confirmation_state,
    }
    if confirmation_approved is not None:
        metadata["confirmation_approved"] = confirmation_approved
    if report_id:
        metadata["report_id"] = report_id
    if report:
        metadata["report"] = report.model_dump(mode="json")
    if status:
        metadata["status"] = status
    return metadata


def build_geo_phase_result_metadata(
    project: GeoProject,
    platform: str,
    phase: int,
    *,
    source_discovery: Optional[GeoSourceDiscovery] = None,
    support_articles: Optional[GeoSupportArticleRunResponse] = None,
    status: str = "completed",
    confirmation_state: str = "output-available",
    confirmation_approved: Optional[bool] = None,
    parent_message_id: Optional[str] = None,
) -> dict:
    metadata = {
        "type": "geo_phase_result",
        "geo_project_id": project.id,
        "enterprise_project_id": project.project_id,
        "platform": platform,
        "phase": phase,
        "project": project.model_dump(mode="json"),
        "status": status,
        "confirmation_state": confirmation_state,
    }
    if parent_message_id:
        metadata["parent_message_id"] = parent_message_id
    if confirmation_approved is not None:
        metadata["confirmation_approved"] = confirmation_approved
    if source_discovery:
        metadata["source_discovery"] = source_discovery.model_dump(mode="json")
    if support_articles:
        metadata["support_articles"] = support_articles.model_dump(mode="json")
    return metadata


def merge_article_draft_into_support_metadata(metadata: dict, draft: GeoArticleDraft) -> dict:
    next_metadata = dict(metadata or {})
    support_articles = dict(next_metadata.get("support_articles") or {})
    key = "review_draft" if draft.article_type == "review" else "consulting_draft"
    support_articles[key] = draft.model_dump(mode="json")
    next_metadata["support_articles"] = support_articles
    next_metadata["status"] = "completed"
    next_metadata["confirmation_state"] = "output-available"
    return next_metadata


def update_phase_result_message(data_dir: Path, message_id: Optional[str], content: str, metadata: dict) -> None:
    if message_id:
        update_message(data_dir, message_id, content, metadata)


def ensure_phase_result_message(
    data_dir: Path,
    project: GeoProject,
    platform: str,
    phase: int,
    payload,
    initial_content: str,
) -> tuple[Optional[str], Optional[ConversationMessage]]:
    if payload and payload.message_id:
        return payload.message_id, None
    conversation_id = getattr(payload, "conversation_id", None) if payload else None
    if not conversation_id:
        return None, None
    resolved_conversation_id = create_conversation(data_dir, conversation_id, project.project_id)
    parent_message_id = getattr(payload, "parent_message_id", None) if payload else None
    metadata = build_geo_phase_result_metadata(
        project,
        platform,
        phase,
        status="running",
        confirmation_state="approval-responded",
        parent_message_id=parent_message_id,
    )
    message_id = add_message(data_dir, resolved_conversation_id, "assistant", initial_content, metadata)
    return message_id, get_message_response(data_dir, resolved_conversation_id, message_id)


def get_message_response(data_dir: Path, conversation_id: str, message_id: str) -> ConversationMessage:
    for row in list_conversation_messages(data_dir, conversation_id):
        if row["id"] == message_id:
            return row_to_message(row)
    raise KeyError(message_id)


def stage_status_event(index: int, label: str, message: Optional[str] = None) -> dict:
    return {
        "type": "status",
        "step_index": index,
        "step_label": label,
        "message": message or label,
    }


def ndjson_event(event: dict) -> str:
    return json.dumps(event, ensure_ascii=False) + "\n"


async def stream_doubao_events(llm_gateway: LLMGateway, payload: ChatRequestPayload):
    config = llm_gateway.configs.get("doubao")
    if config is None or not config.configured:
        fallback = llm_gateway.local_fallback("doubao")
        yield {
            "type": "delta",
            "text": fallback.content,
        }
        yield {
            "type": "done",
            "provider": fallback.provider,
            "model": fallback.model,
            "content": fallback.content,
            "sources": [],
            "search_queries": [],
            "search_actions": [],
            "search_usage": {},
            "reasoning_content": None,
        }
        return

    queue: asyncio.Queue = asyncio.Queue()

    def run_stream() -> None:
        try:
            for event in llm_gateway.stream_doubao(config, payload):
                queue.put_nowait(event)
        except Exception as error:  # Propagate provider errors back into async generator.
            queue.put_nowait(error)
        finally:
            queue.put_nowait(None)

    asyncio.create_task(asyncio.to_thread(run_stream))

    while True:
        item = await queue.get()
        if item is None:
            break
        if isinstance(item, ProviderRequestError):
            raise item
        if isinstance(item, Exception):
            raise item
        yield item


def create_app(token: str, data_dir: Path, project_root: Optional[Path] = None) -> FastAPI:
    load_environment(project_root)
    initialize_database(data_dir)
    app = FastAPI(title="GEO-Agent Local Backend")
    auth = Depends(require_token(token))
    llm_gateway = LLMGateway()
    rag_service = RAGService(data_dir, llm_gateway=llm_gateway)
    resolved_project_root = project_root or Path.cwd()
    draft_service = KnowledgeDraftService(data_dir, llm_gateway, rag_service, resolved_project_root)

    def build_rag_context(message: str, project_id: Optional[str]) -> str:
        context = rag_service.retrieval_context(project_id, message, limit=6)
        if context:
            return context
        knowledge_rows = find_knowledge_context_rows(data_dir, message, project_id, limit=6)
        return build_knowledge_context(knowledge_rows)

    def resolve_skill_prompt(skill_id: Optional[str]) -> str:
        if not skill_id:
            return ""
        skill = get_skill(resolved_project_root, skill_id)
        if not skill:
            return ""
        return (
            f"技能名称：{skill.get('name') or skill_id}\n"
            f"技能说明：{skill.get('description') or ''}\n\n"
            f"{skill.get('content') or ''}"
        ).strip()

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse()

    @app.get("/api/config/status", response_model=ConfigStatusResponse, dependencies=[auth])
    def config_status() -> ConfigStatusResponse:
        return ConfigStatusResponse(providers=provider_status(llm_gateway.configs))

    @app.get("/api/conversations", response_model=ConversationsResponse, dependencies=[auth])
    def conversations(project_id: Optional[str] = None, limit: int = 30) -> ConversationsResponse:
        return ConversationsResponse(
            conversations=[
                row_to_conversation(row)
                for row in list_conversations(data_dir, project_id=project_id, limit=limit)
            ]
        )

    @app.get("/api/conversations/{conversation_id}", response_model=ConversationDetailResponse, dependencies=[auth])
    def conversation_detail(conversation_id: str) -> ConversationDetailResponse:
        row = get_conversation(data_dir, conversation_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        messages = list_conversation_messages(data_dir, conversation_id)
        summary_row = get_conversation_summary(data_dir, conversation_id)
        conversation = row_to_conversation(summary_row) if summary_row else ConversationSummary(
            id=row["id"],
            project_id=row["project_id"],
            title=row["title"],
            message_count=len(messages),
            last_message=messages[-1]["content"] if messages else None,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        return ConversationDetailResponse(
            conversation=conversation,
            messages=[row_to_message(message) for message in messages],
        )

    @app.delete("/api/conversations/{conversation_id}", dependencies=[auth])
    def remove_conversation(conversation_id: str) -> dict:
        if not delete_conversation(data_dir, conversation_id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"ok": True}

    @app.post("/api/conversations/clear", dependencies=[auth])
    def clear_conversations() -> dict:
        backup_path = clear_conversation_history(data_dir)
        return {
            "ok": True,
            "backup_path": str(backup_path),
        }

    @app.post("/api/conversations/cleanup-stale-phase-two-prompts", dependencies=[auth])
    def cleanup_stale_phase_two_prompt_only_conversations() -> dict:
        result = cleanup_stale_phase_two_prompt_conversations(data_dir)
        return {
            "ok": True,
            **result,
        }

    @app.post("/api/chat", response_model=ChatResponse, dependencies=[auth])
    def chat(payload: ChatRequest) -> ChatResponse:
        conversation_id = create_conversation(data_dir, payload.conversation_id, payload.project_id)
        add_message(data_dir, conversation_id, "user", payload.message)
        if is_knowledge_capture_message(payload.message):
            knowledge_content = extract_knowledge_content(payload.message)
            entry_id = add_knowledge_entry(
                data_dir,
                content=knowledge_content,
                project_id=payload.project_id,
                source_type="chat",
                metadata=json.dumps({"conversation_id": conversation_id}, ensure_ascii=False),
            )
            rag_service.index_entries(payload.project_id, [entry_id])
            total = count_knowledge_entries(data_dir, payload.project_id)
            content = f"已写入本地知识库：{knowledge_content}\n\n当前知识库共有 {total} 条资料。"
            add_message(
                data_dir,
                conversation_id,
                "assistant",
                content,
                build_chat_message_metadata(
                    provider="local",
                    model="knowledge-capture",
                    reasoning_content=f"识别到知识库录入意图，已创建知识条目 {entry_id}。",
                ),
            )
            return ChatResponse(
                role="assistant",
                content=content,
                conversation_id=conversation_id,
                provider="local",
                model="knowledge-capture",
                reasoning_content=f"识别到知识库录入意图，已创建知识条目 {entry_id}。",
            )
        provider_key = select_provider(payload.selected_model)
        knowledge_context = build_rag_context(payload.message, payload.project_id)
        skill_prompt = resolve_skill_prompt(payload.skill_id)
        try:
            llm_response = llm_gateway.complete(
                provider_key,
                make_chat_payload(conversation_id, payload, knowledge_context, skill_prompt),
            )
        except ProviderRequestError as error:
            return build_provider_error_response(data_dir, conversation_id, error)

        add_message(
            data_dir,
            conversation_id,
            "assistant",
            llm_response.content,
            llm_response_metadata(llm_response),
        )
        return ChatResponse(
            role="assistant",
            content=llm_response.content,
            conversation_id=conversation_id,
            provider=llm_response.provider,
            model=llm_response.model,
            sources=llm_response.sources,
            search_queries=llm_response.search_queries,
            search_actions=llm_response.search_actions,
            search_usage=llm_response.search_usage,
            reasoning_content=llm_response.reasoning_content,
        )

    @app.post("/api/chat/stream", dependencies=[auth])
    async def chat_stream(payload: ChatRequest) -> StreamingResponse:
        async def events():
            conversation_id = create_conversation(data_dir, payload.conversation_id, payload.project_id)
            add_message(data_dir, conversation_id, "user", payload.message)
            if is_knowledge_capture_message(payload.message):
                knowledge_content = extract_knowledge_content(payload.message)
                entry_id = add_knowledge_entry(
                    data_dir,
                    content=knowledge_content,
                    project_id=payload.project_id,
                    source_type="chat",
                    metadata=json.dumps({"conversation_id": conversation_id}, ensure_ascii=False),
                )
                rag_service.index_entries(payload.project_id, [entry_id])
                total = count_knowledge_entries(data_dir, payload.project_id)
                content = f"已写入本地知识库：{knowledge_content}\n\n当前知识库共有 {total} 条资料。"
                add_message(
                    data_dir,
                    conversation_id,
                    "assistant",
                    content,
                    build_chat_message_metadata(
                        provider="local",
                        model="knowledge-capture",
                        reasoning_content=f"识别到知识库录入意图，已创建知识条目 {entry_id}。",
                    ),
                )
                yield ndjson_event({
                    "type": "meta",
                    "conversation_id": conversation_id,
                    "provider_key": "local",
                })
                yield ndjson_event({
                    "type": "delta",
                    "text": content,
                })
                yield ndjson_event({
                    "type": "done",
                    "conversation_id": conversation_id,
                    "provider": "local",
                    "model": "knowledge-capture",
                    "content": content,
                    "sources": [],
                    "search_queries": [],
                    "search_actions": [],
                    "search_usage": {},
                    "reasoning_content": f"识别到知识库录入意图，已创建知识条目 {entry_id}。",
                })
                return
            provider_key = select_provider(payload.selected_model)
            knowledge_context = build_rag_context(payload.message, payload.project_id)
            skill_prompt = resolve_skill_prompt(payload.skill_id)
            chat_payload = make_chat_payload(
                conversation_id,
                payload,
                knowledge_context,
                skill_prompt,
            )

            yield ndjson_event({
                "type": "meta",
                "conversation_id": conversation_id,
                "provider_key": provider_key,
            })

            if provider_key == "doubao":
                try:
                    final_content = ""
                    final_event = {}
                    async for event in stream_doubao_events(llm_gateway, chat_payload):
                        event_with_conversation = {
                            **event,
                            "conversation_id": conversation_id,
                        }
                        if event.get("type") == "done":
                            final_content = str(event.get("content") or "")
                            final_event = event
                        yield ndjson_event(event_with_conversation)
                    if final_content:
                        add_message(
                            data_dir,
                            conversation_id,
                            "assistant",
                            final_content,
                            build_chat_message_metadata(
                                provider=str(final_event.get("provider") or "doubao"),
                                model=str(final_event.get("model") or ""),
                                sources=final_event.get("sources") or [],
                                search_queries=final_event.get("search_queries") or [],
                                search_actions=final_event.get("search_actions") or [],
                                search_usage=final_event.get("search_usage") or {},
                                reasoning_content=final_event.get("reasoning_content"),
                            ),
                        )
                except ProviderRequestError as error:
                    response = build_provider_error_response(data_dir, conversation_id, error)
                    yield ndjson_event({
                        "type": "delta",
                        "text": response.content,
                    })
                    yield ndjson_event({
                        "type": "done",
                        "conversation_id": conversation_id,
                        "provider": response.provider,
                        "model": response.model,
                        "content": response.content,
                        "error": response.error,
                        "sources": [],
                        "search_queries": [],
                        "search_actions": [],
                        "search_usage": {},
                        "reasoning_content": None,
                    })
                return

            task = asyncio.create_task(
                asyncio.to_thread(
                    llm_gateway.complete,
                    provider_key,
                    chat_payload,
                )
            )
            status_messages = [
                "正在理解 GEO 任务",
                "正在组织知识路径",
                "正在等待模型响应",
            ]
            status_index = 0
            while not task.done():
                yield ndjson_event({
                    "type": "status",
                    "message": status_messages[status_index % len(status_messages)],
                })
                status_index += 1
                await asyncio.sleep(0.9)

            try:
                llm_response = task.result()
                content = llm_response.content
                add_message(
                    data_dir,
                    conversation_id,
                    "assistant",
                    content,
                    llm_response_metadata(llm_response),
                )
                chunk_size = 8
                for start in range(0, len(content), chunk_size):
                    yield ndjson_event({
                        "type": "delta",
                        "text": content[start:start + chunk_size],
                    })
                    await asyncio.sleep(0.018)
                yield ndjson_event({
                    "type": "done",
                    "conversation_id": conversation_id,
                    "provider": llm_response.provider,
                    "model": llm_response.model,
                    "content": content,
                    "sources": [source.__dict__ for source in llm_response.sources],
                    "search_queries": llm_response.search_queries,
                    "search_actions": llm_response.search_actions,
                    "search_usage": llm_response.search_usage,
                    "reasoning_content": llm_response.reasoning_content,
                })
            except ProviderRequestError as error:
                response = build_provider_error_response(data_dir, conversation_id, error)
                yield ndjson_event({
                    "type": "delta",
                    "text": response.content,
                })
                yield ndjson_event({
                    "type": "done",
                    "conversation_id": conversation_id,
                    "provider": response.provider,
                    "model": response.model,
                    "content": response.content,
                    "error": response.error,
                    "sources": [],
                    "search_queries": [],
                    "search_actions": [],
                    "search_usage": {},
                    "reasoning_content": None,
                })

        return StreamingResponse(events(), media_type="application/x-ndjson")

    @app.get("/api/projects", response_model=ProjectsResponse, dependencies=[auth])
    def projects() -> ProjectsResponse:
        return ProjectsResponse(projects=[dict(row) for row in list_projects(data_dir)])

    @app.get("/api/geo/projects", response_model=GeoProjectsResponse, dependencies=[auth])
    def geo_projects(enterprise_project_id: Optional[str] = None) -> GeoProjectsResponse:
        return list_enterprise_geo_projects(data_dir, enterprise_project_id)

    @app.get("/api/geo/projects/{geo_project_id}", response_model=GeoProject, dependencies=[auth])
    def geo_project_detail(geo_project_id: str) -> GeoProject:
        try:
            return get_geo_project_detail(data_dir, geo_project_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project not found") from error

    @app.get("/api/geo/projects/{geo_project_id}/workflow-state", response_model=GeoWorkflowState, dependencies=[auth])
    def geo_project_workflow_state(geo_project_id: str) -> GeoWorkflowState:
        try:
            return get_geo_workflow_state(data_dir, geo_project_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project not found") from error

    @app.post("/api/geo/projects/ensure", response_model=GeoProject, dependencies=[auth])
    def ensure_geo_project_api(payload: GeoProjectEnsureRequest) -> GeoProject:
        try:
            return ensure_geo_project(data_dir, rag_service, payload)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Enterprise profile not found") from error

    @app.post("/api/geo/projects/{geo_project_id}/phase-2/confirm", response_model=GeoProject, dependencies=[auth])
    def confirm_geo_phase_two(geo_project_id: str) -> GeoProject:
        try:
            return confirm_phase_two(data_dir, geo_project_id, "doubao")
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/phase-2/prompt", response_model=GeoPhaseTwoPromptResponse, dependencies=[auth])
    def create_geo_platform_phase_two_prompt(
        geo_project_id: str,
        platform: str,
        payload: GeoPhaseTwoPromptRequest,
    ) -> GeoPhaseTwoPromptResponse:
        try:
            project = get_geo_project_detail(data_dir, geo_project_id)
            normalized_platform = platform if platform in {"doubao", "deepseek"} else ""
            if not normalized_platform:
                raise ValueError("Unsupported platform")
            if not project.knowledge_base_ready or project.current_phase != "ready_for_check":
                raise ValueError("Knowledge base is not ready for phase two")
            conversation_id = create_conversation(data_dir, payload.conversation_id, project.project_id)
            existing_message = find_pending_phase_two_prompt_message(data_dir, conversation_id, project.id, normalized_platform)
            if existing_message:
                return GeoPhaseTwoPromptResponse(
                    conversation_id=conversation_id,
                    message=row_to_message(existing_message),
                )
            message_id = add_message(
                data_dir,
                conversation_id,
                "assistant",
                build_phase_two_prompt_content(project, normalized_platform),
                build_phase_two_prompt_metadata(project, normalized_platform),
            )
            return GeoPhaseTwoPromptResponse(
                conversation_id=conversation_id,
                message=get_message_response(data_dir, conversation_id, message_id),
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/phase-2/confirm", response_model=GeoProject, dependencies=[auth])
    def confirm_geo_platform_phase_two(
        geo_project_id: str,
        platform: str,
        payload: Optional[GeoPhaseTwoActionRequest] = None,
    ) -> GeoProject:
        try:
            project = confirm_phase_two(data_dir, geo_project_id, platform)
            if payload and payload.message_id:
                update_message(
                    data_dir,
                    payload.message_id,
                    f"正在生成{platform_label(platform)}阶段二排行榜问题池：{project.company_name}\n\n我会读取企业知识库、提取初始关键词、生成用户真实问题，并筛选高优先级排行榜问题。",
                    build_phase_two_prompt_metadata(project, platform, "approval-responded", True, status="running"),
                )
            return project
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/projects/{geo_project_id}/phase-2/cancel", response_model=GeoProject, dependencies=[auth])
    def cancel_geo_phase_two(geo_project_id: str) -> GeoProject:
        try:
            return cancel_phase_two(data_dir, geo_project_id, "doubao")
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/phase-2/cancel", response_model=GeoProject, dependencies=[auth])
    def cancel_geo_platform_phase_two(
        geo_project_id: str,
        platform: str,
        payload: Optional[GeoPhaseTwoActionRequest] = None,
    ) -> GeoProject:
        try:
            project = cancel_phase_two(data_dir, geo_project_id, platform)
            if payload and payload.message_id:
                update_message(
                    data_dir,
                    payload.message_id,
                    f"已暂缓进入{platform_label(platform)}阶段二。{project.company_name} 的企业知识库仍保持阶段一可用状态，稍后可以重新启动排行榜问题池构建。",
                    build_phase_two_prompt_metadata(project, platform, "output-available", False, status="cancelled"),
                )
            return project
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/phase-2/run", response_model=GeoReport, dependencies=[auth])
    def run_geo_phase_two_report(
        geo_project_id: str,
        platform: str,
        payload: Optional[GeoPhaseTwoActionRequest] = None,
    ) -> GeoReport:
        try:
            report = run_phase_two_report(data_dir, resolved_project_root, llm_gateway, geo_project_id, platform)
            if payload and payload.message_id:
                project = get_geo_project_detail(data_dir, geo_project_id)
                if report.status == "failed":
                    content = f"{platform_label(platform)} 排行榜问题池生成失败：{report.error_message or '未知错误'}"
                    status_value = "failed"
                    confirmation_state = "approval-requested"
                    approved = None
                else:
                    content = f"已完成{platform_label(platform)}阶段二：{project.company_name}\n\n已生成用户问题池和高优先级排行榜问题。下一步是发现高权重信源。"
                    status_value = "completed"
                    confirmation_state = "output-available"
                    approved = True
                update_message(
                    data_dir,
                    payload.message_id,
                    content,
                    build_phase_two_prompt_metadata(
                        project,
                        platform,
                        confirmation_state,
                        approved,
                        report_id=report.id,
                        report=report,
                        status=status_value,
                    ),
                )
            return report
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project or enterprise profile not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/phase-2/run/stream", dependencies=[auth])
    async def run_geo_phase_two_report_stream(
        geo_project_id: str,
        platform: str,
        payload: Optional[GeoPhaseTwoActionRequest] = None,
    ) -> StreamingResponse:
        async def events():
            steps = [
                "读取企业知识库",
                "提取初始关键词",
                "生成用户真实问题池",
                "筛选高优先级排行榜问题",
                "保存平台问题池结果",
            ]
            yield ndjson_event(stage_status_event(0, steps[0], "正在读取企业事实知识库。"))
            task = asyncio.create_task(asyncio.to_thread(
                run_phase_two_report,
                data_dir,
                resolved_project_root,
                llm_gateway,
                geo_project_id,
                platform,
            ))
            index = 1
            while not task.done():
                yield ndjson_event(stage_status_event(min(index, len(steps) - 1), steps[min(index, len(steps) - 1)]))
                index += 1
                await asyncio.sleep(0.8)
            try:
                report = task.result()
                project = get_geo_project_detail(data_dir, geo_project_id)
                if payload and payload.message_id:
                    if report.status == "failed":
                        content = f"{platform_label(platform)} 排行榜问题池生成失败：{report.error_message or '未知错误'}"
                        status_value = "failed"
                        confirmation_state = "approval-requested"
                        approved = None
                    else:
                        content = f"已完成{platform_label(platform)}阶段二：{project.company_name}\n\n已生成用户问题池和高优先级排行榜问题。下一步是发现高权重信源。"
                        status_value = "completed"
                        confirmation_state = "output-available"
                        approved = True
                    update_message(
                        data_dir,
                        payload.message_id,
                        content,
                        build_phase_two_prompt_metadata(
                            project,
                            platform,
                            confirmation_state,
                            approved,
                            report_id=report.id,
                            report=report,
                            status=status_value,
                        ),
                    )
                yield ndjson_event(stage_status_event(len(steps) - 1, steps[-1], "阶段二结果已保存。"))
                async for item in stream_summary(stage_summary_text(2, platform, report)):
                    yield item
                yield ndjson_event({"type": "result", "report": report.model_dump(mode="json")})
                yield ndjson_event({
                    "type": "done",
                    "status": report.status,
                    "content": stage_summary_text(2, platform, report),
                })
            except (KeyError, ValueError, ProviderRequestError) as error:
                yield ndjson_event({"type": "error", "error": str(error)})

        return StreamingResponse(events(), media_type="application/x-ndjson")

    @app.get("/api/geo/projects/{geo_project_id}/platforms/{platform}/reports/latest", response_model=GeoReport, dependencies=[auth])
    def latest_geo_platform_report(geo_project_id: str, platform: str) -> GeoReport:
        try:
            return get_latest_platform_report(data_dir, geo_project_id, platform)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO report not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/api/geo/reports/{report_id}", response_model=GeoReport, dependencies=[auth])
    def geo_report_detail(report_id: str) -> GeoReport:
        try:
            return get_report_detail(data_dir, report_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO report not found") from error

    @app.get("/api/geo/projects/{geo_project_id}/platforms/{platform}/question-sets/latest", response_model=GeoQuestionSet, dependencies=[auth])
    def latest_geo_platform_question_set(geo_project_id: str, platform: str) -> GeoQuestionSet:
        try:
            return get_latest_platform_question_set(data_dir, geo_project_id, platform)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO question set not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/api/geo/question-sets/{question_set_id}", response_model=GeoQuestionSet, dependencies=[auth])
    def geo_question_set_detail(question_set_id: str) -> GeoQuestionSet:
        try:
            return get_question_set_detail(data_dir, question_set_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO question set not found") from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/source-discovery/run", response_model=GeoSourceDiscovery, dependencies=[auth])
    def run_geo_source_discovery(
        geo_project_id: str,
        platform: str,
        payload: Optional[GeoSourceDiscoveryRunRequest] = None,
    ) -> GeoSourceDiscovery:
        try:
            project = get_geo_project_detail(data_dir, geo_project_id)
            message_id, _ = ensure_phase_result_message(
                data_dir,
                project,
                platform,
                3,
                payload,
                f"正在发现{platform_label(platform)}高权重信源。",
            )
            discovery = run_source_discovery(
                data_dir,
                resolved_project_root,
                llm_gateway,
                geo_project_id,
                platform,
                fallback_report=payload.fallback_report if payload else None,
            )
            content = (
                f"已完成{platform_label(platform)}阶段三：高权重信源发现。"
                if discovery.discovery.get("status") != "failed"
                else f"{platform_label(platform)}阶段三信源发现失败：{discovery.discovery.get('summary') or '请重试。'}"
            )
            update_phase_result_message(
                data_dir,
                message_id,
                content,
                build_geo_phase_result_metadata(
                    project,
                    platform,
                    3,
                    source_discovery=discovery,
                    status="failed" if discovery.discovery.get("status") == "failed" else "completed",
                    parent_message_id=getattr(payload, "parent_message_id", None) if payload else None,
                ),
            )
            return discovery
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project or enterprise profile not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/source-discovery/run/stream", dependencies=[auth])
    async def run_geo_source_discovery_stream(
        geo_project_id: str,
        platform: str,
        payload: Optional[GeoSourceDiscoveryRunRequest] = None,
    ) -> StreamingResponse:
        async def events():
            steps = [
                "读取排行榜问题池",
                "询问目标 AI 推荐信源",
                "观察真实问题引用线索",
                "清洗可核验引用证据",
                "保存平台信源结果",
            ]
            try:
                project = get_geo_project_detail(data_dir, geo_project_id)
                message_id, created_message = ensure_phase_result_message(
                    data_dir,
                    project,
                    platform,
                    3,
                    payload,
                    f"正在发现{platform_label(platform)}高权重信源。",
                )
                if created_message:
                    yield ndjson_event({
                        "type": "meta",
                        "phase": 3,
                        "platform": platform,
                        "conversation_id": created_message.conversation_id,
                        "message": created_message.model_dump(mode="json"),
                    })
            except (KeyError, ValueError) as error:
                yield ndjson_event({"type": "error", "error": str(error)})
                return
            yield ndjson_event(stage_status_event(0, steps[0], "正在读取阶段二排行榜问题池。"))
            task = asyncio.create_task(asyncio.to_thread(
                run_source_discovery,
                data_dir,
                resolved_project_root,
                llm_gateway,
                geo_project_id,
                platform,
                payload.fallback_report if payload else None,
            ))
            index = 1
            while not task.done():
                yield ndjson_event(stage_status_event(min(index, len(steps) - 1), steps[min(index, len(steps) - 1)]))
                index += 1
                await asyncio.sleep(0.8)
            try:
                discovery = task.result()
                content = (
                    f"已完成{platform_label(platform)}阶段三：高权重信源发现。"
                    if discovery.discovery.get("status") != "failed"
                    else f"{platform_label(platform)}阶段三信源发现失败：{discovery.discovery.get('summary') or '请重试。'}"
                )
                update_phase_result_message(
                    data_dir,
                    message_id,
                    content,
                    build_geo_phase_result_metadata(
                        project,
                        platform,
                        3,
                        source_discovery=discovery,
                        status="failed" if discovery.discovery.get("status") == "failed" else "completed",
                        parent_message_id=getattr(payload, "parent_message_id", None) if payload else None,
                    ),
                )
                yield ndjson_event(stage_status_event(len(steps) - 1, steps[-1], "阶段三结果已保存。"))
                async for item in stream_summary(stage_summary_text(3, platform, discovery)):
                    yield item
                yield ndjson_event({"type": "result", "source_discovery": discovery.model_dump(mode="json")})
                yield ndjson_event({
                    "type": "done",
                    "status": discovery.discovery.get("status") or "completed",
                    "content": stage_summary_text(3, platform, discovery),
                })
            except (KeyError, ValueError, ProviderRequestError) as error:
                yield ndjson_event({"type": "error", "error": str(error)})

        return StreamingResponse(events(), media_type="application/x-ndjson")

    @app.get("/api/geo/projects/{geo_project_id}/platforms/{platform}/source-discoveries/latest", response_model=GeoSourceDiscovery, dependencies=[auth])
    def latest_geo_platform_source_discovery(geo_project_id: str, platform: str) -> GeoSourceDiscovery:
        try:
            return get_latest_platform_source_discovery(data_dir, geo_project_id, platform)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO source discovery not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/api/geo/source-discoveries/{discovery_id}", response_model=GeoSourceDiscovery, dependencies=[auth])
    def geo_source_discovery_detail(discovery_id: str) -> GeoSourceDiscovery:
        try:
            return get_source_discovery_detail(data_dir, discovery_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO source discovery not found") from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/articles/support/run", response_model=GeoSupportArticleRunResponse, dependencies=[auth])
    def run_geo_support_articles(
        geo_project_id: str,
        platform: str,
        payload: Optional[GeoSupportArticleRunRequest] = None,
    ) -> GeoSupportArticleRunResponse:
        try:
            project = get_geo_project_detail(data_dir, geo_project_id)
            message_id, _ = ensure_phase_result_message(
                data_dir,
                project,
                platform,
                4,
                payload,
                f"正在生成{platform_label(platform)}阶段四支撑内容。",
            )
            result = run_support_articles(
                data_dir,
                resolved_project_root,
                llm_gateway,
                geo_project_id,
                platform,
            )
            content = (
                f"已完成{platform_label(platform)}阶段四支撑内容。\n\n"
                "咨询类和测评类草稿已生成。请先查看并确认两篇草稿，确认完成后阶段五才会开放。"
                if result.status == "completed"
                else f"阶段四支撑内容部分生成失败：{result.error_message or '请查看失败项并重试。'}"
            )
            update_phase_result_message(
                data_dir,
                message_id,
                content,
                build_geo_phase_result_metadata(
                    project,
                    platform,
                    4,
                    support_articles=result,
                    status=result.status,
                    confirmation_approved=True,
                    parent_message_id=getattr(payload, "parent_message_id", None) if payload else None,
                ),
            )
            return result
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project or enterprise profile not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/articles/support/run/stream", dependencies=[auth])
    async def run_geo_support_articles_stream(
        geo_project_id: str,
        platform: str,
        payload: Optional[GeoSupportArticleRunRequest] = None,
    ) -> StreamingResponse:
        async def events():
            steps = [
                "读取企业事实和信源结果",
                "生成咨询类支撑草稿",
                "生成测评类支撑草稿",
                "清洗阶段四越界内容",
                "保存阶段四草稿",
            ]
            try:
                project = get_geo_project_detail(data_dir, geo_project_id)
                message_id, created_message = ensure_phase_result_message(
                    data_dir,
                    project,
                    platform,
                    4,
                    payload,
                    f"正在生成{platform_label(platform)}阶段四支撑内容。",
                )
                if created_message:
                    yield ndjson_event({
                        "type": "meta",
                        "phase": 4,
                        "platform": platform,
                        "conversation_id": created_message.conversation_id,
                        "message": created_message.model_dump(mode="json"),
                    })
            except (KeyError, ValueError) as error:
                yield ndjson_event({"type": "error", "error": str(error)})
                return
            yield ndjson_event(stage_status_event(0, steps[0], "正在读取阶段一事实库和阶段三信源结果。"))
            task = asyncio.create_task(asyncio.to_thread(
                run_support_articles,
                data_dir,
                resolved_project_root,
                llm_gateway,
                geo_project_id,
                platform,
            ))
            index = 1
            while not task.done():
                yield ndjson_event(stage_status_event(min(index, len(steps) - 1), steps[min(index, len(steps) - 1)]))
                index += 1
                await asyncio.sleep(0.8)
            try:
                result = task.result()
                content = (
                    f"已完成{platform_label(platform)}阶段四支撑内容。\n\n"
                    "咨询类和测评类草稿已生成。请先查看并确认两篇草稿，确认完成后阶段五才会开放。"
                    if result.status == "completed"
                    else f"阶段四支撑内容部分生成失败：{result.error_message or '请查看失败项并重试。'}"
                )
                update_phase_result_message(
                    data_dir,
                    message_id,
                    content,
                    build_geo_phase_result_metadata(
                        project,
                        platform,
                        4,
                        support_articles=result,
                        status=result.status,
                        confirmation_approved=True,
                        parent_message_id=getattr(payload, "parent_message_id", None) if payload else None,
                    ),
                )
                yield ndjson_event(stage_status_event(len(steps) - 1, steps[-1], "阶段四草稿已保存。"))
                async for item in stream_summary(stage_summary_text(4, platform, result)):
                    yield item
                yield ndjson_event({"type": "result", "support_articles": result.model_dump(mode="json")})
                yield ndjson_event({
                    "type": "done",
                    "status": result.status,
                    "content": stage_summary_text(4, platform, result),
                })
            except (KeyError, ValueError, ProviderRequestError) as error:
                yield ndjson_event({"type": "error", "error": str(error)})

        return StreamingResponse(events(), media_type="application/x-ndjson")

    @app.post("/api/geo/projects/{geo_project_id}/platforms/{platform}/articles/{article_type}/run", response_model=GeoArticleDraft, dependencies=[auth])
    def run_geo_article_draft(
        geo_project_id: str,
        platform: str,
        article_type: str,
        payload: Optional[GeoArticleDraftRunRequest] = None,
    ) -> GeoArticleDraft:
        try:
            return run_article_draft(
                data_dir,
                resolved_project_root,
                llm_gateway,
                geo_project_id,
                platform,
                article_type,
                topic=payload.topic if payload else None,
                target_question=payload.target_question if payload else None,
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO project or enterprise profile not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/api/geo/projects/{geo_project_id}/platforms/{platform}/articles/latest", response_model=GeoArticleDraft, dependencies=[auth])
    def latest_geo_article_draft(
        geo_project_id: str,
        platform: str,
        article_type: str,
    ) -> GeoArticleDraft:
        try:
            return get_latest_platform_article_draft(data_dir, geo_project_id, platform, article_type)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO article draft not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/api/geo/articles/{article_id}", response_model=GeoArticleDraft, dependencies=[auth])
    def geo_article_draft_detail(article_id: str) -> GeoArticleDraft:
        try:
            return get_article_draft_detail(data_dir, article_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO article draft not found") from error

    @app.post("/api/geo/articles/{article_id}/confirm", response_model=GeoArticleDraft, dependencies=[auth])
    def confirm_geo_article_draft(article_id: str, payload: Optional[GeoArticleDraftActionRequest] = None) -> GeoArticleDraft:
        try:
            draft = confirm_article_draft(data_dir, article_id)
            if payload and payload.message_id:
                with create_connection(data_dir) as conn:
                    row = conn.execute(
                        "SELECT metadata FROM messages WHERE id = ?",
                        (payload.message_id,),
                    ).fetchone()
                metadata = parse_metadata(row["metadata"] if row else "{}")
                next_metadata = merge_article_draft_into_support_metadata(metadata, draft)
                support_articles = next_metadata.get("support_articles") or {}
                consulting = support_articles.get("consulting_draft") or {}
                review = support_articles.get("review_draft") or {}
                all_confirmed = consulting.get("status") == "confirmed" and review.get("status") == "confirmed"
                update_message(
                    data_dir,
                    payload.message_id,
                    (
                        "阶段四支撑内容已确认完成。\n\n咨询类和测评类草稿都已确认，阶段五排行榜文章模块开放后即可继续。"
                        if all_confirmed
                        else "草稿已确认。请继续确认另一篇支撑草稿，两个都确认后才能进入阶段五。"
                    ),
                    next_metadata,
                )
            return draft
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO article draft not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/geo/articles/{article_id}/update", response_model=GeoArticleDraft, dependencies=[auth])
    def update_geo_article_draft_api(article_id: str, payload: GeoArticleDraftUpdateRequest) -> GeoArticleDraft:
        try:
            draft = update_article_draft(data_dir, article_id, payload.draft)
            if payload.message_id:
                with create_connection(data_dir) as conn:
                    row = conn.execute(
                        "SELECT metadata FROM messages WHERE id = ?",
                        (payload.message_id,),
                    ).fetchone()
                metadata = parse_metadata(row["metadata"] if row else "{}")
                update_message(
                    data_dir,
                    payload.message_id,
                    "草稿已更新，请重新确认后再进入下一阶段。",
                    merge_article_draft_into_support_metadata(metadata, draft),
                )
            return draft
        except KeyError as error:
            raise HTTPException(status_code=404, detail="GEO article draft not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/knowledge/entries", response_model=KnowledgeEntriesResponse, dependencies=[auth])
    def create_knowledge_entry(payload: KnowledgeEntryCreateRequest) -> KnowledgeEntriesResponse:
        entry_id = add_knowledge_entry(
            data_dir,
            content=payload.content,
            title=payload.title,
            project_id=payload.project_id,
            source_type=payload.source_type,
        )
        rag_service.index_entries(payload.project_id, [entry_id])
        if payload.project_id:
            try:
                ensure_geo_project(data_dir, rag_service, GeoProjectEnsureRequest(project_id=payload.project_id))
            except KeyError:
                pass
        rows = list_knowledge_entries(data_dir, payload.project_id)
        return KnowledgeEntriesResponse(
            entries=[row_to_knowledge_entry(row) for row in rows],
            total=count_knowledge_entries(data_dir, payload.project_id),
        )

    @app.get("/api/knowledge/entries", response_model=KnowledgeEntriesResponse, dependencies=[auth])
    def knowledge_entries(project_id: Optional[str] = None, limit: int = 50) -> KnowledgeEntriesResponse:
        rows = list_knowledge_entries(data_dir, project_id, limit)
        return KnowledgeEntriesResponse(
            entries=[row_to_knowledge_entry(row) for row in rows],
            total=count_knowledge_entries(data_dir, project_id),
        )

    @app.post("/api/knowledge/search", response_model=KnowledgeEntriesResponse, dependencies=[auth])
    def knowledge_search(payload: KnowledgeEntrySearchRequest) -> KnowledgeEntriesResponse:
        rows = search_knowledge_entries(data_dir, payload.query, payload.project_id, payload.limit)
        return KnowledgeEntriesResponse(
            entries=[row_to_knowledge_entry(row) for row in rows],
            total=len(rows),
        )

    @app.post("/api/knowledge/enterprise-profile", response_model=KnowledgeEntriesResponse, dependencies=[auth])
    def enterprise_profile(payload: EnterpriseProfileRequest) -> KnowledgeEntriesResponse:
        response = save_enterprise_profile(data_dir, payload)
        project_id = payload.project_id
        if project_id:
            rag_service.index_project(project_id)
            ensure_geo_project(data_dir, rag_service, GeoProjectEnsureRequest(project_id=project_id))
        return response

    @app.get("/api/knowledge/profiles", response_model=EnterpriseProfilesResponse, dependencies=[auth])
    def enterprise_profiles() -> EnterpriseProfilesResponse:
        return list_profiles(data_dir)

    @app.get("/api/knowledge/profiles/{project_id}", response_model=EnterpriseProfileDetailResponse, dependencies=[auth])
    def enterprise_profile_detail(project_id: str) -> EnterpriseProfileDetailResponse:
        try:
            response = get_profile_detail(data_dir, project_id)
            response.index_status = rag_service.index_status(project_id)
            return response
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Knowledge profile not found") from error

    @app.put("/api/knowledge/profiles/{project_id}", response_model=KnowledgeEntriesResponse, dependencies=[auth])
    def update_enterprise_profile(project_id: str, payload: EnterpriseProfileRequest) -> KnowledgeEntriesResponse:
        payload.project_id = project_id
        response = save_enterprise_profile(data_dir, payload)
        rag_service.index_project(project_id)
        ensure_geo_project(data_dir, rag_service, GeoProjectEnsureRequest(project_id=project_id))
        return response

    @app.delete("/api/knowledge/profiles/{project_id}", dependencies=[auth])
    def remove_enterprise_profile(project_id: str) -> dict:
        delete_profile(data_dir, project_id)
        rag_service.delete_project_index(project_id)
        return {"ok": True}

    @app.post("/api/knowledge/assets", response_model=KnowledgeAssetResponse, dependencies=[auth])
    def create_knowledge_asset(payload: KnowledgeAssetCreateRequest) -> KnowledgeAssetResponse:
        try:
            return rag_service.save_asset(payload)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/knowledge/drafts", response_model=KnowledgeDraft, dependencies=[auth])
    def create_knowledge_draft(payload: KnowledgeDraftCreateRequest) -> KnowledgeDraft:
        try:
            return draft_service.create_draft(payload)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        except ProviderRequestError as error:
            raise HTTPException(status_code=502, detail=error.message) from error

    @app.post("/api/knowledge/drafts/{draft_id}/confirm", response_model=KnowledgeDraftConfirmResponse, dependencies=[auth])
    def confirm_knowledge_draft(draft_id: str, payload: KnowledgeDraftConfirmRequest) -> KnowledgeDraftConfirmResponse:
        try:
            response = draft_service.confirm_draft(draft_id, payload)
            ensure_geo_project(data_dir, rag_service, GeoProjectEnsureRequest(project_id=response.project_id))
            return response
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Knowledge draft not found") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/knowledge/drafts/{draft_id}/reject", dependencies=[auth])
    def reject_knowledge_draft(draft_id: str) -> dict:
        try:
            draft_service.reject_draft(draft_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Knowledge draft not found") from error
        return {"ok": True}

    @app.post("/api/knowledge/reindex/{project_id}", response_model=KnowledgeIndexStatusResponse, dependencies=[auth])
    def reindex_knowledge(project_id: str) -> KnowledgeIndexStatusResponse:
        return rag_service.index_project(project_id)

    @app.get("/api/knowledge/index-status", response_model=KnowledgeIndexStatusResponse, dependencies=[auth])
    def knowledge_index_status(project_id: Optional[str] = None) -> KnowledgeIndexStatusResponse:
        return rag_service.index_status(project_id)

    @app.get("/api/skills", dependencies=[auth])
    def skills() -> dict:
        return {"skills": list_skills(resolved_project_root)}

    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run GEO-Agent local FastAPI backend.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--project-root")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    app = create_app(
        token=args.token,
        data_dir=Path(args.data_dir),
        project_root=Path(args.project_root) if args.project_root else None,
    )
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
