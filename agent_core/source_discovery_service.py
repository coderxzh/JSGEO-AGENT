import json
from pathlib import Path
from typing import Any, Dict, Optional

from agent_core.db import (
    create_geo_question_set,
    create_geo_source_discovery,
    get_enterprise_profile,
    get_geo_source_discovery,
    get_latest_geo_question_set,
    get_latest_geo_report,
    get_latest_geo_source_discovery,
)
from agent_core.geo_project_service import (
    get_geo_project_detail,
    mark_phase_two_completed,
    mark_source_discovery_completed,
    normalize_platform,
)
from agent_core.knowledge_service import row_to_dict
from agent_core.llm_gateway import (
    ChatRequestPayload,
    LLMGateway,
    ProviderOptions,
    ProviderRequestError,
    parse_json_object,
)
from agent_core.schemas import GeoSourceDiscovery
from agent_core.skills_service import get_skill


def run_source_discovery(
    data_dir: Path,
    project_root: Path,
    llm_gateway: LLMGateway,
    geo_project_id: str,
    platform: str,
    fallback_report: Optional[Dict[str, Any]] = None,
) -> GeoSourceDiscovery:
    platform = normalize_platform(platform)
    geo_project = get_geo_project_detail(data_dir, geo_project_id)
    if not geo_project.knowledge_base_ready or geo_project.current_phase != "ready_for_check":
        raise ValueError("Knowledge base is not ready for source discovery")

    question_set_row = get_latest_geo_question_set(data_dir, geo_project.id, platform)
    if question_set_row is None:
        question_set_row = backfill_question_set_from_latest_report(data_dir, geo_project.id, geo_project.project_id, platform)
    if question_set_row is None and fallback_report:
        question_set_row = backfill_question_set_from_payload(
            data_dir,
            geo_project.id,
            geo_project.project_id,
            platform,
            fallback_report,
        )
    if question_set_row is None:
        raise ValueError("Ranking question pool is required before source discovery")

    profile_row = get_enterprise_profile(data_dir, geo_project.project_id)
    if profile_row is None:
        raise KeyError(geo_project.project_id)

    profile = row_to_dict(profile_row)
    question_set = parse_json(question_set_row["questions_json"], {})
    skill = get_skill(project_root, "source-discovery")
    skill_prompt = str((skill or {}).get("content") or "")
    user_message = build_source_discovery_user_message(platform, profile, question_set)

    try:
        response = llm_gateway.complete(
            platform,
            ChatRequestPayload(
                system_prompt=(
                    "你是 GEO-Agent Studio 阶段三信源证据盘点器。"
                    "本阶段只发现信源，不输出文章题目、发布计划、内容矩阵或下一步方案。"
                    "必须区分待验证候选和真实引用来源；真实引用来源必须有 URL，输出可解析 JSON。"
                ),
                user_message=user_message,
                conversation_id=None,
                options=ProviderOptions(deep_thinking=True, web_search=(platform == "doubao")),
                skill_prompt=skill_prompt,
            ),
        )
        discovery = normalize_discovery(parse_json_object(response.content) or {}, profile, platform)
    except ProviderRequestError as error:
        discovery = {
            "summary": f"{platform_label(platform)}信源发现失败：{error.message}",
            "status": "failed",
            "ai_recommended_sources": [],
            "observed_citation_sources": [],
            "verified_observed_sources": [],
            "candidate_sources": [],
            "source_scores": [],
            "missing_evidence": [error.message],
        }

    discovery_id = create_geo_source_discovery(
        data_dir,
        geo_project_id=geo_project.id,
        enterprise_project_id=geo_project.project_id,
        platform=platform,
        discovery_json=json.dumps(discovery, ensure_ascii=False),
    )
    if discovery.get("status") != "failed":
        mark_source_discovery_completed(data_dir, geo_project.id, platform, discovery_id)

    row = get_geo_source_discovery(data_dir, discovery_id)
    if row is None:
        raise KeyError(discovery_id)
    return row_to_geo_source_discovery(row)


def get_latest_platform_source_discovery(data_dir: Path, geo_project_id: str, platform: str) -> GeoSourceDiscovery:
    row = get_latest_geo_source_discovery(data_dir, geo_project_id, normalize_platform(platform))
    if row is None:
        raise KeyError(f"{geo_project_id}:{platform}")
    return row_to_geo_source_discovery(row)


def get_source_discovery_detail(data_dir: Path, discovery_id: str) -> GeoSourceDiscovery:
    row = get_geo_source_discovery(data_dir, discovery_id)
    if row is None:
        raise KeyError(discovery_id)
    return row_to_geo_source_discovery(row)


def backfill_question_set_from_latest_report(
    data_dir: Path,
    geo_project_id: str,
    enterprise_project_id: str,
    platform: str,
):
    report_row = get_latest_geo_report(data_dir, geo_project_id, platform)
    if report_row is None or report_row["status"] != "completed":
        return None
    report = parse_json(report_row["report_json"], {})
    if not has_question_pool_data(report):
        return None
    question_set_id = create_geo_question_set(
        data_dir,
        geo_project_id=geo_project_id,
        enterprise_project_id=enterprise_project_id,
        platform=platform,
        questions_json=json.dumps(report, ensure_ascii=False),
    )
    mark_phase_two_completed(data_dir, geo_project_id, platform, question_set_id)
    return get_latest_geo_question_set(data_dir, geo_project_id, platform)


def backfill_question_set_from_payload(
    data_dir: Path,
    geo_project_id: str,
    enterprise_project_id: str,
    platform: str,
    fallback_report: Dict[str, Any],
):
    report = fallback_report.get("report") if isinstance(fallback_report.get("report"), dict) else fallback_report
    if not isinstance(report, dict) or not has_question_pool_data(report):
        return None
    question_set_id = create_geo_question_set(
        data_dir,
        geo_project_id=geo_project_id,
        enterprise_project_id=enterprise_project_id,
        platform=platform,
        questions_json=json.dumps(report, ensure_ascii=False),
    )
    mark_phase_two_completed(data_dir, geo_project_id, platform, question_set_id)
    return get_latest_geo_question_set(data_dir, geo_project_id, platform)


def has_question_pool_data(report: Dict[str, Any]) -> bool:
    return any(
        isinstance(report.get(key), list) and len(report.get(key) or []) > 0
        for key in ("question_pool", "ranking_questions")
    )


def row_to_geo_source_discovery(row) -> GeoSourceDiscovery:
    return GeoSourceDiscovery(
        id=row["id"],
        geo_project_id=row["geo_project_id"],
        enterprise_project_id=row["enterprise_project_id"],
        platform=row["platform"],
        discovery=parse_json(row["discovery_json"], {}),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def build_source_discovery_user_message(platform: str, profile: Dict[str, Any], question_set: Dict[str, Any]) -> str:
    stage_two_only = {
        "summary": question_set.get("summary"),
        "question_pool": question_set.get("question_pool"),
        "ranking_questions": question_set.get("ranking_questions"),
    }
    return (
        f"目标平台：{platform}\n\n"
        f"企业资料：\n{json.dumps(profile, ensure_ascii=False, indent=2)[:12000]}\n\n"
        f"阶段二排行榜问题池：\n{json.dumps(stage_two_only, ensure_ascii=False, indent=2)[:12000]}\n\n"
        "请执行阶段三信源证据盘点。只输出严格 JSON，字段只能包含 ai_recommended_sources、observed_citation_sources、source_scores、missing_evidence。"
        "observed_citation_sources 必须来自真实引用或检索结果，且必须包含 http/https URL；无 URL 的候选只能放入 ai_recommended_sources 或 missing_evidence。"
    )


def normalize_discovery(raw: Dict[str, Any], profile: Dict[str, Any], platform: str) -> Dict[str, Any]:
    company_name = profile.get("company_name") or "当前企业"
    observed_sources, dropped_evidence = normalize_observed_sources(raw.get("observed_citation_sources"))
    recommended_sources = normalize_recommended_sources(raw.get("ai_recommended_sources"))
    missing_evidence = ensure_string_list(raw.get("missing_evidence"))
    missing_evidence.extend(dropped_evidence)
    candidate_sources = normalize_candidate_sources(recommended_sources, raw.get("source_scores"), observed_sources)
    source_scores = build_evidence_scores(observed_sources, candidate_sources)
    summary = str(raw.get("summary") or "").strip()
    if not summary:
        summary = (
            f"{company_name} 的 {platform_label(platform)} 信源证据盘点已完成，暂未获得可核验引用来源。"
            if not observed_sources
            else f"{company_name} 的 {platform_label(platform)} 信源证据盘点已完成。"
        )
    return {
        "summary": sanitize_claim_text(summary),
        "status": str(raw.get("status") or "completed"),
        "ai_recommended_sources": recommended_sources,
        "observed_citation_sources": observed_sources,
        "verified_observed_sources": observed_sources,
        "candidate_sources": candidate_sources,
        "source_scores": source_scores,
        "missing_evidence": dedupe_strings(missing_evidence),
    }


def normalize_recommended_sources(value: Any) -> list[Dict[str, Any]]:
    items = []
    for item in ensure_list(value):
        if not isinstance(item, dict):
            continue
        source = str(item.get("source") or item.get("channel") or "").strip()
        if not source:
            continue
        items.append({
            "source": source,
            "source_type": str(item.get("source_type") or "").strip(),
            "reason": sanitize_claim_text(str(item.get("reason") or "").strip()),
            "confidence": cap_unverified_confidence(item.get("confidence")),
        })
    return items[:8]


def normalize_observed_sources(value: Any) -> tuple[list[Dict[str, Any]], list[str]]:
    items = []
    dropped = []
    for item in ensure_list(value):
        if not isinstance(item, dict):
            continue
        source = str(item.get("source") or "").strip()
        if not source:
            continue
        url = str(item.get("url") or "").strip()
        if not is_verified_url(url):
            question = str(item.get("question") or "").strip()
            dropped.append(
                f"{source}{f'（{question}）' if question else ''}缺少可核验 URL，暂不能作为实测引用信源。"
            )
            continue
        items.append({
            "question": str(item.get("question") or "").strip(),
            "source": source,
            "url": url,
            "evidence": sanitize_claim_text(str(item.get("evidence") or "").strip()),
        })
    return items[:8], dropped[:8]


def normalize_candidate_sources(
    recommended_sources: list[Dict[str, Any]],
    raw_scores: Any,
    verified_sources: list[Dict[str, Any]],
) -> list[Dict[str, Any]]:
    verified_keys = {source_key(item.get("source")) for item in verified_sources}
    candidates: list[Dict[str, Any]] = []
    seen = set()
    for item in recommended_sources:
        source = str(item.get("source") or "").strip()
        key = source_key(source)
        if not source or key in verified_keys or key in seen:
            continue
        seen.add(key)
        candidates.append({
            "source": source,
            "source_type": item.get("source_type") or "",
            "verification_status": "待验证",
            "reason": sanitize_claim_text(str(item.get("reason") or "暂无可核验 URL，需继续验证。")),
            "confidence": cap_unverified_confidence(item.get("confidence")),
        })
    for item in ensure_list(raw_scores):
        if not isinstance(item, dict):
            continue
        source = str(item.get("source") or item.get("channel") or "").strip()
        key = source_key(source)
        if not source or key in verified_keys or key in seen:
            continue
        seen.add(key)
        candidates.append({
            "source": source,
            "source_type": str(item.get("source_type") or "").strip(),
            "verification_status": "待验证",
            "reason": sanitize_claim_text(str(item.get("why") or item.get("reason") or "暂无可核验 URL，需继续验证。")),
            "confidence": "待验证",
        })
    return candidates[:8]


def build_evidence_scores(
    verified_sources: list[Dict[str, Any]],
    candidate_sources: list[Dict[str, Any]],
) -> list[Dict[str, Any]]:
    scores: list[Dict[str, Any]] = []
    for index, item in enumerate(verified_sources[:8]):
        scores.append({
            "source": item.get("source") or "",
            "score": max(78, 92 - index * 3),
            "priority": "高" if index > 0 else "最高",
            "evidence_level": "已验证引用",
            "why": "包含可核验 URL，可作为阶段三实测引用证据。",
        })
    for index, item in enumerate(candidate_sources[:8 - len(scores)]):
        scores.append({
            "source": item.get("source") or "",
            "score": max(45, 60 - index * 3),
            "priority": "待验证",
            "evidence_level": "候选信源",
            "why": sanitize_claim_text(str(item.get("reason") or "暂无可核验 URL，需继续验证后才能作为引用信源。")),
        })
    return scores[:8]


def is_verified_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def cap_unverified_confidence(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "待验证"
    if raw in {"最高", "高", "高权重", "权威"}:
        return "待验证"
    return sanitize_claim_text(raw)


def sanitize_claim_text(value: str) -> str:
    text = value.strip()
    replacements = {
        "权重第一": "待验证",
        "采信权重第一": "待验证",
        "采信最高": "待验证",
        "最高权威": "候选权威",
        "无任何可信度瑕疵": "需核验证据",
        "完全匹配": "可能匹配",
        "必然引用": "可能被引用",
        "拉满": "较高",
        "实锤": "待核验",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


def source_key(value: Any) -> str:
    return str(value or "").strip().lower()


def ensure_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def ensure_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [line.strip("- ").strip() for line in value.splitlines() if line.strip()]
    return []


def dedupe_strings(value: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in value:
        if item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result[:12]


def parse_json(raw: str, fallback):
    try:
        return json.loads(raw or "")
    except json.JSONDecodeError:
        return fallback


def platform_label(platform: str) -> str:
    return "豆包" if platform == "doubao" else "DeepSeek"
