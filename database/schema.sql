CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    industry TEXT,
    region TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    title TEXT NOT NULL DEFAULT '本地对话',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_bases (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    name TEXT NOT NULL,
    source_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enterprise_profiles (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    company_name TEXT NOT NULL,
    short_name TEXT,
    industry TEXT,
    main_business TEXT,
    official_website TEXT,
    official_media TEXT,
    detailed_intro TEXT,
    brand_story TEXT,
    products_services TEXT,
    product_features TEXT,
    user_pain_points TEXT,
    trust_endorsements TEXT,
    brand_authorization_pricing TEXT,
    cases TEXT,
    business_regions TEXT,
    customer_service_phone TEXT,
    current_pain_points TEXT,
    core_advantages TEXT,
    extra_info TEXT,
    image_notes TEXT,
    target_keywords TEXT,
    generated_long_tail_keywords TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_enterprise_profiles_project_id
    ON enterprise_profiles(project_id);

CREATE TABLE IF NOT EXISTS knowledge_entries (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    parent_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'chat',
    metadata TEXT NOT NULL DEFAULT '{}',
    chunk_index INTEGER NOT NULL DEFAULT 0,
    embedding_status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_entries_project_id
    ON knowledge_entries(project_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_entries_created_at
    ON knowledge_entries(created_at);

CREATE TABLE IF NOT EXISTS knowledge_assets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    filename TEXT NOT NULL,
    content_type TEXT,
    file_path TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'document',
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_assets_project_id
    ON knowledge_assets(project_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_assets_status
    ON knowledge_assets(status);

CREATE TABLE IF NOT EXISTS knowledge_profile_drafts (
    id TEXT PRIMARY KEY,
    intent TEXT NOT NULL DEFAULT 'create',
    project_id TEXT,
    conversation_id TEXT,
    assistant_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    profile_json TEXT NOT NULL DEFAULT '{}',
    missing_fields_json TEXT NOT NULL DEFAULT '[]',
    confidence_json TEXT NOT NULL DEFAULT '{}',
    source_summary_json TEXT NOT NULL DEFAULT '{}',
    raw_text TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_profile_drafts_status
    ON knowledge_profile_drafts(status);

CREATE TABLE IF NOT EXISTS knowledge_draft_assets (
    id TEXT PRIMARY KEY,
    draft_id TEXT REFERENCES knowledge_profile_drafts(id),
    filename TEXT NOT NULL,
    content_type TEXT,
    file_path TEXT NOT NULL,
    extracted_text TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_draft_assets_draft_id
    ON knowledge_draft_assets(draft_id);

CREATE TABLE IF NOT EXISTS geo_projects (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    company_name TEXT NOT NULL,
    industry TEXT,
    region TEXT,
    current_phase TEXT NOT NULL DEFAULT 'collecting',
    platforms TEXT NOT NULL DEFAULT '["doubao","deepseek"]',
    knowledge_base_ready INTEGER NOT NULL DEFAULT 0,
    initial_keywords_json TEXT NOT NULL DEFAULT '[]',
    phase_status_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_projects_project_id
    ON geo_projects(project_id);

CREATE INDEX IF NOT EXISTS idx_geo_projects_current_phase
    ON geo_projects(current_phase);

CREATE TABLE IF NOT EXISTS geo_reports (
    id TEXT PRIMARY KEY,
    geo_project_id TEXT NOT NULL REFERENCES geo_projects(id),
    enterprise_project_id TEXT NOT NULL REFERENCES projects(id),
    platform TEXT NOT NULL CHECK(platform IN ('doubao','deepseek')),
    status TEXT NOT NULL DEFAULT 'completed',
    report_json TEXT NOT NULL DEFAULT '{}',
    markdown TEXT NOT NULL DEFAULT '',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_geo_reports_project_platform
    ON geo_reports(geo_project_id, platform, updated_at);

CREATE TABLE IF NOT EXISTS geo_question_sets (
    id TEXT PRIMARY KEY,
    geo_project_id TEXT NOT NULL REFERENCES geo_projects(id),
    enterprise_project_id TEXT NOT NULL REFERENCES projects(id),
    platform TEXT NOT NULL CHECK(platform IN ('doubao','deepseek')),
    questions_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_geo_question_sets_project_platform
    ON geo_question_sets(geo_project_id, platform, updated_at);

CREATE TABLE IF NOT EXISTS geo_source_discoveries (
    id TEXT PRIMARY KEY,
    geo_project_id TEXT NOT NULL REFERENCES geo_projects(id),
    enterprise_project_id TEXT NOT NULL REFERENCES projects(id),
    platform TEXT NOT NULL CHECK(platform IN ('doubao','deepseek')),
    discovery_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_geo_source_discoveries_project_platform
    ON geo_source_discoveries(geo_project_id, platform, updated_at);

CREATE TABLE IF NOT EXISTS geo_article_drafts (
    id TEXT PRIMARY KEY,
    geo_project_id TEXT NOT NULL REFERENCES geo_projects(id),
    enterprise_project_id TEXT NOT NULL REFERENCES projects(id),
    platform TEXT NOT NULL CHECK(platform IN ('doubao','deepseek')),
    article_type TEXT NOT NULL CHECK(article_type IN ('consulting','review','ranking')),
    status TEXT NOT NULL DEFAULT 'draft',
    draft_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_geo_article_drafts_project_platform
    ON geo_article_drafts(geo_project_id, platform, article_type, updated_at);

CREATE TABLE IF NOT EXISTS geo_citation_checks (
    id TEXT PRIMARY KEY,
    geo_project_id TEXT NOT NULL REFERENCES geo_projects(id),
    enterprise_project_id TEXT NOT NULL REFERENCES projects(id),
    platform TEXT NOT NULL CHECK(platform IN ('doubao','deepseek')),
    check_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_geo_citation_checks_project_platform
    ON geo_citation_checks(geo_project_id, platform, updated_at);
