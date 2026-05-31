import os
import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Mapping, Optional
from urllib.parse import urlparse

import httpx


DEFAULT_SYSTEM_PROMPT = (
    "你是鲸杉 GEO-Agent Studio 的本地调度助手。"
    "你负责理解用户意图，并围绕企业 GEO 优化、知识库、文章生成、网页生成和发稿流程给出下一步。"
)

KNOWLEDGE_CONTEXT_PROMPT = (
    "\n\n以下是当前企业的本地知识库资料。回答时优先使用这些资料；"
    "如果资料不足，请明确说明缺口，不要编造企业事实。\n"
)

WEB_SEARCH_SYSTEM_PROMPT = (
    "\n\n当用户开启联网搜索时，请把 GEO 优化、排行榜、竞品、行业趋势、品牌现状类问题拆分为 3-5 个独立搜索关键词，"
    "分别覆盖品牌词、行业词、地域词、竞品词和用户真实意图。除非问题非常简单，不要只搜索单一关键词。"
    "回答时优先使用可核验来源，尽量给出引用充分、来源清晰、信息完整的结论。"
)


@dataclass(frozen=True)
class ProviderOptions:
    deep_thinking: Optional[bool] = None
    web_search: Optional[bool] = None


@dataclass(frozen=True)
class SearchContext:
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None

    def as_user_location(self) -> Dict[str, str]:
        location = {"type": "approximate"}
        if self.country:
            location["country"] = self.country
        if self.region:
            location["region"] = self.region
        if self.city:
            location["city"] = self.city
        return location


@dataclass(frozen=True)
class ChatRequestPayload:
    system_prompt: str
    user_message: str
    conversation_id: Optional[str]
    options: ProviderOptions = ProviderOptions()
    search_context: Optional[SearchContext] = None
    knowledge_context: Optional[str] = None
    skill_prompt: Optional[str] = None


@dataclass(frozen=True)
class ProviderConfig:
    provider: str
    api_key: Optional[str]
    model: str
    base_url: str
    deep_thinking: bool = False
    web_search: bool = False
    reasoning_effort: str = "high"
    web_search_max_keyword: int = 10
    web_search_limit: int = 20
    web_search_max_tool_calls: int = 10
    web_search_sources: tuple[str, ...] = ("toutiao", "douyin")
    max_output_tokens: int = 32768

    @property
    def configured(self) -> bool:
        return bool(self.api_key)


@dataclass(frozen=True)
class SourceCitation:
    title: str
    url: str
    logo_url: Optional[str] = None
    start_index: Optional[int] = None
    end_index: Optional[int] = None


@dataclass(frozen=True)
class ProviderResponse:
    provider: str
    model: str
    content: str
    sources: List[SourceCitation] = field(default_factory=list)
    search_queries: List[str] = field(default_factory=list)
    search_actions: List[Dict[str, Any]] = field(default_factory=list)
    search_usage: Dict[str, Any] = field(default_factory=dict)
    reasoning_content: Optional[str] = None


class ProviderRequestError(RuntimeError):
    def __init__(self, provider: str, model: str, message: str, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.provider = provider
        self.model = model
        self.status_code = status_code
        self.message = message


ENTERPRISE_PROFILE_EXTRACTION_PROMPT = (
    "你是 GEO-Agent Studio 的企业知识库结构化抽取器。"
    "请从用户提供的资料中抽取可直接写入本地企业知识库的字段。"
    "只输出严格 JSON 对象，不要 Markdown，不要解释，不要提到 SQLite。"
    "字段名只能使用：company_name, short_name, industry, main_business, official_website, official_media, "
    "detailed_intro, brand_story, products_services, product_features, user_pain_points, trust_endorsements, "
    "brand_authorization_pricing, cases, business_regions, customer_service_phone, current_pain_points, "
    "core_advantages, extra_info, image_notes, target_keywords。"
    "没有依据的字段用空字符串。保留原文事实，不要编造。"
)


def env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


def env_list(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    raw = os.getenv(name)
    if raw is None:
        return default
    values = tuple(part.strip() for part in raw.split(",") if part.strip())
    return values or default


def select_provider(selected_model: Optional[str]) -> str:
    normalized = (selected_model or "").lower()
    if "deepseek" in normalized or "deepseek" in (selected_model or ""):
        return "deepseek"
    if "doubao" in normalized or "豆包" in (selected_model or ""):
        return "doubao"
    if "调度" in (selected_model or "") or "geo-agent" in normalized:
        return "dispatcher"
    return "dispatcher"


def load_provider_configs() -> Dict[str, ProviderConfig]:
    openai_model = os.getenv("OPENAI_MODEL", "gpt-5.4")
    return {
        "dispatcher": ProviderConfig(
            provider="openai",
            api_key=os.getenv("OPENAI_API_KEY"),
            model=openai_model,
            base_url=os.getenv("OPENAI_BASE_URL", "https://xint.cc"),
            deep_thinking=True,
            reasoning_effort=os.getenv("OPENAI_REASONING_EFFORT", "medium"),
        ),
        "deepseek": ProviderConfig(
            provider="deepseek",
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro"),
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            deep_thinking=env_flag("DEEPSEEK_DEEP_THINKING", True),
            reasoning_effort=os.getenv("DEEPSEEK_REASONING_EFFORT", "high"),
        ),
        "doubao": ProviderConfig(
            provider="doubao",
            api_key=os.getenv("ARK_API_KEY") or os.getenv("DOUBAO_API_KEY"),
            model=os.getenv("DOUBAO_MODEL", "doubao-seed-2-0-lite-260428"),
            base_url=os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
            deep_thinking=env_flag("DOUBAO_DEEP_THINKING", True),
            web_search=env_flag("DOUBAO_WEB_SEARCH", True),
            reasoning_effort=os.getenv("DOUBAO_REASONING_EFFORT", "high"),
            web_search_max_keyword=env_int("DOUBAO_WEB_SEARCH_MAX_KEYWORD", 10, 1, 50),
            web_search_limit=env_int("DOUBAO_WEB_SEARCH_LIMIT", 20, 1, 50),
            web_search_max_tool_calls=env_int("DOUBAO_WEB_SEARCH_MAX_TOOL_CALLS", 10, 1, 10),
            web_search_sources=env_list("DOUBAO_WEB_SEARCH_SOURCES", ("toutiao", "douyin")),
            max_output_tokens=env_int("DOUBAO_MAX_OUTPUT_TOKENS", 32768, 1024, 65536),
        ),
    }


def is_enabled(default: bool, override: Optional[bool]) -> bool:
    return default if override is None else override


def provider_status(configs: Mapping[str, ProviderConfig]) -> Dict[str, Dict[str, Any]]:
    return {
        key: {
            "provider": config.provider,
            "configured": config.configured,
            "model": config.model,
            "base_url": config.base_url,
        }
        for key, config in configs.items()
    }


class LLMGateway:
    def __init__(
        self,
        configs: Optional[Mapping[str, ProviderConfig]] = None,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self.configs = dict(load_provider_configs() if configs is None else configs)
        self.http = http_client or httpx.Client(timeout=1800)

    def complete(self, provider_key: str, payload: ChatRequestPayload) -> ProviderResponse:
        config = self.configs.get(provider_key)
        if config is None or not config.configured:
            return self.local_fallback(provider_key)

        if config.provider == "deepseek":
            return self.call_deepseek(config, payload)
        if config.provider == "doubao":
            return self.call_doubao(config, payload)
        if config.provider == "openai":
            return self.call_openai(config, payload)

        return self.local_fallback(provider_key)

    def local_fallback(self, provider_key: str) -> ProviderResponse:
        return ProviderResponse(
            provider="local",
            model="local-fallback",
            content=(
                f"当前已选择 {provider_key}，但尚未配置对应 API Key。"
                "请在本地环境中配置 OPENAI_API_KEY、ARK_API_KEY/DOUBAO_API_KEY 或 DEEPSEEK_API_KEY 后重试。"
            ),
        )

    def call_deepseek(self, config: ProviderConfig, payload: ChatRequestPayload) -> ProviderResponse:
        system_prompt = build_system_prompt(payload)
        body: Dict[str, Any] = {
            "model": config.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": payload.user_message},
            ],
            "stream": False,
        }
        if is_enabled(config.deep_thinking, payload.options.deep_thinking):
            body["thinking"] = {"type": "enabled"}
            body["reasoning_effort"] = config.reasoning_effort

        data = self.post_json(config, "/chat/completions", body)
        content = data["choices"][0]["message"].get("content") or ""
        return ProviderResponse(provider="deepseek", model=config.model, content=content)

    def call_doubao(self, config: ProviderConfig, payload: ChatRequestPayload) -> ProviderResponse:
        body = self.build_doubao_body(config, payload, stream=False)
        data = self.post_json(config, "/responses", body)
        return ProviderResponse(
            provider="doubao",
            model=config.model,
            content=extract_response_text(data),
            sources=extract_response_sources(data),
            search_queries=extract_web_search_queries(data),
            search_actions=extract_web_search_actions(data),
            search_usage=extract_web_search_usage(data),
            reasoning_content=extract_reasoning_content(data),
        )

    def build_doubao_body(self, config: ProviderConfig, payload: ChatRequestPayload, stream: bool) -> Dict[str, Any]:
        web_search_enabled = config.web_search and is_enabled(config.web_search, payload.options.web_search)
        system_prompt = build_system_prompt(payload, web_search_enabled=web_search_enabled)

        body: Dict[str, Any] = {
            "model": config.model,
            "input": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": payload.user_message},
            ],
        }
        if stream:
            body["stream"] = True
        if is_enabled(config.deep_thinking, payload.options.deep_thinking):
            body["thinking"] = {"type": "enabled"}
            body["reasoning"] = {"effort": config.reasoning_effort}
            body["max_output_tokens"] = config.max_output_tokens
        if web_search_enabled:
            tool: Dict[str, Any] = {
                "type": "web_search",
                "max_keyword": config.web_search_max_keyword,
                "limit": config.web_search_limit,
            }
            if config.web_search_sources:
                tool["sources"] = list(config.web_search_sources)
            user_location = payload.search_context.as_user_location() if payload.search_context else {}
            if user_location:
                tool["user_location"] = user_location
            body["tools"] = [tool]
            body["max_tool_calls"] = config.web_search_max_tool_calls

        return body

    def stream_doubao(self, config: ProviderConfig, payload: ChatRequestPayload):
        body = self.build_doubao_body(config, payload, stream=True)
        content_chunks: List[str] = []
        reasoning_chunks: List[str] = []
        search_queries: List[str] = []
        search_actions: List[Dict[str, Any]] = []
        completed_response: Optional[Dict[str, Any]] = None

        for event in self.stream_json_events(config, "/responses", body):
            event_type = str(event.get("type") or event.get("event") or "")

            if event_type == "response.reasoning_summary_text.delta":
                delta = str(event.get("delta") or "")
                if delta:
                    reasoning_chunks.append(delta)
                    yield {"type": "reasoning_delta", "text": delta}
                continue

            if event_type == "response.output_text.delta":
                delta = str(event.get("delta") or "")
                if delta:
                    content_chunks.append(delta)
                    yield {"type": "delta", "text": delta}
                continue

            if event_type == "response.completed":
                response_data = event.get("response")
                if isinstance(response_data, dict):
                    completed_response = response_data
                continue

            event_search_actions = extract_web_search_actions(event)
            if event_search_actions:
                for action in event_search_actions:
                    query = action.get("query")
                    if isinstance(query, str) and query and query not in search_queries:
                        search_queries.append(query)
                        yield {
                            "type": "search",
                            "search_status": "completed" if event_type.endswith(".done") else "in_progress",
                            "search_query": query,
                            "search_action": action,
                        }
                    if action not in search_actions:
                        search_actions.append(action)

        response_payload = completed_response or {}
        final_content = "".join(content_chunks).strip() or extract_response_text(response_payload)
        final_reasoning = "".join(reasoning_chunks).strip() or extract_reasoning_content(response_payload)
        final_sources = extract_response_sources(response_payload)
        final_search_queries = extract_web_search_queries(response_payload) or search_queries
        final_search_actions = extract_web_search_actions(response_payload) or search_actions
        final_search_usage = extract_web_search_usage(response_payload)

        yield {
            "type": "done",
            "provider": "doubao",
            "model": config.model,
            "content": final_content,
            "reasoning_content": final_reasoning,
            "sources": [source.__dict__ for source in final_sources],
            "search_queries": final_search_queries,
            "search_actions": final_search_actions,
            "search_usage": final_search_usage,
        }

    def call_openai(self, config: ProviderConfig, payload: ChatRequestPayload) -> ProviderResponse:
        system_prompt = build_system_prompt(payload)
        body: Dict[str, Any] = {
            "model": config.model,
            "input": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": payload.user_message},
            ],
        }
        if is_enabled(config.deep_thinking, payload.options.deep_thinking):
            body["reasoning"] = {"effort": config.reasoning_effort}

        data = self.post_json(config, "/responses", body)
        return ProviderResponse(provider="openai", model=config.model, content=extract_response_text(data))

    def extract_enterprise_profile(self, text: str) -> Optional[Dict[str, Any]]:
        config = self.configs.get("dispatcher")
        if config is None or not config.configured:
            return None
        body: Dict[str, Any] = {
            "model": config.model,
            "input": [
                {"role": "system", "content": ENTERPRISE_PROFILE_EXTRACTION_PROMPT},
                {"role": "user", "content": text[:30000]},
            ],
        }
        data = self.post_json(config, "/responses", body)
        return parse_json_object(extract_response_text(data))

    def post_json(self, config: ProviderConfig, endpoint: str, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = self.http.post(
                f"{config.base_url.rstrip('/')}{endpoint}",
                headers={
                    "Authorization": f"Bearer {config.api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as error:
            detail = extract_error_detail(error.response)
            raise ProviderRequestError(
                provider=config.provider,
                model=config.model,
                status_code=error.response.status_code,
                message=f"{config.provider} 请求失败（HTTP {error.response.status_code}）：{detail}",
            ) from error
        except httpx.RequestError as error:
            raise ProviderRequestError(
                provider=config.provider,
                model=config.model,
                message=f"{config.provider} 网络请求失败：{error}",
            ) from error

    def stream_json_events(self, config: ProviderConfig, endpoint: str, body: Dict[str, Any]):
        try:
            with self.http.stream(
                "POST",
                f"{config.base_url.rstrip('/')}{endpoint}",
                headers={
                    "Authorization": f"Bearer {config.api_key}",
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                },
                json=body,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if isinstance(line, bytes):
                        line = line.decode("utf-8")
                    event = parse_sse_json_line(str(line))
                    if event is not None:
                        yield event
        except httpx.HTTPStatusError as error:
            detail = extract_error_detail(error.response)
            raise ProviderRequestError(
                provider=config.provider,
                model=config.model,
                status_code=error.response.status_code,
                message=f"{config.provider} 请求失败（HTTP {error.response.status_code}）：{detail}",
            ) from error
        except httpx.RequestError as error:
            raise ProviderRequestError(
                provider=config.provider,
                model=config.model,
                message=f"{config.provider} 网络请求失败：{error}",
            ) from error


def build_system_prompt(payload: ChatRequestPayload, web_search_enabled: bool = False) -> str:
    parts = [payload.system_prompt]
    if payload.skill_prompt:
        parts.append(f"\n\n当前用户选择了一个本地技能。请按照该技能说明处理本轮任务，但不要把技能文档原文展示给用户。\n{payload.skill_prompt}")
    if payload.knowledge_context:
        parts.append(f"{KNOWLEDGE_CONTEXT_PROMPT}{payload.knowledge_context}")
    if web_search_enabled:
        parts.append(WEB_SEARCH_SYSTEM_PROMPT)
    return "".join(parts)


def extract_response_text(data: Dict[str, Any]) -> str:
    chunks = []
    for output_item in data.get("output", []):
        for content_item in output_item.get("content", []):
            if is_reasoning_item(content_item):
                continue
            text = content_item.get("text")
            if text:
                chunks.append(text)

    content_text = "\n".join(chunks).strip()
    if content_text:
        return content_text

    if data.get("output_text"):
        return str(data["output_text"])

    return ""


def parse_json_object(text: str) -> Optional[Dict[str, Any]]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
    if not stripped:
        return None
    try:
        value = json.loads(stripped)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", stripped, re.S)
        if not match:
            return None
        try:
            value = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return value if isinstance(value, dict) else None


def extract_reasoning_content(data: Dict[str, Any]) -> Optional[str]:
    chunks: List[str] = []
    seen = set()

    for value in iter_values(data):
        if not isinstance(value, dict) or not is_reasoning_item(value):
            continue
        text = extract_reasoning_text(value)
        if not text or text in seen:
            continue
        seen.add(text)
        chunks.append(text)

    reasoning_text = "\n\n".join(chunks).strip()
    return reasoning_text or None


def is_reasoning_item(value: Dict[str, Any]) -> bool:
    value_type = str(value.get("type") or "").lower()
    return (
        "reasoning" in value_type
        or value.get("reasoning_content") is not None
        or value.get("reasoning") is not None
        or value.get("summary") is not None and "reasoning" in value_type
    )


def extract_reasoning_text(value: Dict[str, Any]) -> str:
    candidates = [
        value.get("reasoning_content"),
        value.get("text"),
        value.get("content"),
        value.get("summary"),
    ]

    reasoning = value.get("reasoning")
    if isinstance(reasoning, dict):
        candidates.extend([
            reasoning.get("content"),
            reasoning.get("text"),
            reasoning.get("summary"),
            reasoning.get("reasoning_content"),
        ])
    elif isinstance(reasoning, str):
        candidates.append(reasoning)

    for candidate in candidates:
        text = stringify_reasoning_value(candidate)
        if text:
            return text

    return ""


def stringify_reasoning_value(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return extract_reasoning_text(value)
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, dict):
                parts.append(extract_reasoning_text(item))
            elif isinstance(item, str):
                parts.append(item.strip())
        return "\n".join(part for part in parts if part).strip()
    return ""


def parse_sse_json_line(line: str) -> Optional[Dict[str, Any]]:
    stripped = line.strip()
    if not stripped or stripped.startswith(":"):
        return None
    if stripped.startswith("data:"):
        stripped = stripped[5:].strip()
    if not stripped or stripped == "[DONE]":
        return None
    try:
        payload = json.loads(stripped)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def extract_response_sources(data: Dict[str, Any]) -> List[SourceCitation]:
    sources: List[SourceCitation] = []
    seen_urls = set()

    for annotation in iter_annotations(data):
        citation = normalize_url_citation(annotation)
        if citation is None or citation.url in seen_urls:
            continue
        seen_urls.add(citation.url)
        sources.append(citation)

    return sources


def extract_web_search_queries(data: Dict[str, Any]) -> List[str]:
    queries: List[str] = []
    seen_queries = set()

    for value in iter_values(data):
        if not isinstance(value, dict) or value.get("type") != "web_search_call":
            continue
        action = value.get("action")
        if not isinstance(action, dict):
            continue
        query = action.get("query")
        if not query:
            continue
        normalized = str(query).strip()
        if normalized and normalized not in seen_queries:
            seen_queries.add(normalized)
            queries.append(normalized)

    return queries


def extract_web_search_actions(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    actions: List[Dict[str, Any]] = []
    seen_actions = set()

    for value in iter_values(data):
        if not isinstance(value, dict) or value.get("type") != "web_search_call":
            continue
        action = value.get("action")
        if not isinstance(action, dict):
            continue
        normalized = normalize_search_action(action)
        if not normalized:
            continue
        dedupe_key = normalized.get("query") or tuple(sorted((key, str(item)) for key, item in normalized.items()))
        if dedupe_key in seen_actions:
            continue
        seen_actions.add(dedupe_key)
        actions.append(normalized)

    return actions


def extract_web_search_usage(data: Dict[str, Any]) -> Dict[str, Any]:
    usage = data.get("usage")
    if not isinstance(usage, dict):
        return {}

    search_usage: Dict[str, Any] = {}
    tool_usage = usage.get("tool_usage")
    if tool_usage is not None:
        search_usage["tool_usage"] = tool_usage

    tool_usage_details = usage.get("tool_usage_details")
    if isinstance(tool_usage_details, dict):
        search_usage["tool_usage_details"] = tool_usage_details

    return search_usage


def normalize_search_action(action: Dict[str, Any]) -> Dict[str, Any]:
    allowed = {
        "type",
        "query",
        "sources",
        "max_keyword",
        "limit",
        "user_location",
    }
    normalized: Dict[str, Any] = {}
    for key in allowed:
        value = action.get(key)
        if value is not None and value != "":
            normalized[key] = value
    return normalized


def iter_annotations(value: Any):
    if isinstance(value, dict):
        annotations = value.get("annotations")
        if isinstance(annotations, list):
            for annotation in annotations:
                yield annotation
        if value.get("type") == "url_citation" or "url_citation" in value:
            yield value
        for child in value.values():
            yield from iter_annotations(child)
    elif isinstance(value, list):
        for item in value:
            yield from iter_annotations(item)


def iter_values(value: Any):
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from iter_values(child)
    elif isinstance(value, list):
        for item in value:
            yield from iter_values(item)


def normalize_url_citation(annotation: Dict[str, Any]) -> Optional[SourceCitation]:
    if not isinstance(annotation, dict):
        return None

    citation = annotation.get("url_citation")
    if isinstance(citation, dict):
        data = {**annotation, **citation}
    else:
        data = annotation

    annotation_type = data.get("type")
    if annotation_type not in {None, "url_citation"} and "url" not in data:
        return None

    url = data.get("url")
    if not url:
        return None

    parsed = urlparse(str(url))
    fallback_title = parsed.netloc or str(url)
    title = str(data.get("title") or fallback_title)
    logo_url = data.get("logo_url") or data.get("favicon") or data.get("icon_url")

    return SourceCitation(
        title=title,
        url=str(url),
        logo_url=str(logo_url) if logo_url else None,
        start_index=as_optional_int(data.get("start_index")),
        end_index=as_optional_int(data.get("end_index")),
    )


def as_optional_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def extract_error_detail(response: httpx.Response) -> str:
    try:
        data = response.json()
    except ValueError:
        return response.text[:500] or "服务端未返回错误详情"

    if isinstance(data, dict):
        error = data.get("error")
        if isinstance(error, dict):
            message = error.get("message") or error.get("code")
            if message:
                return str(message)
        detail = data.get("detail") or data.get("message") or data.get("code")
        if detail:
            return str(detail)

    return str(data)[:500]
