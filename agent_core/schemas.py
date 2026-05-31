from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    ok: bool = True
    service: str = "geo-agent-backend"


class SearchContext(BaseModel):
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: Optional[str] = None
    selected_model: Optional[str] = None
    skill_id: Optional[str] = None
    deep_thinking: Optional[bool] = None
    web_search: Optional[bool] = None
    search_context: Optional[SearchContext] = None
    project_id: Optional[str] = None


class SourceCitation(BaseModel):
    title: str
    url: str
    logo_url: Optional[str] = None
    start_index: Optional[int] = None
    end_index: Optional[int] = None


class ChatResponse(BaseModel):
    role: str
    content: str
    conversation_id: str
    provider: str = "local"
    model: str = "local-fallback"
    error: Optional[str] = None
    sources: List[SourceCitation] = Field(default_factory=list)
    search_queries: List[str] = Field(default_factory=list)
    search_actions: List[Dict[str, Any]] = Field(default_factory=list)
    search_usage: Dict[str, Any] = Field(default_factory=dict)
    reasoning_content: Optional[str] = None


class ProviderStatus(BaseModel):
    provider: str
    configured: bool
    model: str
    base_url: str


class ConfigStatusResponse(BaseModel):
    providers: Dict[str, ProviderStatus]


class Project(BaseModel):
    id: str
    name: str
    company_name: Optional[str] = None
    industry: Optional[str] = None
    region: Optional[str] = None
    status: str


class ProjectsResponse(BaseModel):
    projects: List[Project]


class GeoProjectEnsureRequest(BaseModel):
    project_id: str = Field(min_length=1)
    platforms: List[str] = Field(default_factory=lambda: ["doubao", "deepseek"])


class GeoProject(BaseModel):
    id: str
    project_id: str
    company_name: str
    industry: Optional[str] = None
    region: Optional[str] = None
    current_phase: str
    platforms: List[str] = Field(default_factory=list)
    knowledge_base_ready: bool = False
    initial_keywords: List[str] = Field(default_factory=list)
    phase_status: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class GeoProjectsResponse(BaseModel):
    projects: List[GeoProject]


class GeoReport(BaseModel):
    id: str
    geo_project_id: str
    enterprise_project_id: str
    platform: str
    status: str
    report: Dict[str, Any] = Field(default_factory=dict)
    markdown: str = ""
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class GeoQuestionSet(BaseModel):
    id: str
    geo_project_id: str
    enterprise_project_id: str
    platform: str
    questions: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class GeoSourceDiscovery(BaseModel):
    id: str
    geo_project_id: str
    enterprise_project_id: str
    platform: str
    discovery: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class GeoSourceDiscoveryRunRequest(BaseModel):
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    parent_message_id: Optional[str] = None
    fallback_report: Optional[Dict[str, Any]] = None


class GeoArticleDraftActionRequest(BaseModel):
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    parent_message_id: Optional[str] = None


class GeoArticleDraft(BaseModel):
    id: str
    geo_project_id: str
    enterprise_project_id: str
    platform: str
    article_type: str
    status: str
    draft: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class GeoArticleDraftRunRequest(BaseModel):
    message_id: Optional[str] = None
    topic: Optional[str] = None
    target_question: Optional[str] = None


class GeoSupportArticleRunRequest(BaseModel):
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    parent_message_id: Optional[str] = None


class GeoSupportArticleRunResponse(BaseModel):
    geo_project_id: str
    enterprise_project_id: str
    platform: str
    status: str
    consulting_draft: Optional[GeoArticleDraft] = None
    review_draft: Optional[GeoArticleDraft] = None
    error_message: Optional[str] = None


class GeoArticleDraftUpdateRequest(BaseModel):
    draft: Dict[str, Any] = Field(default_factory=dict)
    message_id: Optional[str] = None


class GeoStageStatus(BaseModel):
    stage: int
    key: str
    label: str
    status: str
    description: str = ""
    artifact_id: Optional[str] = None
    artifacts: Dict[str, Any] = Field(default_factory=dict)


class GeoPlatformWorkflowState(BaseModel):
    platform: str
    label: str
    stages: Dict[str, GeoStageStatus] = Field(default_factory=dict)


class GeoWorkflowState(BaseModel):
    geo_project_id: str
    enterprise_project_id: str
    company_name: str
    current_phase: str
    knowledge_base_ready: bool
    stage_1: GeoStageStatus
    platforms: Dict[str, GeoPlatformWorkflowState] = Field(default_factory=dict)


class ConversationSummary(BaseModel):
    id: str
    project_id: Optional[str] = None
    title: str
    message_count: int = 0
    last_message: Optional[str] = None
    created_at: str
    updated_at: str


class ConversationMessage(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ConversationsResponse(BaseModel):
    conversations: List[ConversationSummary]


class ConversationDetailResponse(BaseModel):
    conversation: ConversationSummary
    messages: List[ConversationMessage]


class GeoPhaseTwoPromptRequest(BaseModel):
    conversation_id: Optional[str] = None


class GeoPhaseTwoPromptResponse(BaseModel):
    conversation_id: str
    message: ConversationMessage


class GeoPhaseTwoActionRequest(BaseModel):
    message_id: Optional[str] = None


class KnowledgeEntryCreateRequest(BaseModel):
    content: str = Field(min_length=1)
    title: Optional[str] = None
    project_id: Optional[str] = None
    source_type: str = "chat"


class EnterpriseProfileRequest(BaseModel):
    id: Optional[str] = None
    project_id: Optional[str] = None
    company_name: str = Field(min_length=1)
    short_name: Optional[str] = None
    industry: Optional[str] = None
    main_business: Optional[str] = None
    official_website: Optional[str] = None
    official_media: Optional[str] = None
    detailed_intro: Optional[str] = None
    brand_story: Optional[str] = None
    products_services: Optional[str] = None
    product_features: Optional[str] = None
    user_pain_points: Optional[str] = None
    trust_endorsements: Optional[str] = None
    brand_authorization_pricing: Optional[str] = None
    cases: Optional[str] = None
    business_regions: Optional[str] = None
    customer_service_phone: Optional[str] = None
    current_pain_points: Optional[str] = None
    core_advantages: Optional[str] = None
    extra_info: Optional[str] = None
    image_notes: Optional[str] = None
    target_keywords: Optional[str] = None


class EnterpriseProfile(EnterpriseProfileRequest):
    id: str
    generated_long_tail_keywords: Optional[str] = None
    entry_count: int = 0
    created_at: str
    updated_at: str


class EnterpriseProfilesResponse(BaseModel):
    profiles: List[EnterpriseProfile]


class EnterpriseProfileDetailResponse(BaseModel):
    profile: EnterpriseProfile
    entries: List["KnowledgeEntry"]
    total: int
    index_status: Optional["KnowledgeIndexStatusResponse"] = None


class KnowledgeEntrySearchRequest(BaseModel):
    query: str = Field(min_length=1)
    project_id: Optional[str] = None
    limit: int = 10


class KnowledgeEntry(BaseModel):
    id: str
    project_id: Optional[str] = None
    parent_id: Optional[str] = None
    title: str
    content: str
    source_type: str
    metadata: Dict[str, Any]
    chunk_index: int = 0
    embedding_status: str = "pending"
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class KnowledgeEntriesResponse(BaseModel):
    entries: List[KnowledgeEntry]
    total: int


class KnowledgeAssetCreateRequest(BaseModel):
    project_id: str = Field(min_length=1)
    filename: str = Field(min_length=1)
    content_type: Optional[str] = None
    content_base64: str = Field(min_length=1)


class KnowledgeDraftAssetInput(BaseModel):
    filename: str = Field(min_length=1)
    content_type: Optional[str] = None
    content_base64: str = Field(min_length=1)


class KnowledgeDraftCreateRequest(BaseModel):
    message: Optional[str] = None
    conversation_id: Optional[str] = None
    intent: str = "create"
    project_id: Optional[str] = None
    skill_id: Optional[str] = None
    assets: List[KnowledgeDraftAssetInput] = Field(default_factory=list)


class KnowledgeDraftConfirmRequest(BaseModel):
    profile: Optional[EnterpriseProfileRequest] = None


class KnowledgeDraftAsset(BaseModel):
    id: str
    draft_id: str
    filename: str
    content_type: Optional[str] = None
    file_path: str
    status: str
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class KnowledgeDraft(BaseModel):
    id: str
    intent: str
    project_id: Optional[str] = None
    conversation_id: Optional[str] = None
    assistant_message_id: Optional[str] = None
    status: str
    profile: EnterpriseProfileRequest
    missing_fields: List[str] = Field(default_factory=list)
    confidence: Dict[str, Any] = Field(default_factory=dict)
    source_summary: Dict[str, Any] = Field(default_factory=dict)
    assets: List[KnowledgeDraftAsset] = Field(default_factory=list)
    created_at: str
    updated_at: str


class KnowledgeDraftConfirmResponse(BaseModel):
    ok: bool = True
    project_id: str
    profile: EnterpriseProfile
    entries: List["KnowledgeEntry"]
    total: int
    index_status: Optional["KnowledgeIndexStatusResponse"] = None


class KnowledgeAsset(BaseModel):
    id: str
    project_id: str
    filename: str
    content_type: Optional[str] = None
    file_path: str
    source_type: str
    status: str
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class KnowledgeAssetResponse(BaseModel):
    asset: KnowledgeAsset
    entries: List[KnowledgeEntry]
    total: int


class KnowledgeRetrievalResult(BaseModel):
    id: str
    project_id: str
    title: str
    content: str
    source_type: str
    score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class KnowledgeIndexStatusResponse(BaseModel):
    project_id: Optional[str] = None
    embedding_model: str
    vector_backend: str
    embedding_backend: str
    pending: int
    indexed: int
    failed: int
    asset_count: int
    assets: List[KnowledgeAsset] = Field(default_factory=list)
