import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from agent_core.db import (
    add_knowledge_entry,
    count_knowledge_entries,
    delete_geo_projects_for_enterprise,
    delete_enterprise_profile,
    delete_enterprise_profile_entries,
    get_enterprise_profile,
    list_enterprise_profiles,
    list_knowledge_entries,
    upsert_enterprise_profile,
)
from agent_core.schemas import (
    EnterpriseProfile,
    EnterpriseProfileDetailResponse,
    EnterpriseProfileRequest,
    EnterpriseProfilesResponse,
    KnowledgeEntriesResponse,
)


PROFILE_FIELD_TITLES = {
    "company_name": "公司名称",
    "short_name": "公司简称",
    "industry": "所属行业",
    "main_business": "主营业务",
    "official_website": "官方网站",
    "official_media": "官方自媒体",
    "detailed_intro": "企业详细介绍",
    "brand_story": "品牌故事",
    "products_services": "产品/服务介绍",
    "product_features": "产品/服务特点",
    "user_pain_points": "用户痛点与用户画像",
    "trust_endorsements": "信任背书",
    "brand_authorization_pricing": "品牌授权与客单价",
    "cases": "行业/客户案例",
    "business_regions": "业务区域范围",
    "customer_service_phone": "客服办公电话",
    "current_pain_points": "目前痛点/现状",
    "core_advantages": "核心优势与特色",
    "extra_info": "其他信息补充",
    "image_notes": "图片内容说明",
    "target_keywords": "目标关键词",
    "generated_long_tail_keywords": "长尾语义词",
}


def dump_model(model) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


LONG_TAIL_EXPANSION_LIMIT = 30
BASE_KEYWORD_LIMIT = 8
QUESTION_KEYWORD_MARKERS = {
    "哪家",
    "哪里",
    "怎么",
    "如何",
    "为什么",
    "推荐",
    "排行榜",
    "排名",
    "口碑",
    "靠谱",
    "支持",
    "选择",
}


def generate_long_tail_keywords(raw_keywords: str, region_hint: str = "") -> str:
    keywords = parse_keyword_lines(raw_keywords)
    region = extract_region_prefix(region_hint)
    base_keywords = [keyword for keyword in keywords if should_expand_keyword(keyword)][:BASE_KEYWORD_LIMIT]

    rows = []
    seen = set()
    for keyword in base_keywords:
        variants = [
            f"{keyword}哪家好",
            f"{keyword}公司推荐",
            f"{keyword}怎么选",
        ]
        if region and region not in keyword:
            regional = f"{region}{keyword}"
            variants.extend([
                f"{regional}哪家好",
                f"{regional}供应商推荐",
            ])
        for variant in variants:
            row = f"{keyword} | {variant}"
            if row not in seen:
                seen.add(row)
                rows.append(row)
            if len(rows) >= LONG_TAIL_EXPANSION_LIMIT:
                return "\n".join(rows)

    return "\n".join(rows)


def parse_keyword_lines(raw_keywords: str) -> list[str]:
    keywords = []
    for line in re.split(r"[\n,，、;；|]+", raw_keywords or ""):
        keyword = line.strip().strip("|").strip()
        if not keyword or keyword in {"关键词", "目标关键词", "长尾语义词"}:
            continue
        if "|" in keyword:
            keyword = keyword.split("|", 1)[0].strip()
        keyword = re.sub(r"^\d+[）).、]\s*", "", keyword).strip()
        keyword = re.sub(r"\s+", "", keyword)
        if keyword and keyword not in keywords:
            keywords.append(keyword)
    return keywords


def should_expand_keyword(keyword: str) -> bool:
    if len(keyword) > 24:
        return False
    return not any(marker in keyword for marker in QUESTION_KEYWORD_MARKERS)


def extract_region_prefix(region_hint: str) -> str:
    text = re.sub(r"\s+", "", region_hint or "")
    if not text:
        return ""
    for pattern in [
        r"[\u4e00-\u9fa5]{2,8}(?:市|区|县)",
        r"[\u4e00-\u9fa5]{2,8}(?:省|自治区)",
        r"(?:华东|华南|华中|华北|西南|西北|东北)地区?",
    ]:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return ""


def profile_to_knowledge_sections(profile: EnterpriseProfileRequest, long_tail_keywords: str) -> list[tuple[str, str]]:
    data = dump_model(profile)
    data["generated_long_tail_keywords"] = long_tail_keywords
    sections = []
    for key, title in PROFILE_FIELD_TITLES.items():
        value = data.get(key)
        if value is None:
            continue
        content = str(value).strip()
        if not content:
            continue
        sections.append((title, content))
    return sections


def row_to_dict(row) -> Dict[str, Any]:
    return dict(row)


def row_to_knowledge_entry(row) -> dict:
    metadata = {}
    try:
        metadata = json.loads(row["metadata"] or "{}")
    except json.JSONDecodeError:
        metadata = {}
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "parent_id": row["parent_id"] if "parent_id" in row.keys() else None,
        "title": row["title"],
        "content": row["content"],
        "source_type": row["source_type"],
        "metadata": metadata,
        "chunk_index": int(row["chunk_index"] if "chunk_index" in row.keys() else 0),
        "embedding_status": row["embedding_status"] if "embedding_status" in row.keys() else "pending",
        "error_message": row["error_message"] if "error_message" in row.keys() else None,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def row_to_profile(row) -> EnterpriseProfile:
    data = row_to_dict(row)
    data["entry_count"] = int(data.get("entry_count") or 0)
    return EnterpriseProfile(**data)


PLACEHOLDER_VALUES = {
    "",
    "待补充",
    "未填",
    "未填写",
    "企业知识库草稿",
}


def is_placeholder_value(value: Optional[str]) -> bool:
    if value is None:
        return True
    normalized = str(value).strip()
    if normalized in PLACEHOLDER_VALUES:
        return True
    return normalized.startswith("这是通过智能助手知识库录入技能自动创建的草稿")


def first_match(text: str, patterns: list[str]) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, re.MULTILINE)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip(" ：:，,。；;")
    return ""


def collect_section(text: str, headings: list[str], max_chars: int = 1200) -> str:
    escaped = "|".join(re.escape(heading) for heading in headings)
    pattern = rf"(?:^|\n)\s*(?:\d+[）).、]\s*)?(?:{escaped})\s*[：:\n]\s*(.*?)(?=\n\s*(?:\d+[）).、]\s*)?[\u4e00-\u9fa5A-Za-z /（）()、]+[：:]\s*|\Z)"
    match = re.search(pattern, text, re.S)
    if not match:
        return ""
    content = re.sub(r"\n{3,}", "\n\n", match.group(1)).strip()
    return content[:max_chars]


PROFILE_FIELD_ALIASES = {
    "project_id": ["project_id", "项目ID"],
    "company_name": ["company_name", "公司名称", "企业名称", "品牌名称"],
    "short_name": ["short_name", "公司简称", "简称", "品牌简称"],
    "industry": ["industry", "所属行业", "行业"],
    "main_business": ["main_business", "主营业务", "业务范围"],
    "official_website": ["official_website", "官方网站", "官网"],
    "official_media": ["official_media", "官方自媒体", "自媒体"],
    "detailed_intro": ["detailed_intro", "企业详细介绍", "企业介绍", "公司介绍"],
    "brand_story": ["brand_story", "品牌故事"],
    "products_services": ["products_services", "产品/服务介绍", "产品服务介绍", "产品介绍", "服务介绍"],
    "product_features": ["product_features", "产品/服务特点", "产品特点", "服务特点", "产品优势"],
    "user_pain_points": ["user_pain_points", "用户痛点", "客户痛点", "用户画像"],
    "trust_endorsements": ["trust_endorsements", "信任背书", "资质荣誉", "资质", "荣誉"],
    "brand_authorization_pricing": ["brand_authorization_pricing", "品牌授权与客单价", "品牌授权", "客单价"],
    "cases": ["cases", "行业/客户案例", "客户案例", "案例"],
    "business_regions": ["business_regions", "业务区域范围", "业务区域", "服务区域"],
    "customer_service_phone": ["customer_service_phone", "客服办公电话", "客服电话", "联系电话"],
    "current_pain_points": ["current_pain_points", "目前痛点/现状", "现状", "当前痛点"],
    "core_advantages": ["core_advantages", "核心优势与特色", "核心优势", "特色"],
    "extra_info": ["extra_info", "其他信息补充", "补充信息"],
    "image_notes": ["image_notes", "图片内容", "图片说明"],
    "target_keywords": ["target_keywords", "想要推广的关键词", "目标关键词", "关键词"],
}


def clean_profile_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, list):
        value = "\n".join(str(item).strip() for item in value if str(item).strip())
    elif isinstance(value, dict):
        value = "\n".join(
            f"{key}：{item}" for key, item in value.items() if str(item).strip()
        )
    text = str(value).strip()
    return text or None


def enterprise_profile_from_mapping(data: Dict[str, Any], project_id: str) -> EnterpriseProfileRequest:
    normalized: Dict[str, Any] = {"project_id": project_id}
    for field, aliases in PROFILE_FIELD_ALIASES.items():
        if field == "project_id":
            continue
        for alias in aliases:
            if alias in data:
                normalized[field] = clean_profile_text(data.get(alias))
                break

    if not normalized.get("company_name"):
        normalized["company_name"] = "企业知识库草稿"
    if not normalized.get("short_name") and str(normalized["company_name"]).endswith("有限公司"):
        normalized["short_name"] = str(normalized["company_name"]).replace("有限公司", "")

    return EnterpriseProfileRequest(**normalized)


def infer_enterprise_profile_from_text(text: str, project_id: str) -> EnterpriseProfileRequest:
    normalized = text.replace("\r\n", "\n")
    company_name = first_match(normalized, [
        r"公司名称\s*[：:]\s*([^\n]+)",
        r"企业名称\s*[：:]\s*([^\n]+)",
        r"品牌名称\s*[：:]\s*([^\n]+)",
        r"([\u4e00-\u9fa5A-Za-z0-9（）()·\-]{4,40}(?:有限公司|有限责任公司|股份有限公司))",
    ])
    short_name = first_match(normalized, [
        r"公司简称\s*[：:]\s*([^\n]+)",
        r"简称\s*[：:]\s*([^\n]+)",
        r"品牌简称\s*[：:]\s*([^\n]+)",
    ])
    industry = first_match(normalized, [
        r"所属行业\s*[：:]\s*([^\n]+)",
        r"行业\s*[：:]\s*([^\n]+)",
    ])
    main_business = first_match(normalized, [
        r"主营业务\s*[：:]\s*([^\n]+)",
        r"主营\s*[：:]\s*([^\n]+)",
        r"业务范围\s*[：:]\s*([^\n]+)",
    ])
    official_website = first_match(normalized, [r"(https?://[^\s，,。；;）)]+)"])

    if not company_name:
        company_name = "企业知识库草稿"
    if not short_name and company_name.endswith("有限公司"):
        short_name = company_name.replace("有限公司", "")

    detailed_intro = collect_section(normalized, ["企业详细介绍", "企业介绍", "公司介绍", "品牌介绍"], 1800)
    products_services = collect_section(normalized, ["产品/服务介绍", "产品服务介绍", "产品介绍", "服务介绍", "产品/服务"], 1800)
    product_features = collect_section(normalized, ["产品/服务特点", "产品特点", "服务特点", "核心优势", "产品优势"], 1200)
    user_pain_points = collect_section(normalized, ["用户痛点", "客户痛点", "用户画像", "客户画像"], 1200)
    trust_endorsements = collect_section(normalized, ["信任背书", "资质", "荣誉", "认证", "行业影响力"], 1200)
    cases = collect_section(normalized, ["行业/客户案例", "客户案例", "合作案例", "案例"], 1200)
    business_regions = collect_section(normalized, ["业务区域范围", "业务区域", "服务区域", "经营区域"], 600)
    target_keywords = collect_section(normalized, ["目标关键词", "关键词", "核心关键词"], 800)

    return EnterpriseProfileRequest(
        project_id=project_id,
        company_name=company_name,
        short_name=short_name or None,
        industry=industry or None,
        main_business=main_business or None,
        official_website=official_website or None,
        detailed_intro=detailed_intro or normalized[:1200],
        products_services=products_services or None,
        product_features=product_features or None,
        user_pain_points=user_pain_points or None,
        trust_endorsements=trust_endorsements or None,
        cases=cases or None,
        business_regions=business_regions or None,
        target_keywords=target_keywords or None,
    )


def merge_profile_values(existing: Optional[Dict[str, Any]], inferred: EnterpriseProfileRequest) -> EnterpriseProfileRequest:
    inferred_data = dump_model(inferred)
    merged: Dict[str, Any] = {}
    existing = existing or {}
    for field in PROFILE_FIELD_TITLES:
        current = existing.get(field)
        candidate = inferred_data.get(field)
        if is_placeholder_value(current) and candidate:
            merged[field] = candidate
        else:
            merged[field] = current or candidate
    merged["id"] = existing.get("id") or inferred_data.get("id")
    merged["project_id"] = existing.get("project_id") or inferred_data.get("project_id")
    return EnterpriseProfileRequest(**{key: value for key, value in merged.items() if key != "generated_long_tail_keywords"})


def rebuild_enterprise_profile_from_document(data_dir: Path, project_id: str, text: str) -> KnowledgeEntriesResponse:
    existing_row = get_enterprise_profile(data_dir, project_id)
    existing = row_to_dict(existing_row) if existing_row else {}
    inferred = infer_enterprise_profile_from_text(text, project_id)
    payload = merge_profile_values(existing, inferred)
    return save_enterprise_profile(data_dir, payload)


def rebuild_enterprise_profile_from_mapping(
    data_dir: Path,
    project_id: str,
    data: Dict[str, Any],
) -> KnowledgeEntriesResponse:
    existing_row = get_enterprise_profile(data_dir, project_id)
    existing = row_to_dict(existing_row) if existing_row else {}
    inferred = enterprise_profile_from_mapping(data, project_id)
    payload = merge_profile_values(existing, inferred)
    return save_enterprise_profile(data_dir, payload)


def save_enterprise_profile(data_dir: Path, payload: EnterpriseProfileRequest) -> KnowledgeEntriesResponse:
    # 企业事实层变化后，下游平台阶段产物必须重新生成，避免旧问题池/信源把流程带到后续阶段。
    if payload.project_id:
        delete_geo_projects_for_enterprise(data_dir, payload.project_id)
    region_hint = payload.business_regions or ""
    long_tail_keywords = generate_long_tail_keywords(payload.target_keywords or "", region_hint)
    profile_data = dump_model(payload)
    profile_data["generated_long_tail_keywords"] = long_tail_keywords
    profile_id = upsert_enterprise_profile(data_dir, profile_data)

    delete_enterprise_profile_entries(data_dir, payload.project_id)
    for title, content in profile_to_knowledge_sections(payload, long_tail_keywords):
        add_knowledge_entry(
            data_dir,
            title=f"{payload.company_name} - {title}",
            content=content,
            project_id=payload.project_id,
            source_type="enterprise_profile",
            metadata=json.dumps({"profile_id": profile_id, "field": title}, ensure_ascii=False),
        )

    rows = list_knowledge_entries(data_dir, payload.project_id, limit=50)
    return KnowledgeEntriesResponse(
        entries=[row_to_knowledge_entry(row) for row in rows],
        total=count_knowledge_entries(data_dir, payload.project_id),
    )


def list_profiles(data_dir: Path) -> EnterpriseProfilesResponse:
    return EnterpriseProfilesResponse(
        profiles=[row_to_profile(row) for row in list_enterprise_profiles(data_dir)]
    )


def get_profile_detail(data_dir: Path, project_id: str) -> EnterpriseProfileDetailResponse:
    row = get_enterprise_profile(data_dir, project_id)
    if row is None:
        raise KeyError(project_id)
    rows = list_knowledge_entries(data_dir, project_id, limit=200)
    return EnterpriseProfileDetailResponse(
        profile=row_to_profile(row),
        entries=[row_to_knowledge_entry(entry) for entry in rows],
        total=count_knowledge_entries(data_dir, project_id),
    )


def delete_profile(data_dir: Path, project_id: str) -> None:
    delete_geo_projects_for_enterprise(data_dir, project_id)
    delete_enterprise_profile(data_dir, project_id)


def build_knowledge_context(rows: Iterable, max_chars: int = 6000) -> str:
    parts = []
    total_chars = 0
    for index, row in enumerate(rows, start=1):
        title = row["title"] or f"知识条目 {index}"
        content = " ".join((row["content"] or "").split())
        if not content:
            continue
        block = f"[{index}] {title}\n{content}"
        next_total = total_chars + len(block)
        if next_total > max_chars:
            remaining = max_chars - total_chars
            if remaining > 120:
                parts.append(block[:remaining])
            break
        parts.append(block)
        total_chars = next_total

    return "\n\n".join(parts)
