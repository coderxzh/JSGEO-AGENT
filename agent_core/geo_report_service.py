import json
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from agent_core.db import (
    create_geo_question_set,
    create_geo_report,
    get_enterprise_profile,
    get_geo_question_set,
    get_geo_report,
    get_latest_geo_question_set,
    get_latest_geo_report,
    list_knowledge_entries,
)
from agent_core.geo_project_service import get_geo_project_detail, mark_phase_two_completed, normalize_platform
from agent_core.knowledge_service import row_to_dict
from agent_core.llm_gateway import (
    ChatRequestPayload,
    LLMGateway,
    ProviderOptions,
    ProviderRequestError,
    parse_json_object,
)
from agent_core.schemas import GeoQuestionSet, GeoReport
from agent_core.skills_service import get_skill


def run_phase_two_report(
    data_dir: Path,
    project_root: Path,
    llm_gateway: LLMGateway,
    geo_project_id: str,
    platform: str,
) -> GeoReport:
    platform = normalize_platform(platform)
    geo_project = get_geo_project_detail(data_dir, geo_project_id)
    if not geo_project.knowledge_base_ready or geo_project.current_phase != "ready_for_check":
        raise ValueError("Knowledge base is not ready for phase two")

    profile_row = get_enterprise_profile(data_dir, geo_project.project_id)
    if profile_row is None:
        raise KeyError(geo_project.project_id)

    profile = row_to_dict(profile_row)
    entries = list(list_knowledge_entries(data_dir, geo_project.project_id, limit=80))
    skill = get_skill(project_root, "geo-check")
    skill_prompt = str((skill or {}).get("content") or "")
    user_message = build_geo_check_user_message(
        platform=platform,
        profile=profile,
        initial_keywords=geo_project.initial_keywords,
        entries=entries,
    )

    try:
        response = llm_gateway.complete(
            platform,
            ChatRequestPayload(
                system_prompt=(
                    "你是 GEO-Agent Studio 阶段二排行榜问题池构建器。"
                    "本阶段只生成问题池，不输出信源、文章题目、缺失事实或下一步方案。"
                    "必须严格遵守技能要求，输出可解析 JSON。"
                ),
                user_message=user_message,
                conversation_id=None,
                options=ProviderOptions(deep_thinking=True, web_search=(platform == "doubao")),
                skill_prompt=skill_prompt,
            ),
        )
        report = normalize_report(parse_json_object(response.content) or {}, profile, platform)
        markdown = build_report_markdown(report, geo_project.company_name, platform)
        question_set_id = create_geo_question_set(
            data_dir,
            geo_project_id=geo_project.id,
            enterprise_project_id=geo_project.project_id,
            platform=platform,
            questions_json=json.dumps(report, ensure_ascii=False),
        )
        report_id = create_geo_report(
            data_dir,
            geo_project_id=geo_project.id,
            enterprise_project_id=geo_project.project_id,
            platform=platform,
            status="completed",
            report_json=json.dumps(report, ensure_ascii=False),
            markdown=markdown,
        )
        mark_phase_two_completed(data_dir, geo_project.id, platform, question_set_id)
    except ProviderRequestError as error:
        report_id = create_geo_report(
            data_dir,
            geo_project_id=geo_project.id,
            enterprise_project_id=geo_project.project_id,
            platform=platform,
            status="failed",
            report_json="{}",
            markdown="",
            error_message=error.message,
        )

    report_row = get_geo_report(data_dir, report_id)
    if report_row is None:
        raise KeyError(report_id)
    return row_to_geo_report(report_row)


def get_latest_platform_report(data_dir: Path, geo_project_id: str, platform: str) -> GeoReport:
    row = get_latest_geo_report(data_dir, geo_project_id, normalize_platform(platform))
    if row is None:
        raise KeyError(f"{geo_project_id}:{platform}")
    return row_to_geo_report(row)


def get_latest_platform_question_set(data_dir: Path, geo_project_id: str, platform: str) -> GeoQuestionSet:
    row = get_latest_geo_question_set(data_dir, geo_project_id, normalize_platform(platform))
    if row is None:
        raise KeyError(f"{geo_project_id}:{platform}")
    return row_to_geo_question_set(row)


def get_question_set_detail(data_dir: Path, question_set_id: str) -> GeoQuestionSet:
    row = get_geo_question_set(data_dir, question_set_id)
    if row is None:
        raise KeyError(question_set_id)
    return row_to_geo_question_set(row)


def get_report_detail(data_dir: Path, report_id: str) -> GeoReport:
    row = get_geo_report(data_dir, report_id)
    if row is None:
        raise KeyError(report_id)
    return row_to_geo_report(row)


def row_to_geo_question_set(row) -> GeoQuestionSet:
    return GeoQuestionSet(
        id=row["id"],
        geo_project_id=row["geo_project_id"],
        enterprise_project_id=row["enterprise_project_id"],
        platform=row["platform"],
        questions=parse_json(row["questions_json"], {}),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def row_to_geo_report(row) -> GeoReport:
    return GeoReport(
        id=row["id"],
        geo_project_id=row["geo_project_id"],
        enterprise_project_id=row["enterprise_project_id"],
        platform=row["platform"],
        status=row["status"],
        report=parse_json(row["report_json"], {}),
        markdown=row["markdown"] or "",
        error_message=row["error_message"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def build_geo_check_user_message(
    platform: str,
    profile: Dict[str, Any],
    initial_keywords: list[str],
    entries: Iterable[Any],
) -> str:
    entry_blocks = []
    for row in entries:
        title = row["title"] if "title" in row.keys() else "知识条目"
        content = row["content"] if "content" in row.keys() else ""
        entry_blocks.append(f"- {title}: {content[:500]}")
    knowledge_summary = "\n".join(entry_blocks[:60]) or "暂无知识条目"
    profile_text = json.dumps(profile, ensure_ascii=False, indent=2)
    return (
        f"目标平台：{platform}\n"
        f"阶段一初始关键词：{', '.join(initial_keywords) or '暂无'}\n\n"
        f"企业结构化资料：\n{profile_text[:12000]}\n\n"
        f"企业知识库摘要：\n{knowledge_summary[:18000]}\n\n"
        "请生成阶段二排行榜问题池。只输出严格 JSON，字段只能包含 summary、question_pool、ranking_questions。"
    )


def normalize_report(raw: Dict[str, Any], profile: Dict[str, Any], platform: str) -> Dict[str, Any]:
    company_name = profile.get("company_name") or "当前企业"
    return {
        "summary": str(raw.get("summary") or f"{company_name} 的 {platform} 排行榜问题池已生成，下一步应发现高权重信源。"),
        "question_pool": normalize_question_items(raw.get("question_pool"), limit=8),
        "ranking_questions": normalize_question_items(raw.get("ranking_questions"), limit=5),
    }


def build_report_markdown(report: Dict[str, Any], company_name: str, platform: str) -> str:
    platform_label = "豆包" if platform == "doubao" else "DeepSeek"
    lines = [
        f"# {company_name} {platform_label} 排行榜问题池",
        "",
        f"## 总体结论\n{report.get('summary') or ''}",
        "",
        "## 用户问题池",
        *format_items(report.get("question_pool")),
        "",
        "## 高优先级排行榜问题",
        *format_items(report.get("ranking_questions")),
        "",
    ]
    return "\n".join(lines).strip()


def normalize_question_items(value: Any, limit: int) -> list[Dict[str, Any]]:
    normalized = []
    for item in ensure_list(value):
        if isinstance(item, dict):
            question = str(item.get("question") or item.get("keyword") or item.get("topic") or "").strip()
            if not question:
                continue
            normalized.append({
                key: str(item.get(key) or "").strip()
                for key in ("question", "intent", "keyword", "region", "priority", "reason", "why")
                if str(item.get(key) or "").strip()
            })
        elif str(item).strip():
            normalized.append({"question": str(item).strip()})
        if len(normalized) >= limit:
            break
    return normalized


def format_items(value: Any) -> list[str]:
    items = ensure_list(value)
    if not items:
        return ["- 暂无"]
    formatted = []
    for item in items:
        if isinstance(item, dict):
            text = "；".join(f"{key}: {val}" for key, val in item.items() if val not in (None, "", []))
            formatted.append(f"- {text or json.dumps(item, ensure_ascii=False)}")
        else:
            formatted.append(f"- {item}")
    return formatted


def format_dict(value: Any) -> list[str]:
    data = ensure_dict(value)
    if not data:
        return ["- 暂无"]
    return [
        f"- {key}: {json.dumps(val, ensure_ascii=False) if isinstance(val, (dict, list)) else val}"
        for key, val in data.items()
        if val not in (None, "", [])
    ] or ["- 暂无"]


def ensure_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def ensure_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


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
