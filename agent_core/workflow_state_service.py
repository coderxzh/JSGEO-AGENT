from pathlib import Path
from typing import Any, Dict, Optional

from agent_core.db import (
    get_latest_geo_article_draft,
    get_latest_geo_question_set,
    get_latest_geo_report,
    get_latest_geo_source_discovery,
)
from agent_core.geo_project_service import PLATFORM_LABELS, get_geo_project_detail, normalize_platforms
from agent_core.schemas import GeoPlatformWorkflowState, GeoStageStatus, GeoWorkflowState


def get_geo_workflow_state(data_dir: Path, geo_project_id: str) -> GeoWorkflowState:
    project = get_geo_project_detail(data_dir, geo_project_id)
    stage_one_status = "completed" if project.knowledge_base_ready else "in_progress"
    stage_one = GeoStageStatus(
        stage=1,
        key="stage_1",
        label="企业事实知识库",
        status=stage_one_status,
        description="企业事实知识库已可用于各平台 GEO 流程。" if project.knowledge_base_ready else "继续补齐企业资料、附件和索引。",
        artifacts={
            "enterprise_project_id": project.project_id,
            **dict((project.phase_status or {}).get("stage_1") or {}),
        },
    )

    platforms: Dict[str, GeoPlatformWorkflowState] = {}
    for platform in normalize_platforms(project.platforms):
        platforms[platform] = build_platform_state(data_dir, project, platform)

    return GeoWorkflowState(
        geo_project_id=project.id,
        enterprise_project_id=project.project_id,
        company_name=project.company_name,
        current_phase=project.current_phase,
        knowledge_base_ready=project.knowledge_base_ready,
        stage_1=stage_one,
        platforms=platforms,
    )


def build_platform_state(data_dir: Path, project, platform: str) -> GeoPlatformWorkflowState:
    label = PLATFORM_LABELS.get(platform, platform)
    platform_status = dict(((project.phase_status or {}).get("platforms") or {}).get(platform) or {})
    question_set = get_latest_geo_question_set(data_dir, project.id, platform)
    legacy_report = get_latest_geo_report(data_dir, project.id, platform)
    source_discovery = get_latest_geo_source_discovery(data_dir, project.id, platform)
    consulting = get_latest_geo_article_draft(data_dir, project.id, platform, "consulting")
    review = get_latest_geo_article_draft(data_dir, project.id, platform, "review")
    ranking = get_latest_geo_article_draft(data_dir, project.id, platform, "ranking")

    stage_2 = build_stage_two(label, platform_status, question_set, legacy_report)
    stage_3 = build_stage_three(label, platform_status, stage_2, source_discovery)
    stage_4 = build_stage_four(label, platform_status, stage_3, consulting, review)
    stage_5 = build_stage_five(label, platform_status, stage_4, ranking)

    return GeoPlatformWorkflowState(
        platform=platform,
        label=label,
        stages={
            "stage_2": stage_2,
            "stage_3": stage_3,
            "stage_4": stage_4,
            "stage_5": stage_5,
            "stage_6": GeoStageStatus(
                stage=6,
                key="stage_6",
                label=f"{label} 发布与引用验证",
                status="not_started",
                description="等待排行榜文章完成后再进入发布与引用验证。",
            ),
            "stage_7": GeoStageStatus(
                stage=7,
                key="stage_7",
                label=f"{label} 规则进化",
                status="not_started",
                description="等待引用验证结果沉淀后再更新平台规则。",
            ),
        },
    )


def build_stage_two(label: str, platform_status: Dict[str, Any], question_set, legacy_report) -> GeoStageStatus:
    saved = dict(platform_status.get("stage_2") or {})
    if question_set is not None:
        return GeoStageStatus(
            stage=2,
            key="stage_2",
            label=f"{label} 排行榜问题池",
            status="completed",
            description="已生成平台独立问题池，可进入高权重信源发现。",
            artifact_id=question_set["id"],
            artifacts={"question_set_id": question_set["id"]},
        )
    if legacy_report is not None and legacy_report["status"] == "completed":
        return GeoStageStatus(
            stage=2,
            key="stage_2",
            label=f"{label} 排行榜问题池",
            status="completed",
            description="已存在旧阶段二结果，可兼容进入高权重信源发现。",
            artifact_id=legacy_report["id"],
            artifacts={"legacy_report_id": legacy_report["id"]},
        )
    status = str(saved.get("status") or "not_started")
    description = {
        "pending": "已确认进入阶段二，等待生成排行榜问题池。",
        "user_deferred": "用户已暂缓，可稍后重新启动问题池构建。",
    }.get(status, "阶段一完成后可启动排行榜问题池构建。")
    return GeoStageStatus(
        stage=2,
        key="stage_2",
        label=f"{label} 排行榜问题池",
        status=status,
        description=description,
        artifact_id=str(saved.get("question_set_id") or "") or None,
        artifacts=saved,
    )


def build_stage_three(label: str, platform_status: Dict[str, Any], stage_2: GeoStageStatus, source_discovery) -> GeoStageStatus:
    saved = dict(platform_status.get("stage_3") or {})
    if source_discovery is not None:
        return GeoStageStatus(
            stage=3,
            key="stage_3",
            label=f"{label} 高权重信源发现",
            status="completed",
            description="已完成信源发现，可进入阶段四支撑内容生成。",
            artifact_id=source_discovery["id"],
            artifacts={"source_discovery_id": source_discovery["id"]},
        )
    if stage_2.status == "completed":
        return GeoStageStatus(
            stage=3,
            key="stage_3",
            label=f"{label} 高权重信源发现",
            status="ready",
            description="排行榜问题池已完成，可启动高权重信源发现。",
            artifacts=saved,
        )
    return GeoStageStatus(
        stage=3,
        key="stage_3",
        label=f"{label} 高权重信源发现",
        status=str(saved.get("status") or "not_started"),
        description="等待排行榜问题池完成。",
        artifacts=saved,
    )


def build_stage_four(label: str, platform_status: Dict[str, Any], stage_3: GeoStageStatus, consulting, review) -> GeoStageStatus:
    saved = dict(platform_status.get("stage_4") or {})
    article_artifacts = {
        "consulting": article_artifact(consulting),
        "review": article_artifact(review),
    }
    consulting_confirmed = consulting is not None and consulting["status"] == "confirmed"
    review_confirmed = review is not None and review["status"] == "confirmed"
    has_any_draft = consulting is not None or review is not None
    if consulting_confirmed and review_confirmed:
        status = "completed"
        description = "咨询类和测评类支撑草稿均已确认，可进入排行榜文章生成。"
    elif has_any_draft:
        status = "in_progress"
        description = "支撑草稿已生成，需确认咨询类和测评类草稿后才能进入阶段五。"
    elif stage_3.status == "completed":
        status = "ready"
        description = "信源发现已完成，可生成咨询类和测评类支撑草稿。"
    else:
        status = str(saved.get("status") or "not_started")
        description = "等待高权重信源发现完成。"
    return GeoStageStatus(
        stage=4,
        key="stage_4",
        label=f"{label} 咨询/测评支撑内容",
        status=status,
        description=description,
        artifacts={**saved, "articles": article_artifacts},
    )


def build_stage_five(label: str, platform_status: Dict[str, Any], stage_4: GeoStageStatus, ranking) -> GeoStageStatus:
    saved = dict(platform_status.get("stage_5") or {})
    if ranking is not None:
        return GeoStageStatus(
            stage=5,
            key="stage_5",
            label=f"{label} 排行榜文章生成",
            status="completed" if ranking["status"] == "confirmed" else "in_progress",
            description="排行榜文章草稿已生成。" if ranking["status"] != "confirmed" else "排行榜文章已确认。",
            artifact_id=ranking["id"],
            artifacts={"ranking": article_artifact(ranking)},
        )
    if stage_4.status == "completed":
        return GeoStageStatus(
            stage=5,
            key="stage_5",
            label=f"{label} 排行榜文章生成",
            status="ready",
            description="支撑内容已确认，可启动排行榜文章生成。",
            artifacts=saved,
        )
    return GeoStageStatus(
        stage=5,
        key="stage_5",
        label=f"{label} 排行榜文章生成",
        status="not_started",
        description="等待咨询类和测评类支撑草稿确认完成。",
        artifacts=saved,
    )


def article_artifact(row) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    return {
        "draft_id": row["id"],
        "status": row["status"],
        "article_type": row["article_type"],
    }
