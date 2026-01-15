export interface ProjectSummary {
  id: string;
  name: string;
  updated_at: number;
  entry_count?: number;
}

export interface EntrySummary {
  id: string;
  title?: string;
  created_at: number;
  updated_at: number;
  is_starred: boolean;
  is_locked: boolean;
  snippet: string;
}

export interface EntryDetail {
  id: string;
  project_id: string;
  title?: string;
  body_markdown: string;
  source_json?: string;
  is_starred: boolean;
  is_locked: boolean;
  created_at: number;
  updated_at: number;
  tag_ids: string[];
}

export interface Tag {
  id: string;
  name: string;
  category?: string;
  color?: string;
  is_default: boolean;
}

export interface Template {
  id: string;
  project_id: string;
  name: string;
  body_markdown: string;
  schema_json?: string;
  created_at: number;
  updated_at: number;
}

// APIの型
export type API = {
  projects: {
    list(): Promise<{ projects: ProjectSummary[] }>;
    create(name: string): Promise<{ id: string }>;
    update(id: string, name: string): Promise<{ ok: true }>;
    delete(id: string): Promise<{ ok: true }>;
    exportAll: (projectId: string) => Promise<{ success: boolean, count?: number }>;
  };
  entries: {
    list(params: {
      project_id: string;
      query?: string;
      filters?: { tag_ids?: string[]; starred?: boolean };
      sort?: 'updated_desc' | 'created_desc';
    }): Promise<{ entries: EntrySummary[] }>;
    get(id: string): Promise<{ entry: EntryDetail }>;
    upsert(params: {
      id?: string;
      project_id: string;
      title?: string;
      body_markdown: string;
      source_json?: string;
      is_starred?: boolean;
      is_locked?: boolean;
      tag_ids?: string[];
    }): Promise<{ id: string }>;
    delete(id: string): Promise<{ ok: true }>;
    toggleStar(id: string, is_starred: boolean): Promise<{ ok: true }>;
    toggleLock(id: string, is_locked: boolean): Promise<{ ok: true }>;
    export: (entryId: string) => Promise<{ success: boolean }>;
  };
  tags: {
    list(): Promise<{ tags: Tag[] }>;
    create(name: string, category?: string, color?: string): Promise<{ id: string }>;
    delete(id: string): Promise<{ ok: true }>;
    attach(entry_id: string, tag_ids: string[]): Promise<{ ok: true }>;
  };
  templates: {
    list: (projectId?: string) => Promise<{ templates: Template[] }>;
    upsert: (data: { id?: string; projectId?: string; name: string; body_markdown: string }) => Promise<{ id: string }>;
    delete: (id: string) => Promise<{ ok: boolean }>;
  };
  clipboard: {
    writeText: (text: string) => void;
  };
};
