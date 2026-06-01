export type GeoAgentProviderStatus = {
  provider: string;
  configured: boolean;
  model: string;
  base_url: string;
};

export type GeoAgentHealthStatus = {
  ok: boolean;
  service: string;
  mode: string;
  database_path?: string | null;
  timestamp: string;
};

export type ProjectStatus = 'active' | 'archived' | string;

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type CreateProjectPayload = {
  name?: string;
  company_name?: string;
  companyName?: string;
  description?: string | null;
};

export type ProjectsResponse = {
  projects: ProjectSummary[];
};

export type ProjectResponse = {
  project: ProjectSummary;
};

export type GeoAgentSkillVisibility = 'user' | 'internal';

export type GeoAgentSkill = {
  id: string;
  name: string;
  description: string;
  visibility: GeoAgentSkillVisibility;
  path: string;
  content: string;
};

export type GeoAgentShellResponse<T> = Promise<T>;
