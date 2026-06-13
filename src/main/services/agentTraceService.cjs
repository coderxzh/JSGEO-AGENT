const crypto = require('node:crypto');
const { getDb } = require('./databaseService.cjs');

function nowIso() {
  return new Date().toISOString();
}

function jsonString(value) {
  return JSON.stringify(value ?? null);
}

function createRun({
  conversationId = null,
  projectId = null,
  intent = 'chat',
  status = 'running',
} = {}) {
  const timestamp = nowIso();
  const id = crypto.randomUUID();
  getDb().prepare(`
    INSERT INTO agent_runs (
      id, conversation_id, project_id, intent, status,
      started_at, created_at, updated_at
    )
    VALUES (
      @id, @conversation_id, @project_id, @intent, @status,
      @started_at, @created_at, @updated_at
    )
  `).run({
    id,
    conversation_id: conversationId,
    project_id: projectId,
    intent,
    status,
    started_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  });
  return { id, conversation_id: conversationId, project_id: projectId, intent, status };
}

function updateRun(runId, patch = {}) {
  if (!runId) return null;
  const timestamp = nowIso();
  const completedAt = ['completed', 'failed', 'cancelled'].includes(patch.status) ? timestamp : patch.completed_at || null;
  getDb().prepare(`
    UPDATE agent_runs
    SET status = COALESCE(@status, status),
        provider = COALESCE(@provider, provider),
        model = COALESCE(@model, model),
        network_mode = COALESCE(@network_mode, network_mode),
        token_usage_json = COALESCE(@token_usage_json, token_usage_json),
        artifact_type = COALESCE(@artifact_type, artifact_type),
        artifact_id = COALESCE(@artifact_id, artifact_id),
        error_message = COALESCE(@error_message, error_message),
        completed_at = COALESCE(@completed_at, completed_at),
        updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: runId,
    status: patch.status || null,
    provider: patch.provider || null,
    model: patch.model || null,
    network_mode: patch.network_mode || null,
    token_usage_json: patch.token_usage ? jsonString(patch.token_usage) : null,
    artifact_type: patch.artifact_type || null,
    artifact_id: patch.artifact_id || null,
    error_message: patch.error_message || null,
    completed_at: completedAt,
    updated_at: timestamp,
  });
  return getRun(runId);
}

function addStep({
  runId,
  stepIndex,
  stepType,
  toolName = null,
  status = 'running',
  title = null,
  input = null,
  output = null,
  artifactType = null,
  artifactId = null,
  errorMessage = null,
} = {}) {
  const timestamp = nowIso();
  const id = crypto.randomUUID();
  getDb().prepare(`
    INSERT INTO agent_steps (
      id, run_id, step_index, step_type, tool_name, status, title,
      input_json, output_json, artifact_type, artifact_id, error_message,
      started_at, completed_at, created_at, updated_at
    )
    VALUES (
      @id, @run_id, @step_index, @step_type, @tool_name, @status, @title,
      @input_json, @output_json, @artifact_type, @artifact_id, @error_message,
      @started_at, @completed_at, @created_at, @updated_at
    )
  `).run({
    id,
    run_id: runId,
    step_index: stepIndex,
    step_type: stepType,
    tool_name: toolName,
    status,
    title,
    input_json: input ? jsonString(input) : null,
    output_json: output ? jsonString(output) : null,
    artifact_type: artifactType,
    artifact_id: artifactId,
    error_message: errorMessage,
    started_at: timestamp,
    completed_at: status === 'completed' || status === 'failed' ? timestamp : null,
    created_at: timestamp,
    updated_at: timestamp,
  });
  return { id, run_id: runId, step_index: stepIndex, step_type: stepType, status };
}

function getRun(runId) {
  if (!runId) return null;
  return getDb().prepare('SELECT * FROM agent_runs WHERE id = ?').get(runId) || null;
}

module.exports = {
  addStep,
  createRun,
  getRun,
  updateRun,
};
