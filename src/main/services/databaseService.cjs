const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DB_FILENAME = 'geo-agent-studio.sqlite3';

let db = null;
let dbPath = null;

function getDatabasePath(baseDir) {
  if (!baseDir) {
    throw new Error('Database base directory is required.');
  }
  return path.join(baseDir, DB_FILENAME);
}

function initializeDatabase(baseDir) {
  if (db) {
    return db;
  }

  fs.mkdirSync(baseDir, { recursive: true });
  dbPath = getDatabasePath(baseDir);
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  createSchema(db);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database has not been initialized.');
  }
  return db;
}

function getDbPath() {
  return dbPath;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    dbPath = null;
  }
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enterprise_profiles (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      profile_json TEXT NOT NULL,
      source_draft_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_drafts (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      status TEXT NOT NULL,
      input_text TEXT,
      facts_json TEXT,
      field_reviews_json TEXT,
      profile_json TEXT,
      source_quotes_json TEXT,
      warnings_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      entry_id TEXT REFERENCES knowledge_entries(id) ON DELETE CASCADE,
      title TEXT,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_project_id
      ON knowledge_chunks(project_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_chunks_project_hash
      ON knowledge_chunks(project_id, content_hash);

    CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks_fts
      USING fts5(id UNINDEXED, project_id UNINDEXED, title, content);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'chat',
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_project_kind_updated
      ON conversations(project_id, kind, updated_at);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
      ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS workflow_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      artifact_type TEXT,
      artifact_id TEXT,
      metadata_json TEXT,
      dismissed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workflow_events_project_stage_created
      ON workflow_events(project_id, stage_key, created_at);

    CREATE TABLE IF NOT EXISTS geo_question_sets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_geo_question_sets_project_platform
      ON geo_question_sets(project_id, platform, created_at);

    CREATE TABLE IF NOT EXISTS geo_article_drafts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      question_set_id TEXT REFERENCES geo_question_sets(id) ON DELETE SET NULL,
      platform TEXT,
      article_type TEXT NOT NULL,
      status TEXT NOT NULL,
      draft_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_geo_article_drafts_project_status
      ON geo_article_drafts(project_id, status, created_at);

    CREATE TABLE IF NOT EXISTS ai_visibility_checks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      question_ids_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_visibility_checks_project_platform
      ON ai_visibility_checks(project_id, platform, created_at);

    CREATE TABLE IF NOT EXISTS evolution_rules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      platform TEXT,
      rule_type TEXT NOT NULL,
      content TEXT NOT NULL,
      evidence_count INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_evolution_rules_project_status
      ON evolution_rules(project_id, status, created_at);
  `);
}

module.exports = {
  DB_FILENAME,
  closeDatabase,
  getDatabasePath,
  getDb,
  getDbPath,
  initializeDatabase,
};

