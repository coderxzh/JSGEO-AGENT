import json
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from agent_core.db import (
    get_enterprise_profile,
    get_geo_project,
    list_geo_projects,
    list_knowledge_entries,
    update_geo_project_phase,
    upsert_geo_project,
)
from agent_core.knowledge_service import row_to_dict, row_to_profile
from agent_core.rag_service import RAGService
from agent_core.schemas import GeoProject, GeoProjectEnsureRequest, GeoProjectsResponse


REQUIRED_STAGE_ONE_FIELDS = [
    "company_name",
    "industry",
    "main_business",
    "detailed_intro",
    "products_services",
    "user_pain_points",
    "trust_endorsements",
    "target_keywords",
]

SUPPORTED_PLATFORMS = ["doubao", "deepseek"]
PLATFORM_LABELS = {
    "doubao": "豆包",
    "deepseek": "DeepSeek",
}


def ensure_geo_project(
    data_dir: Path,
    rag_service: RAGService,
    payload: GeoProjectEnsureRequest,
) -> GeoProject:
    row = get_enterprise_profile(data_dir, payload.project_id)
    if row is None:
        raise KeyError(payload.project_id)
    profile = row_to_profile(row)
    entries = list(list_knowledge_entries(data_dir, payload.project_id, limit=200))
    index_status = rag_service.index_status(payload.project_id)
    assessment = assess_stage_one(row_to_dict(row), entries, index_status.model_dump())
    initial_keywords = build_initial_keywords(row_to_dict(row))
    requested_platforms = normalize_platforms(payload.platforms)
    phase_status = build_phase_status(assessment, len(entries), index_status.indexed, requested_platforms)
    existing_projects = list(list_geo_projects(data_dir, payload.project_id))
    existing_project = row_to_geo_project(existing_projects[0]) if existing_projects else None
    current_phase = "ready_for_check" if assessment["ready"] else "collecting"
    if existing_project:
        phase_status = merge_platform_phase_status(
            phase_status,
            existing_project.phase_status or {},
            requested_platforms,
        )
    geo_project_id = upsert_geo_project(
        data_dir,
        project_id=payload.project_id,
        company_name=profile.company_name,
        industry=profile.industry,
        region=profile.business_regions,
        current_phase=current_phase,
        platforms=json.dumps(requested_platforms, ensure_ascii=False),
        knowledge_base_ready=assessment["ready"],
        initial_keywords_json=json.dumps(initial_keywords, ensure_ascii=False),
        phase_status_json=json.dumps(phase_status, ensure_ascii=False),
    )
    project = get_geo_project(data_dir, geo_project_id)
    if project is None:
        raise KeyError(geo_project_id)
    return row_to_geo_project(project)


def list_enterprise_geo_projects(data_dir: Path, enterprise_project_id: Optional[str]) -> GeoProjectsResponse:
    return GeoProjectsResponse(
        projects=[row_to_geo_project(row) for row in list_geo_projects(data_dir, enterprise_project_id)]
    )


def get_geo_project_detail(data_dir: Path, geo_project_id: str) -> GeoProject:
    row = get_geo_project(data_dir, geo_project_id)
    if row is None:
        raise KeyError(geo_project_id)
    return row_to_geo_project(row)


def confirm_phase_two(data_dir: Path, geo_project_id: str, platform: str) -> GeoProject:
    platform = normalize_platform(platform)
    project = get_geo_project_detail(data_dir, geo_project_id)
    if not project.knowledge_base_ready or project.current_phase not in {"ready_for_check", "phase_2_pending"}:
        raise ValueError("Knowledge base is not ready for phase two")
    phase_status = ensure_platform_phase_status(project.phase_status or {}, project.platforms)
    platform_status = dict(
        ((phase_status.get("platforms") or {}).get(platform) or {}).get("stage_2") or {}
    )
    phase_status["platforms"][platform]["stage_2"] = {
        **platform_status,
        "status": "pending",
        "label": f"{PLATFORM_LABELS[platform]} 排行榜问题池",
    }
    if not update_geo_project_phase(
        data_dir,
        geo_project_id,
        current_phase="ready_for_check",
        phase_status_json=json.dumps(phase_status, ensure_ascii=False),
    ):
        raise KeyError(geo_project_id)
    return get_geo_project_detail(data_dir, geo_project_id)


def cancel_phase_two(data_dir: Path, geo_project_id: str, platform: str) -> GeoProject:
    platform = normalize_platform(platform)
    project = get_geo_project_detail(data_dir, geo_project_id)
    phase_status = ensure_platform_phase_status(project.phase_status or {}, project.platforms)
    platform_status = dict(
        ((phase_status.get("platforms") or {}).get(platform) or {}).get("stage_2") or {}
    )
    phase_status["platforms"][platform]["stage_2"] = {
        **platform_status,
        "status": "user_deferred",
        "label": f"{PLATFORM_LABELS[platform]} 排行榜问题池",
    }
    if not update_geo_project_phase(
        data_dir,
        geo_project_id,
        current_phase="ready_for_check" if project.knowledge_base_ready else project.current_phase,
        phase_status_json=json.dumps(phase_status, ensure_ascii=False),
    ):
        raise KeyError(geo_project_id)
    return get_geo_project_detail(data_dir, geo_project_id)


def row_to_geo_project(row) -> GeoProject:
    return GeoProject(
        id=row["id"],
        project_id=row["project_id"],
        company_name=row["company_name"],
        industry=row["industry"],
        region=row["region"],
        current_phase=row["current_phase"],
        platforms=normalize_platforms(parse_json(row["platforms"], SUPPORTED_PLATFORMS)),
        knowledge_base_ready=bool(row["knowledge_base_ready"]),
        initial_keywords=parse_json(row["initial_keywords_json"], []),
        phase_status=parse_json(row["phase_status_json"], {}),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def assess_stage_one(profile: Dict[str, Any], entries: Iterable[Any], index_status: Dict[str, Any]) -> Dict[str, Any]:
    filled = sum(1 for field in REQUIRED_STAGE_ONE_FIELDS if has_text(profile.get(field)))
    completeness = round((filled / len(REQUIRED_STAGE_ONE_FIELDS)) * 100)
    entries_count = len(list(entries))
    indexed = int(index_status.get("indexed") or 0)
    failed = int(index_status.get("failed") or 0)
    ready = completeness >= 65 and entries_count > 0 and indexed > 0 and failed == 0
    return {
        "ready": ready,
        "completeness": completeness,
        "entries_count": entries_count,
        "indexed": indexed,
        "failed": failed,
        "missing_fields": [
            field for field in REQUIRED_STAGE_ONE_FIELDS if not has_text(profile.get(field))
        ],
    }


def build_phase_status(
    assessment: Dict[str, Any],
    entries_count: int,
    indexed_count: int,
    platforms: Optional[list[str]] = None,
) -> Dict[str, Any]:
    stage_one_status = "ready_for_check" if assessment["ready"] else "collecting"
    normalized_platforms = normalize_platforms(platforms)
    return {
        "stage_1": {
            "status": stage_one_status,
            "label": "企业知识库构建",
            "knowledge_completeness": assessment["completeness"],
            "entries_count": entries_count,
            "indexed_count": indexed_count,
            "missing_fields": assessment["missing_fields"],
        },
        "platforms": {
            platform: {
                "stage_2": {
                    "status": "not_started",
                    "label": f"{PLATFORM_LABELS[platform]} 排行榜问题池",
                },
                "stage_3": {
                    "status": "not_started",
                    "label": f"{PLATFORM_LABELS[platform]} 高权重信源发现",
                },
            }
            for platform in normalized_platforms
        },
        "stage_3": {"status": "not_started", "label": "高权重信源发现"},
        "stage_4": {"status": "not_started", "label": "咨询/测评支撑内容"},
        "stage_5": {"status": "not_started", "label": "排行榜文章生成"},
        "stage_6": {"status": "not_started", "label": "发布与引用验证"},
        "stage_7": {"status": "not_started", "label": "规则进化"},
    }


def merge_platform_phase_status(
    base: Dict[str, Any],
    existing: Dict[str, Any],
    platforms: list[str],
) -> Dict[str, Any]:
    merged = ensure_platform_phase_status(base, platforms)
    existing_platforms = dict(existing.get("platforms") or {})
    for platform in normalize_platforms(platforms):
        existing_platform_status = dict(existing_platforms.get(platform) or {})
        if existing_platform_status:
            merged["platforms"][platform] = {
                **merged["platforms"][platform],
                **existing_platform_status,
            }

    legacy_stage_two = dict(existing.get("stage_2") or {})
    legacy_status = legacy_stage_two.get("status")
    if legacy_status in {"pending", "user_deferred", "completed"} and not existing_platforms:
        for platform in normalize_platforms(platforms):
            merged["platforms"][platform]["stage_2"] = {
                **merged["platforms"][platform]["stage_2"],
                **legacy_stage_two,
                "label": f"{PLATFORM_LABELS[platform]} 排行榜问题池",
            }
    return merged


def ensure_platform_phase_status(phase_status: Dict[str, Any], platforms: Optional[list[str]] = None) -> Dict[str, Any]:
    normalized_platforms = normalize_platforms(platforms)
    result = dict(phase_status or {})
    result["platforms"] = dict(result.get("platforms") or {})
    for platform in normalized_platforms:
        platform_status = dict(result["platforms"].get(platform) or {})
        platform_status["stage_2"] = {
            "status": "not_started",
            "label": f"{PLATFORM_LABELS[platform]} 排行榜问题池",
            **dict(platform_status.get("stage_2") or {}),
        }
        platform_status.setdefault("stage_3", {
            "status": "not_started",
            "label": f"{PLATFORM_LABELS[platform]} 高权重信源发现",
        })
        platform_status.setdefault("stage_4", {
            "status": "not_started",
            "label": f"{PLATFORM_LABELS[platform]} 咨询/测评支撑内容",
        })
        platform_status.setdefault("stage_5", {
            "status": "not_started",
            "label": f"{PLATFORM_LABELS[platform]} 排行榜文章生成",
        })
        result["platforms"][platform] = platform_status
    return result


def mark_phase_two_completed(
    data_dir: Path,
    geo_project_id: str,
    platform: str,
    question_set_id: Optional[str] = None,
) -> GeoProject:
    platform = normalize_platform(platform)
    project = get_geo_project_detail(data_dir, geo_project_id)
    phase_status = ensure_platform_phase_status(project.phase_status or {}, project.platforms)
    stage_two = dict(phase_status["platforms"][platform].get("stage_2") or {})
    phase_status["platforms"][platform]["stage_2"] = {
        **stage_two,
        "status": "completed",
        "label": f"{PLATFORM_LABELS[platform]} 排行榜问题池",
    }
    if question_set_id:
        phase_status["platforms"][platform]["stage_2"]["question_set_id"] = question_set_id
    stage_three = dict(phase_status["platforms"][platform].get("stage_3") or {})
    if stage_three.get("status") in {None, "", "not_started"}:
        phase_status["platforms"][platform]["stage_3"] = {
            **stage_three,
            "status": "ready",
            "label": f"{PLATFORM_LABELS[platform]} 高权重信源发现",
        }
    if not update_geo_project_phase(
        data_dir,
        geo_project_id,
        current_phase="ready_for_check",
        phase_status_json=json.dumps(phase_status, ensure_ascii=False),
    ):
        raise KeyError(geo_project_id)
    return get_geo_project_detail(data_dir, geo_project_id)


def mark_source_discovery_completed(
    data_dir: Path,
    geo_project_id: str,
    platform: str,
    discovery_id: Optional[str] = None,
) -> GeoProject:
    platform = normalize_platform(platform)
    project = get_geo_project_detail(data_dir, geo_project_id)
    phase_status = ensure_platform_phase_status(project.phase_status or {}, project.platforms)
    stage_three = dict(phase_status["platforms"][platform].get("stage_3") or {})
    phase_status["platforms"][platform]["stage_3"] = {
        **stage_three,
        "status": "completed",
        "label": f"{PLATFORM_LABELS[platform]} 高权重信源发现",
    }
    if discovery_id:
        phase_status["platforms"][platform]["stage_3"]["source_discovery_id"] = discovery_id
    phase_status["platforms"][platform]["stage_4"] = {
        "status": "ready",
        "label": f"{PLATFORM_LABELS[platform]} 咨询/测评支撑内容",
    }
    if not update_geo_project_phase(
        data_dir,
        geo_project_id,
        current_phase="ready_for_check",
        phase_status_json=json.dumps(phase_status, ensure_ascii=False),
    ):
        raise KeyError(geo_project_id)
    return get_geo_project_detail(data_dir, geo_project_id)


def mark_article_draft_generated(
    data_dir: Path,
    geo_project_id: str,
    platform: str,
    article_type: str,
    draft_id: Optional[str] = None,
) -> GeoProject:
    platform = normalize_platform(platform)
    if article_type not in {"consulting", "review", "ranking"}:
        raise ValueError("Unsupported GEO article type")
    project = get_geo_project_detail(data_dir, geo_project_id)
    phase_status = ensure_platform_phase_status(project.phase_status or {}, project.platforms)
    platform_status = phase_status["platforms"][platform]
    stage_four = dict(platform_status.get("stage_4") or {})
    articles = dict(stage_four.get("articles") or {})
    articles[article_type] = {
        "status": "draft",
        "draft_id": draft_id,
    }
    platform_status["stage_4"] = {
        **stage_four,
        "status": "in_progress",
        "label": f"{PLATFORM_LABELS[platform]} 咨询/测评支撑内容",
        "articles": articles,
    }
    if not update_geo_project_phase(
        data_dir,
        geo_project_id,
        current_phase="ready_for_check",
        phase_status_json=json.dumps(phase_status, ensure_ascii=False),
    ):
        raise KeyError(geo_project_id)
    return get_geo_project_detail(data_dir, geo_project_id)


def refresh_article_stage_status(
    data_dir: Path,
    geo_project_id: str,
    platform: str,
    article_statuses: Dict[str, Dict[str, Any]],
) -> GeoProject:
    platform = normalize_platform(platform)
    project = get_geo_project_detail(data_dir, geo_project_id)
    phase_status = ensure_platform_phase_status(project.phase_status or {}, project.platforms)
    platform_status = phase_status["platforms"][platform]
    stage_four = dict(platform_status.get("stage_4") or {})
    articles = dict(stage_four.get("articles") or {})
    for article_type in ("consulting", "review", "ranking"):
        if article_type in article_statuses:
            articles[article_type] = {
                **dict(articles.get(article_type) or {}),
                **article_statuses[article_type],
            }

    consulting_confirmed = (articles.get("consulting") or {}).get("status") == "confirmed"
    review_confirmed = (articles.get("review") or {}).get("status") == "confirmed"
    has_support_draft = any(
        (articles.get(article_type) or {}).get("status") in {"draft", "confirmed", "failed"}
        for article_type in ("consulting", "review")
    )
    stage_status = "completed" if consulting_confirmed and review_confirmed else ("in_progress" if has_support_draft else stage_four.get("status", "ready"))
    platform_status["stage_4"] = {
        **stage_four,
        "status": stage_status,
        "label": f"{PLATFORM_LABELS[platform]} 咨询/测评支撑内容",
        "articles": articles,
    }
    if consulting_confirmed and review_confirmed:
        platform_status["stage_5"] = {
            **dict(platform_status.get("stage_5") or {}),
            "status": "ready",
            "label": f"{PLATFORM_LABELS[platform]} 排行榜文章生成",
        }
    else:
        stage_five = dict(platform_status.get("stage_5") or {})
        if stage_five.get("status") in {"ready", "not_started", None, ""}:
            platform_status["stage_5"] = {
                **stage_five,
                "status": "not_started",
                "label": f"{PLATFORM_LABELS[platform]} 排行榜文章生成",
            }

    if not update_geo_project_phase(
        data_dir,
        geo_project_id,
        current_phase="ready_for_check",
        phase_status_json=json.dumps(phase_status, ensure_ascii=False),
    ):
        raise KeyError(geo_project_id)
    return get_geo_project_detail(data_dir, geo_project_id)


def normalize_platforms(platforms: Optional[Any] = None) -> list[str]:
    raw_platforms = platforms if isinstance(platforms, list) else []
    normalized = []
    for platform in raw_platforms or SUPPORTED_PLATFORMS:
        if platform in SUPPORTED_PLATFORMS and platform not in normalized:
            normalized.append(platform)
    return normalized or list(SUPPORTED_PLATFORMS)


def normalize_platform(platform: str) -> str:
    if platform not in SUPPORTED_PLATFORMS:
        raise ValueError("Unsupported GEO platform")
    return platform


def build_initial_keywords(profile: Dict[str, Any]) -> list[str]:
    target_keywords = split_keywords(profile.get("target_keywords"))
    if target_keywords:
        return target_keywords[:5]
    region = first_region(profile.get("business_regions"))
    industry = clean_text(profile.get("industry") or profile.get("main_business"))
    subject = clean_text(profile.get("short_name") or profile.get("company_name"))
    candidates = [
        "".join(part for part in [region, industry] if part),
        "".join(part for part in [region, industry, "公司"] if part),
        "".join(part for part in [region, industry, "推荐"] if part),
        "".join(part for part in [region, subject] if part),
        "".join(part for part in [region, subject, industry] if part),
    ]
    seen = []
    for candidate in candidates:
        normalized = candidate.strip()
        if normalized and normalized not in seen:
            seen.append(normalized)
    return seen[:5]


def split_keywords(value: Any) -> list[str]:
    text = clean_text(value)
    if not text:
        return []
    keywords = []
    for item in text.replace("|", "\n").replace("，", "\n").replace(",", "\n").replace("、", "\n").splitlines():
        keyword = item.strip(" ：:;；")
        if keyword and keyword not in keywords:
            keywords.append(keyword)
    return keywords


def first_region(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return ""
    return text.replace("，", "\n").replace(",", "\n").replace("、", "\n").splitlines()[0].strip()


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def has_text(value: Any) -> bool:
    text = clean_text(value)
    return bool(text and text not in {"待补充", "未填", "未填写", "企业知识库草稿"})


def parse_json(raw: str, fallback):
    try:
        return json.loads(raw or "")
    except json.JSONDecodeError:
        return fallback
