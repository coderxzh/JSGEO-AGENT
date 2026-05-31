import json
import shutil
import sqlite3
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, Optional


ROOT_DIR = Path(__file__).resolve().parents[1]
DB_NAME = "geo-agent-studio.sqlite3"
GENERIC_CONVERSATION_TITLES = {
    "新对话",
    "本地 GEO-Agent 对话",
    "本地对话",
    "本地agent 对话",
    "本地 Agent 对话",
}

CONVERSATION_DISPLAY_TITLE_SQL = """
CASE
    WHEN c.title IN ('新对话', '本地 GEO-Agent 对话', '本地对话', '本地agent 对话', '本地 Agent 对话')
    THEN COALESCE(
        (
            SELECT substr(content, 1, 28)
            FROM messages
            WHERE conversation_id = c.id AND role = 'user' AND trim(content) != ''
            ORDER BY created_at ASC, rowid ASC
            LIMIT 1
        ),
        (
            SELECT substr(
                CASE
                    WHEN json_extract(metadata, '$.type') = 'knowledge_draft'
                    THEN
                        CASE
                            WHEN COALESCE(json_extract(metadata, '$.draft.profile.company_name'), json_extract(metadata, '$.draft.profile.short_name'), '') != ''
                            THEN '知识库草稿：' || COALESCE(json_extract(metadata, '$.draft.profile.company_name'), json_extract(metadata, '$.draft.profile.short_name'), '')
                            ELSE '知识库草稿'
                        END
                    WHEN json_extract(metadata, '$.type') = 'geo_phase_prompt'
                    THEN
                        CASE
                            WHEN json_extract(metadata, '$.platform') = 'doubao' THEN '豆包'
                            WHEN json_extract(metadata, '$.platform') = 'deepseek' THEN 'DeepSeek'
                            ELSE ''
                        END ||
                        '阶段' || COALESCE(json_extract(metadata, '$.phase'), 2) || '引导' ||
                        CASE
                            WHEN COALESCE(json_extract(metadata, '$.project.company_name'), '') != ''
                            THEN '：' || json_extract(metadata, '$.project.company_name')
                            ELSE ''
                        END
                    WHEN json_extract(metadata, '$.type') = 'geo_phase_result'
                    THEN
                        CASE
                            WHEN json_extract(metadata, '$.platform') = 'doubao' THEN '豆包'
                            WHEN json_extract(metadata, '$.platform') = 'deepseek' THEN 'DeepSeek'
                            ELSE ''
                        END ||
                        '阶段' || COALESCE(json_extract(metadata, '$.phase'), '') || '结果' ||
                        CASE
                            WHEN COALESCE(json_extract(metadata, '$.project.company_name'), '') != ''
                            THEN '：' || json_extract(metadata, '$.project.company_name')
                            ELSE ''
                        END
                    ELSE NULL
                END,
                1,
                28
            )
            FROM messages
            WHERE conversation_id = c.id
              AND role = 'assistant'
              AND json_valid(metadata)
              AND json_extract(metadata, '$.type') IN ('knowledge_draft', 'geo_phase_prompt', 'geo_phase_result')
            ORDER BY created_at ASC, rowid ASC
            LIMIT 1
        ),
        (
            SELECT substr(content, 1, 28)
            FROM messages
            WHERE conversation_id = c.id AND role = 'assistant' AND trim(content) != ''
            ORDER BY created_at ASC, rowid ASC
            LIMIT 1
        ),
        c.title
    )
    ELSE c.title
END AS title
"""

SINGLE_CONVERSATION_DISPLAY_TITLE_SQL = """
CASE
    WHEN title IN ('新对话', '本地 GEO-Agent 对话', '本地对话', '本地agent 对话', '本地 Agent 对话')
    THEN COALESCE(
        (
            SELECT substr(content, 1, 28)
            FROM messages
            WHERE conversation_id = conversations.id AND role = 'user' AND trim(content) != ''
            ORDER BY created_at ASC, rowid ASC
            LIMIT 1
        ),
        (
            SELECT substr(
                CASE
                    WHEN json_extract(metadata, '$.type') = 'knowledge_draft'
                    THEN
                        CASE
                            WHEN COALESCE(json_extract(metadata, '$.draft.profile.company_name'), json_extract(metadata, '$.draft.profile.short_name'), '') != ''
                            THEN '知识库草稿：' || COALESCE(json_extract(metadata, '$.draft.profile.company_name'), json_extract(metadata, '$.draft.profile.short_name'), '')
                            ELSE '知识库草稿'
                        END
                    WHEN json_extract(metadata, '$.type') = 'geo_phase_prompt'
                    THEN
                        CASE
                            WHEN json_extract(metadata, '$.platform') = 'doubao' THEN '豆包'
                            WHEN json_extract(metadata, '$.platform') = 'deepseek' THEN 'DeepSeek'
                            ELSE ''
                        END ||
                        '阶段' || COALESCE(json_extract(metadata, '$.phase'), 2) || '引导' ||
                        CASE
                            WHEN COALESCE(json_extract(metadata, '$.project.company_name'), '') != ''
                            THEN '：' || json_extract(metadata, '$.project.company_name')
                            ELSE ''
                        END
                    WHEN json_extract(metadata, '$.type') = 'geo_phase_result'
                    THEN
                        CASE
                            WHEN json_extract(metadata, '$.platform') = 'doubao' THEN '豆包'
                            WHEN json_extract(metadata, '$.platform') = 'deepseek' THEN 'DeepSeek'
                            ELSE ''
                        END ||
                        '阶段' || COALESCE(json_extract(metadata, '$.phase'), '') || '结果' ||
                        CASE
                            WHEN COALESCE(json_extract(metadata, '$.project.company_name'), '') != ''
                            THEN '：' || json_extract(metadata, '$.project.company_name')
                            ELSE ''
                        END
                    ELSE NULL
                END,
                1,
                28
            )
            FROM messages
            WHERE conversation_id = conversations.id
              AND role = 'assistant'
              AND json_valid(metadata)
              AND json_extract(metadata, '$.type') IN ('knowledge_draft', 'geo_phase_prompt', 'geo_phase_result')
            ORDER BY created_at ASC, rowid ASC
            LIMIT 1
        ),
        (
            SELECT substr(content, 1, 28)
            FROM messages
            WHERE conversation_id = conversations.id AND role = 'assistant' AND trim(content) != ''
            ORDER BY created_at ASC, rowid ASC
            LIMIT 1
        ),
        title
    )
    ELSE title
END AS title
"""


def get_schema_path() -> Path:
    bundled_root = Path(getattr(sys, "_MEIPASS", ROOT_DIR))
    bundled_schema = bundled_root / "database" / "schema.sql"
    if bundled_schema.exists():
        return bundled_schema
    return ROOT_DIR / "database" / "schema.sql"


def create_connection(data_dir: Path) -> sqlite3.Connection:
    data_dir.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(data_dir / DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database(data_dir: Path) -> None:
    with create_connection(data_dir) as conn:
        conn.executescript(get_schema_path().read_text(encoding="utf-8"))
        ensure_database_migrations(conn)
        conn.commit()


def ensure_database_migrations(conn: sqlite3.Connection) -> None:
    message_columns = {row["name"] for row in conn.execute("PRAGMA table_info(messages)").fetchall()}
    if "metadata" not in message_columns:
        conn.execute("ALTER TABLE messages ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'")
    knowledge_columns = {row["name"] for row in conn.execute("PRAGMA table_info(knowledge_entries)").fetchall()}
    migrations = [
        ("parent_id", "ALTER TABLE knowledge_entries ADD COLUMN parent_id TEXT"),
        ("chunk_index", "ALTER TABLE knowledge_entries ADD COLUMN chunk_index INTEGER NOT NULL DEFAULT 0"),
        ("embedding_status", "ALTER TABLE knowledge_entries ADD COLUMN embedding_status TEXT NOT NULL DEFAULT 'pending'"),
        ("error_message", "ALTER TABLE knowledge_entries ADD COLUMN error_message TEXT"),
    ]
    for column, statement in migrations:
        if column not in knowledge_columns:
            conn.execute(statement)
    conn.execute(
        """
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
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_entries_embedding_status ON knowledge_entries(embedding_status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_assets_project_id ON knowledge_assets(project_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_assets_status ON knowledge_assets(status)")
    conn.execute(
        """
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
        )
        """
    )
    draft_columns = {row["name"] for row in conn.execute("PRAGMA table_info(knowledge_profile_drafts)").fetchall()}
    draft_migrations = [
        ("conversation_id", "ALTER TABLE knowledge_profile_drafts ADD COLUMN conversation_id TEXT"),
        ("assistant_message_id", "ALTER TABLE knowledge_profile_drafts ADD COLUMN assistant_message_id TEXT"),
    ]
    for column, statement in draft_migrations:
        if column not in draft_columns:
            conn.execute(statement)
    conn.execute(
        """
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
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_profile_drafts_status ON knowledge_profile_drafts(status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_draft_assets_draft_id ON knowledge_draft_assets(draft_id)")
    conn.execute(
        """
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
        )
        """
    )
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_projects_project_id ON geo_projects(project_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_geo_projects_current_phase ON geo_projects(current_phase)")
    conn.execute(
        """
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
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_geo_reports_project_platform ON geo_reports(geo_project_id, platform, updated_at)")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS geo_question_sets (
            id TEXT PRIMARY KEY,
            geo_project_id TEXT NOT NULL REFERENCES geo_projects(id),
            enterprise_project_id TEXT NOT NULL REFERENCES projects(id),
            platform TEXT NOT NULL CHECK(platform IN ('doubao','deepseek')),
            questions_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_geo_question_sets_project_platform ON geo_question_sets(geo_project_id, platform, updated_at)")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS geo_source_discoveries (
            id TEXT PRIMARY KEY,
            geo_project_id TEXT NOT NULL REFERENCES geo_projects(id),
            enterprise_project_id TEXT NOT NULL REFERENCES projects(id),
            platform TEXT NOT NULL CHECK(platform IN ('doubao','deepseek')),
            discovery_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_geo_source_discoveries_project_platform ON geo_source_discoveries(geo_project_id, platform, updated_at)")
    conn.execute(
        """
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
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_geo_article_drafts_project_platform ON geo_article_drafts(geo_project_id, platform, article_type, updated_at)")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS geo_citation_checks (
            id TEXT PRIMARY KEY,
            geo_project_id TEXT NOT NULL REFERENCES geo_projects(id),
            enterprise_project_id TEXT NOT NULL REFERENCES projects(id),
            platform TEXT NOT NULL CHECK(platform IN ('doubao','deepseek')),
            check_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_geo_citation_checks_project_platform ON geo_citation_checks(geo_project_id, platform, updated_at)")


def list_projects(data_dir: Path) -> Iterable[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, name, company_name, industry, region, status
            FROM projects
            ORDER BY updated_at DESC
            """
        ).fetchall()


def upsert_geo_project(
    data_dir: Path,
    project_id: str,
    company_name: str,
    industry: Optional[str],
    region: Optional[str],
    current_phase: str,
    platforms: str,
    knowledge_base_ready: bool,
    initial_keywords_json: str,
    phase_status_json: str,
) -> str:
    geo_project_id = f"geo-{project_id}"
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO geo_projects (
                id, project_id, company_name, industry, region, current_phase,
                platforms, knowledge_base_ready, initial_keywords_json, phase_status_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id) DO UPDATE SET
                company_name = excluded.company_name,
                industry = excluded.industry,
                region = excluded.region,
                current_phase = excluded.current_phase,
                platforms = excluded.platforms,
                knowledge_base_ready = excluded.knowledge_base_ready,
                initial_keywords_json = excluded.initial_keywords_json,
                phase_status_json = excluded.phase_status_json,
                updated_at = datetime('now')
            """,
            (
                geo_project_id,
                project_id,
                company_name,
                industry,
                region,
                current_phase,
                platforms,
                1 if knowledge_base_ready else 0,
                initial_keywords_json,
                phase_status_json,
            ),
        )
        row = conn.execute("SELECT id FROM geo_projects WHERE project_id = ?", (project_id,)).fetchone()
        conn.commit()
    return str(row["id"] if row else geo_project_id)


def list_geo_projects(data_dir: Path, enterprise_project_id: Optional[str] = None) -> Iterable[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        if enterprise_project_id:
            return conn.execute(
                """
                SELECT id, project_id, company_name, industry, region, current_phase,
                       platforms, knowledge_base_ready, initial_keywords_json,
                       phase_status_json, created_at, updated_at
                FROM geo_projects
                WHERE project_id = ?
                ORDER BY updated_at DESC
                """,
                (enterprise_project_id,),
            ).fetchall()
        return conn.execute(
            """
            SELECT id, project_id, company_name, industry, region, current_phase,
                   platforms, knowledge_base_ready, initial_keywords_json,
                   phase_status_json, created_at, updated_at
            FROM geo_projects
            ORDER BY updated_at DESC
            """
        ).fetchall()


def get_geo_project(data_dir: Path, geo_project_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, project_id, company_name, industry, region, current_phase,
                   platforms, knowledge_base_ready, initial_keywords_json,
                   phase_status_json, created_at, updated_at
            FROM geo_projects
            WHERE id = ?
            """,
            (geo_project_id,),
        ).fetchone()


def delete_geo_projects_for_enterprise(data_dir: Path, project_id: str) -> None:
    with create_connection(data_dir) as conn:
        conn.execute("DELETE FROM geo_citation_checks WHERE enterprise_project_id = ?", (project_id,))
        conn.execute("DELETE FROM geo_article_drafts WHERE enterprise_project_id = ?", (project_id,))
        conn.execute("DELETE FROM geo_source_discoveries WHERE enterprise_project_id = ?", (project_id,))
        conn.execute("DELETE FROM geo_question_sets WHERE enterprise_project_id = ?", (project_id,))
        conn.execute("DELETE FROM geo_reports WHERE enterprise_project_id = ?", (project_id,))
        conn.execute("DELETE FROM geo_projects WHERE project_id = ?", (project_id,))
        conn.commit()


def update_geo_project_phase(
    data_dir: Path,
    geo_project_id: str,
    current_phase: str,
    phase_status_json: str,
) -> bool:
    with create_connection(data_dir) as conn:
        cursor = conn.execute(
            """
            UPDATE geo_projects
            SET current_phase = ?, phase_status_json = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (current_phase, phase_status_json, geo_project_id),
        )
        conn.commit()
    return cursor.rowcount > 0


def create_conversation(
    data_dir: Path,
    conversation_id: Optional[str] = None,
    project_id: Optional[str] = None,
) -> str:
    next_id = conversation_id or str(uuid.uuid4())
    with create_connection(data_dir) as conn:
        existing = conn.execute(
            "SELECT id FROM conversations WHERE id = ?",
            (next_id,),
        ).fetchone()
        if existing is None:
            conn.execute(
                "INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)",
                (next_id, project_id, "新对话"),
            )
        elif project_id:
            conn.execute(
                """
                UPDATE conversations
                SET project_id = COALESCE(project_id, ?), updated_at = datetime('now')
                WHERE id = ?
                """,
                (project_id, next_id),
            )
        conn.commit()
    return next_id


def add_message(
    data_dir: Path,
    conversation_id: str,
    role: str,
    content: str,
    metadata: Optional[Dict] = None,
) -> str:
    message_id = str(uuid.uuid4())
    metadata_dict = metadata or {}
    metadata_json = json.dumps(metadata_dict, ensure_ascii=False)
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO messages (id, conversation_id, role, content, metadata)
            VALUES (?, ?, ?, ?, ?)
            """,
            (message_id, conversation_id, role, content, metadata_json),
        )
        title_row = conn.execute(
            """
            SELECT title FROM conversations
            WHERE id = ?
            """,
            (conversation_id,),
        ).fetchone()
        next_title = build_conversation_title_from_message(role, content, metadata_dict)
        if next_title and title_row and title_row["title"] in GENERIC_CONVERSATION_TITLES:
            conn.execute(
                """
                UPDATE conversations
                SET title = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (next_title, conversation_id),
            )
        else:
            conn.execute(
                """
                UPDATE conversations
                SET updated_at = datetime('now')
                WHERE id = ?
                """,
                (conversation_id,),
            )
        conn.commit()
    return message_id


def update_message(
    data_dir: Path,
    message_id: str,
    content: str,
    metadata: Optional[Dict] = None,
) -> bool:
    metadata_json = json.dumps(metadata, ensure_ascii=False) if metadata is not None else None
    with create_connection(data_dir) as conn:
        if metadata_json is None:
            cursor = conn.execute(
                """
                UPDATE messages
                SET content = ?
                WHERE id = ?
                """,
                (content, message_id),
            )
        else:
            cursor = conn.execute(
                """
                UPDATE messages
                SET content = ?, metadata = ?
                WHERE id = ?
                """,
                (content, metadata_json, message_id),
            )
        updated = cursor.rowcount > 0
        if updated:
            conn.execute(
                """
                UPDATE conversations
                SET updated_at = datetime('now')
                WHERE id = (
                    SELECT conversation_id FROM messages WHERE id = ?
                )
                """,
                (message_id,),
            )
        conn.commit()
    return updated


def clear_conversation_history(data_dir: Path) -> Path:
    db_path = data_dir / DB_NAME
    backup_dir = data_dir / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = backup_dir / f"{DB_NAME}.before-clear-conversations-{timestamp}.bak"
    if db_path.exists():
        shutil.copy2(db_path, backup_path)
    with create_connection(data_dir) as conn:
        conn.execute("DELETE FROM messages")
        conn.execute("DELETE FROM conversations")
        conn.execute(
            """
            UPDATE knowledge_profile_drafts
            SET conversation_id = NULL,
                assistant_message_id = NULL,
                updated_at = datetime('now')
            """
        )
        conn.commit()
    return backup_path


def backup_database(data_dir: Path, reason: str) -> Path:
    db_path = data_dir / DB_NAME
    backup_dir = data_dir / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    safe_reason = "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in reason).strip("-") or "backup"
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = backup_dir / f"{DB_NAME}.{safe_reason}-{timestamp}.bak"
    if db_path.exists():
        shutil.copy2(db_path, backup_path)
    return backup_path


def list_conversations(
    data_dir: Path,
    project_id: Optional[str] = None,
    limit: int = 30,
) -> Iterable[sqlite3.Row]:
    limit = max(1, min(limit, 100))
    with create_connection(data_dir) as conn:
        if project_id:
            return conn.execute(
                """
                SELECT
                    c.id,
                    c.project_id,
                    """ + CONVERSATION_DISPLAY_TITLE_SQL + """,
                    c.created_at,
                    c.updated_at,
                    COUNT(m.id) AS message_count,
                    (
                        SELECT content
                        FROM messages
                        WHERE conversation_id = c.id
                        ORDER BY created_at DESC, rowid DESC
                        LIMIT 1
                    ) AS last_message
                FROM conversations c
                LEFT JOIN messages m ON m.conversation_id = c.id
                WHERE c.project_id = ?
                GROUP BY c.id
                ORDER BY c.updated_at DESC
                LIMIT ?
                """,
                (project_id, limit),
            ).fetchall()
        return conn.execute(
            """
            SELECT
                c.id,
                c.project_id,
                """ + CONVERSATION_DISPLAY_TITLE_SQL + """,
                c.created_at,
                c.updated_at,
                COUNT(m.id) AS message_count,
                (
                        SELECT content
                        FROM messages
                        WHERE conversation_id = c.id
                        ORDER BY created_at DESC, rowid DESC
                        LIMIT 1
                    ) AS last_message
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()


def get_conversation_summary(data_dir: Path, conversation_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT
                c.id,
                c.project_id,
                """ + CONVERSATION_DISPLAY_TITLE_SQL + """,
                c.created_at,
                c.updated_at,
                COUNT(m.id) AS message_count,
                (
                    SELECT content
                    FROM messages
                    WHERE conversation_id = c.id
                    ORDER BY created_at DESC, rowid DESC
                    LIMIT 1
                ) AS last_message
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
            """,
            (conversation_id,),
        ).fetchone()


def get_conversation(data_dir: Path, conversation_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, project_id, """ + SINGLE_CONVERSATION_DISPLAY_TITLE_SQL + """, created_at, updated_at
            FROM conversations
            WHERE id = ?
            """,
            (conversation_id,),
        ).fetchone()


def find_pending_phase_two_prompt_message(
    data_dir: Path,
    conversation_id: str,
    geo_project_id: str,
    platform: str,
) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, conversation_id, role, content, metadata, created_at
            FROM messages
            WHERE conversation_id = ?
              AND role = 'assistant'
              AND json_valid(metadata)
              AND json_extract(metadata, '$.type') = 'geo_phase_prompt'
              AND json_extract(metadata, '$.geo_project_id') = ?
              AND json_extract(metadata, '$.platform') = ?
              AND json_extract(metadata, '$.phase') = 2
              AND COALESCE(json_extract(metadata, '$.confirmation_state'), '') = 'approval-requested'
            ORDER BY created_at ASC, rowid ASC
            LIMIT 1
            """,
            (conversation_id, geo_project_id, platform),
        ).fetchone()


def cleanup_stale_phase_two_prompt_conversations(data_dir: Path) -> Dict[str, Any]:
    backup_path = backup_database(data_dir, "before-cleanup-stale-phase-two-prompts")
    with create_connection(data_dir) as conn:
        rows = conn.execute(
            """
            SELECT c.id
            FROM conversations c
            JOIN messages m ON m.conversation_id = c.id
            WHERE c.id IN (
                SELECT conversation_id
                FROM messages
                GROUP BY conversation_id
                HAVING COUNT(*) = 1
            )
              AND m.role = 'assistant'
              AND json_valid(m.metadata)
              AND json_extract(m.metadata, '$.type') = 'geo_phase_prompt'
              AND json_extract(m.metadata, '$.phase') = 2
              AND COALESCE(json_extract(m.metadata, '$.confirmation_state'), '') = 'approval-requested'
              AND NOT EXISTS (
                  SELECT 1
                  FROM messages user_messages
                  WHERE user_messages.conversation_id = c.id
                    AND user_messages.role = 'user'
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM messages phase_results
                  WHERE phase_results.conversation_id = c.id
                    AND json_valid(phase_results.metadata)
                    AND json_extract(phase_results.metadata, '$.type') = 'geo_phase_result'
              )
            """
        ).fetchall()
        conversation_ids = [row["id"] for row in rows]
        for conversation_id in conversation_ids:
            conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
            conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        conn.commit()
    return {
        "deleted_count": len(conversation_ids),
        "backup_path": str(backup_path),
    }


def delete_conversation(data_dir: Path, conversation_id: str) -> bool:
    with create_connection(data_dir) as conn:
        existing = conn.execute(
            "SELECT id FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()
        if existing is None:
            return False
        conn.execute(
            "DELETE FROM messages WHERE conversation_id = ?",
            (conversation_id,),
        )
        conn.execute(
            "DELETE FROM conversations WHERE id = ?",
            (conversation_id,),
        )
        conn.commit()
    return True


def list_conversation_messages(data_dir: Path, conversation_id: str) -> Iterable[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, conversation_id, role, content, metadata, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC, rowid ASC
            """,
            (conversation_id,),
        ).fetchall()


def add_knowledge_entry(
    data_dir: Path,
    content: str,
    title: Optional[str] = None,
    project_id: Optional[str] = None,
    source_type: str = "chat",
    metadata: str = "{}",
    parent_id: Optional[str] = None,
    chunk_index: int = 0,
    embedding_status: str = "pending",
    error_message: Optional[str] = None,
) -> str:
    entry_id = str(uuid.uuid4())
    resolved_title = title or build_knowledge_title(content)
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO knowledge_entries (
                id, project_id, parent_id, title, content, source_type, metadata,
                chunk_index, embedding_status, error_message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry_id,
                project_id,
                parent_id,
                resolved_title,
                content,
                source_type,
                metadata,
                chunk_index,
                embedding_status,
                error_message,
            ),
        )
        conn.commit()
    return entry_id


def update_knowledge_entry_embedding_status(
    data_dir: Path,
    entry_id: str,
    embedding_status: str,
    error_message: Optional[str] = None,
) -> None:
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            UPDATE knowledge_entries
            SET embedding_status = ?, error_message = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (embedding_status, error_message, entry_id),
        )
        conn.commit()


PROFILE_COLUMNS = [
    "project_id",
    "company_name",
    "short_name",
    "industry",
    "main_business",
    "official_website",
    "official_media",
    "detailed_intro",
    "brand_story",
    "products_services",
    "product_features",
    "user_pain_points",
    "trust_endorsements",
    "brand_authorization_pricing",
    "cases",
    "business_regions",
    "customer_service_phone",
    "current_pain_points",
    "core_advantages",
    "extra_info",
    "image_notes",
    "target_keywords",
    "generated_long_tail_keywords",
]


def upsert_enterprise_profile(data_dir: Path, profile: Dict[str, str]) -> str:
    values = {column: profile.get(column) for column in PROFILE_COLUMNS}
    with create_connection(data_dir) as conn:
        profile_id = profile.get("id")
        existing = None
        if profile_id:
            existing = conn.execute(
                "SELECT id FROM enterprise_profiles WHERE id = ?",
                (profile_id,),
            ).fetchone()
        if existing is None and values.get("project_id"):
            existing = conn.execute(
                "SELECT id FROM enterprise_profiles WHERE project_id = ?",
                (values["project_id"],),
            ).fetchone()
            if existing:
                profile_id = existing["id"]
        if not profile_id:
            profile_id = str(uuid.uuid4())
        if existing:
            assignments = ", ".join(f"{column} = ?" for column in PROFILE_COLUMNS)
            conn.execute(
                f"""
                UPDATE enterprise_profiles
                SET {assignments}, updated_at = datetime('now')
                WHERE id = ?
                """,
                (*[values[column] for column in PROFILE_COLUMNS], profile_id),
            )
        else:
            columns_sql = ", ".join(["id", *PROFILE_COLUMNS])
            placeholders = ", ".join("?" for _ in ["id", *PROFILE_COLUMNS])
            conn.execute(
                f"""
                INSERT INTO enterprise_profiles ({columns_sql})
                VALUES ({placeholders})
                """,
                (profile_id, *[values[column] for column in PROFILE_COLUMNS]),
            )
        conn.commit()
    return profile_id


def list_enterprise_profiles(data_dir: Path) -> Iterable[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT
                ep.*,
                COUNT(ke.id) AS entry_count
            FROM enterprise_profiles ep
            LEFT JOIN knowledge_entries ke ON ke.project_id = ep.project_id
            GROUP BY ep.id
            ORDER BY ep.updated_at DESC
            """
        ).fetchall()


def get_enterprise_profile(data_dir: Path, project_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT
                ep.*,
                COUNT(ke.id) AS entry_count
            FROM enterprise_profiles ep
            LEFT JOIN knowledge_entries ke ON ke.project_id = ep.project_id
            WHERE ep.project_id = ?
            GROUP BY ep.id
            """,
            (project_id,),
        ).fetchone()


def delete_enterprise_profile(data_dir: Path, project_id: str) -> None:
    with create_connection(data_dir) as conn:
        conn.execute("DELETE FROM knowledge_entries WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM knowledge_assets WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM enterprise_profiles WHERE project_id = ?", (project_id,))
        conn.commit()


def delete_enterprise_profile_entries(data_dir: Path, project_id: Optional[str]) -> None:
    with create_connection(data_dir) as conn:
        if project_id:
            conn.execute(
                """
                DELETE FROM knowledge_entries
                WHERE project_id = ? AND source_type = 'enterprise_profile'
                """,
                (project_id,),
            )
        conn.commit()


def list_knowledge_entries(
    data_dir: Path,
    project_id: Optional[str] = None,
    limit: int = 50,
) -> Iterable[sqlite3.Row]:
    limit = max(1, min(limit, 200))
    with create_connection(data_dir) as conn:
        if project_id:
            return conn.execute(
                """
                SELECT id, project_id, parent_id, title, content, source_type, metadata,
                       chunk_index, embedding_status, error_message, created_at, updated_at
                FROM knowledge_entries
                WHERE project_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (project_id, limit),
            ).fetchall()
        return conn.execute(
            """
            SELECT id, project_id, parent_id, title, content, source_type, metadata,
                   chunk_index, embedding_status, error_message, created_at, updated_at
            FROM knowledge_entries
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()


def search_knowledge_entries(
    data_dir: Path,
    query: str,
    project_id: Optional[str] = None,
    limit: int = 10,
) -> Iterable[sqlite3.Row]:
    limit = max(1, min(limit, 50))
    normalized_query = query.strip()
    if not normalized_query:
        return list_knowledge_entries(data_dir, project_id, limit)
    like_query = f"%{normalized_query}%"
    with create_connection(data_dir) as conn:
        if project_id:
            return conn.execute(
                """
                SELECT id, project_id, parent_id, title, content, source_type, metadata,
                       chunk_index, embedding_status, error_message, created_at, updated_at
                FROM knowledge_entries
                WHERE project_id = ?
                  AND (title LIKE ? OR content LIKE ?)
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (project_id, like_query, like_query, limit),
            ).fetchall()
        return conn.execute(
            """
            SELECT id, project_id, parent_id, title, content, source_type, metadata,
                   chunk_index, embedding_status, error_message, created_at, updated_at
            FROM knowledge_entries
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (like_query, like_query, limit),
        ).fetchall()


def count_knowledge_entries(data_dir: Path, project_id: Optional[str] = None) -> int:
    with create_connection(data_dir) as conn:
        if project_id:
            row = conn.execute(
                "SELECT COUNT(*) AS count FROM knowledge_entries WHERE project_id = ?",
                (project_id,),
            ).fetchone()
        else:
            row = conn.execute("SELECT COUNT(*) AS count FROM knowledge_entries").fetchone()
    return int(row["count"] if row else 0)


def create_knowledge_asset(
    data_dir: Path,
    project_id: str,
    filename: str,
    content_type: Optional[str],
    file_path: str,
    source_type: str = "document",
) -> str:
    asset_id = str(uuid.uuid4())
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO knowledge_assets (id, project_id, filename, content_type, file_path, source_type)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (asset_id, project_id, filename, content_type, file_path, source_type),
        )
        conn.commit()
    return asset_id


def update_knowledge_asset_status(
    data_dir: Path,
    asset_id: str,
    status: str,
    error_message: Optional[str] = None,
) -> None:
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            UPDATE knowledge_assets
            SET status = ?, error_message = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (status, error_message, asset_id),
        )
        conn.commit()


def get_knowledge_asset(data_dir: Path, asset_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, project_id, filename, content_type, file_path, source_type,
                   status, error_message, created_at, updated_at
            FROM knowledge_assets
            WHERE id = ?
            """,
            (asset_id,),
        ).fetchone()


def list_knowledge_assets(data_dir: Path, project_id: Optional[str] = None) -> Iterable[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        if project_id:
            return conn.execute(
                """
                SELECT id, project_id, filename, content_type, file_path, source_type,
                       status, error_message, created_at, updated_at
                FROM knowledge_assets
                WHERE project_id = ?
                ORDER BY created_at DESC
                """,
                (project_id,),
            ).fetchall()
        return conn.execute(
            """
            SELECT id, project_id, filename, content_type, file_path, source_type,
                   status, error_message, created_at, updated_at
            FROM knowledge_assets
            ORDER BY created_at DESC
            """
        ).fetchall()


def create_knowledge_profile_draft(
    data_dir: Path,
    draft_id: str,
    intent: str,
    project_id: Optional[str],
    conversation_id: Optional[str],
    assistant_message_id: Optional[str],
    profile_json: str,
    missing_fields_json: str,
    confidence_json: str,
    source_summary_json: str,
    raw_text: str,
) -> str:
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO knowledge_profile_drafts (
                id, intent, project_id, conversation_id, assistant_message_id,
                profile_json, missing_fields_json,
                confidence_json, source_summary_json, raw_text
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                draft_id,
                intent,
                project_id,
                conversation_id,
                assistant_message_id,
                profile_json,
                missing_fields_json,
                confidence_json,
                source_summary_json,
                raw_text,
            ),
        )
        conn.commit()
    return draft_id


def get_knowledge_profile_draft(data_dir: Path, draft_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, intent, project_id, conversation_id, assistant_message_id,
                   status, profile_json, missing_fields_json, confidence_json,
                   source_summary_json, raw_text, created_at, updated_at
            FROM knowledge_profile_drafts
            WHERE id = ?
            """,
            (draft_id,),
        ).fetchone()


def update_knowledge_profile_draft_status(data_dir: Path, draft_id: str, status: str) -> None:
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            UPDATE knowledge_profile_drafts
            SET status = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (status, draft_id),
        )
        conn.commit()


def create_knowledge_draft_asset(
    data_dir: Path,
    draft_id: str,
    filename: str,
    content_type: Optional[str],
    file_path: str,
    extracted_text: str,
    status: str = "parsed",
    error_message: Optional[str] = None,
) -> str:
    asset_id = str(uuid.uuid4())
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO knowledge_draft_assets (
                id, draft_id, filename, content_type, file_path, extracted_text, status, error_message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (asset_id, draft_id, filename, content_type, file_path, extracted_text, status, error_message),
        )
        conn.commit()
    return asset_id


def list_knowledge_draft_assets(data_dir: Path, draft_id: str) -> Iterable[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, draft_id, filename, content_type, file_path, extracted_text,
                   status, error_message, created_at, updated_at
            FROM knowledge_draft_assets
            WHERE draft_id = ?
            ORDER BY created_at ASC
            """,
            (draft_id,),
        ).fetchall()


def build_knowledge_title(content: str) -> str:
    normalized = " ".join(content.strip().split())
    if not normalized:
        return "未命名知识条目"
    return normalized[:32]


def create_geo_report(
    data_dir: Path,
    geo_project_id: str,
    enterprise_project_id: str,
    platform: str,
    status: str,
    report_json: str,
    markdown: str,
    error_message: Optional[str] = None,
) -> str:
    report_id = str(uuid.uuid4())
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO geo_reports (
                id, geo_project_id, enterprise_project_id, platform,
                status, report_json, markdown, error_message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                geo_project_id,
                enterprise_project_id,
                platform,
                status,
                report_json,
                markdown,
                error_message,
            ),
        )
        conn.commit()
    return report_id


def get_geo_report(data_dir: Path, report_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform, status,
                   report_json, markdown, error_message, created_at, updated_at
            FROM geo_reports
            WHERE id = ?
            """,
            (report_id,),
        ).fetchone()


def get_latest_geo_report(data_dir: Path, geo_project_id: str, platform: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform, status,
                   report_json, markdown, error_message, created_at, updated_at
            FROM geo_reports
            WHERE geo_project_id = ? AND platform = ?
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
            """,
            (geo_project_id, platform),
        ).fetchone()


def create_geo_question_set(
    data_dir: Path,
    geo_project_id: str,
    enterprise_project_id: str,
    platform: str,
    questions_json: str,
) -> str:
    question_set_id = str(uuid.uuid4())
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO geo_question_sets (
                id, geo_project_id, enterprise_project_id, platform, questions_json
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (question_set_id, geo_project_id, enterprise_project_id, platform, questions_json),
        )
        conn.commit()
    return question_set_id


def get_geo_question_set(data_dir: Path, question_set_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform,
                   questions_json, created_at, updated_at
            FROM geo_question_sets
            WHERE id = ?
            """,
            (question_set_id,),
        ).fetchone()


def get_latest_geo_question_set(data_dir: Path, geo_project_id: str, platform: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform,
                   questions_json, created_at, updated_at
            FROM geo_question_sets
            WHERE geo_project_id = ? AND platform = ?
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
            """,
            (geo_project_id, platform),
        ).fetchone()


def create_geo_source_discovery(
    data_dir: Path,
    geo_project_id: str,
    enterprise_project_id: str,
    platform: str,
    discovery_json: str,
) -> str:
    discovery_id = str(uuid.uuid4())
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO geo_source_discoveries (
                id, geo_project_id, enterprise_project_id, platform, discovery_json
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (discovery_id, geo_project_id, enterprise_project_id, platform, discovery_json),
        )
        conn.commit()
    return discovery_id


def get_geo_source_discovery(data_dir: Path, discovery_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform,
                   discovery_json, created_at, updated_at
            FROM geo_source_discoveries
            WHERE id = ?
            """,
            (discovery_id,),
        ).fetchone()


def get_latest_geo_source_discovery(data_dir: Path, geo_project_id: str, platform: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform,
                   discovery_json, created_at, updated_at
            FROM geo_source_discoveries
            WHERE geo_project_id = ? AND platform = ?
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
            """,
            (geo_project_id, platform),
        ).fetchone()


def create_geo_article_draft(
    data_dir: Path,
    geo_project_id: str,
    enterprise_project_id: str,
    platform: str,
    article_type: str,
    status: str,
    draft_json: str,
) -> str:
    draft_id = str(uuid.uuid4())
    with create_connection(data_dir) as conn:
        conn.execute(
            """
            INSERT INTO geo_article_drafts (
                id, geo_project_id, enterprise_project_id, platform,
                article_type, status, draft_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (draft_id, geo_project_id, enterprise_project_id, platform, article_type, status, draft_json),
        )
        conn.commit()
    return draft_id


def get_geo_article_draft(data_dir: Path, draft_id: str) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform, article_type,
                   status, draft_json, created_at, updated_at
            FROM geo_article_drafts
            WHERE id = ?
            """,
            (draft_id,),
        ).fetchone()


def update_geo_article_draft(
    data_dir: Path,
    draft_id: str,
    *,
    draft_json: Optional[str] = None,
    status: Optional[str] = None,
) -> bool:
    assignments = []
    params = []
    if draft_json is not None:
        assignments.append("draft_json = ?")
        params.append(draft_json)
    if status is not None:
        assignments.append("status = ?")
        params.append(status)
    if not assignments:
        return get_geo_article_draft(data_dir, draft_id) is not None
    assignments.append("updated_at = datetime('now')")
    params.append(draft_id)
    with create_connection(data_dir) as conn:
        cursor = conn.execute(
            f"""
            UPDATE geo_article_drafts
            SET {", ".join(assignments)}
            WHERE id = ?
            """,
            tuple(params),
        )
        conn.commit()
        return cursor.rowcount > 0


def get_latest_geo_article_draft(
    data_dir: Path,
    geo_project_id: str,
    platform: str,
    article_type: str,
) -> Optional[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform, article_type,
                   status, draft_json, created_at, updated_at
            FROM geo_article_drafts
            WHERE geo_project_id = ? AND platform = ? AND article_type = ?
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
            """,
            (geo_project_id, platform, article_type),
        ).fetchone()


def list_geo_article_drafts(
    data_dir: Path,
    geo_project_id: str,
    platform: Optional[str] = None,
) -> Iterable[sqlite3.Row]:
    with create_connection(data_dir) as conn:
        if platform:
            return conn.execute(
                """
                SELECT id, geo_project_id, enterprise_project_id, platform, article_type,
                       status, draft_json, created_at, updated_at
                FROM geo_article_drafts
                WHERE geo_project_id = ? AND platform = ?
                ORDER BY updated_at DESC, created_at DESC
                """,
                (geo_project_id, platform),
            ).fetchall()
        return conn.execute(
            """
            SELECT id, geo_project_id, enterprise_project_id, platform, article_type,
                   status, draft_json, created_at, updated_at
            FROM geo_article_drafts
            WHERE geo_project_id = ?
            ORDER BY updated_at DESC, created_at DESC
            """,
            (geo_project_id,),
        ).fetchall()


def build_conversation_title(content: str) -> str:
    normalized = " ".join(content.strip().split())
    if not normalized:
        return "新对话"
    return normalized[:28]


def build_conversation_title_from_message(role: str, content: str, metadata: Dict) -> str:
    metadata_type = metadata.get("type")
    if metadata_type == "knowledge_draft":
        draft = metadata.get("draft") if isinstance(metadata.get("draft"), dict) else {}
        profile = draft.get("profile") if isinstance(draft.get("profile"), dict) else {}
        company = str(profile.get("company_name") or profile.get("short_name") or "").strip()
        return f"知识库草稿：{company}"[:28] if company else "知识库草稿"
    if metadata_type == "geo_phase_prompt":
        project = metadata.get("project") if isinstance(metadata.get("project"), dict) else {}
        company = str(project.get("company_name") or "").strip()
        phase = metadata.get("phase") or 2
        platform = str(metadata.get("platform") or "").strip()
        platform_label = "豆包" if platform == "doubao" else "DeepSeek" if platform == "deepseek" else ""
        prefix = f"{platform_label}阶段{phase}引导".strip()
        return f"{prefix}：{company}"[:28] if company else prefix[:28]
    if metadata_type == "geo_phase_result":
        project = metadata.get("project") if isinstance(metadata.get("project"), dict) else {}
        company = str(project.get("company_name") or "").strip()
        phase = metadata.get("phase") or ""
        platform = str(metadata.get("platform") or "").strip()
        platform_label = "豆包" if platform == "doubao" else "DeepSeek" if platform == "deepseek" else ""
        prefix = f"{platform_label}阶段{phase}结果".strip()
        return f"{prefix}：{company}"[:28] if company else prefix[:28]
    if role == "user":
        return build_conversation_title(content)
    if metadata_type == "chat_response" and content.strip():
        return build_conversation_title(content)
    return ""
