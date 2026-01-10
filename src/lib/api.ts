import type { API } from "../../electron/api-types";

/**
 * Electron IPC API ラッパー
 * エラーハンドリングと型安全性を提供
 */
function getApi() {
  const api = (globalThis as any).window?.api;
  if (!api) throw new Error("Electron preload API (getApi()) is not available");
  return api;
}

/**
 * APIの開始／終了ログ出力
 */
function outputApiLog(isStart: boolean, target: string, process: string) {
  console.log(`[${isStart ? "START" : "END"}] Calling api: ${target}.${process}`);
}

/**
 * APIのログ出力ラッパー
 */
async function withIpcLog<T>(
  target: string,
  process: string,
  fn: () => Promise<T>,
  onErrorLabel?: string
): Promise<T> {
  outputApiLog(true, target, process);
  try {
    return await fn();
  } catch (error) {
    console.error(onErrorLabel ?? `Failed to call ${target}.${process}:`, error);
    throw error;
  } finally {
    outputApiLog(false, target, process);
  }
}

/**
 * API
 */
export const electronApi: API = {
  projects: {
    list() {
      return withIpcLog("projects", "list", () => getApi().projects.list(), "Failed to list projects:");
    },
    create(name: string) {
      return withIpcLog("projects", "create", () => getApi().projects.create(name), "Failed to create project:");
    },
    update(id: string, name: string) {
      return withIpcLog("projects", "update", () => getApi().projects.update(id, name), "Failed to update project:");
    },
    delete(id: string) {
      return withIpcLog("projects", "delete", () => getApi().projects.delete(id), "Failed to delete project:");
    }
  },

  entries: {
    list(params: {
      project_id: string;
      query?: string;
      filters?: { tag_ids?: string[]; starred?: boolean };
      sort?: "updated_desc" | "created_desc";
    }) {
      return withIpcLog("entries", "list", () => getApi().entries.list(params), "Failed to list entries:");
    },
    get(id: string) {
      return withIpcLog("entries", "getEntryDetail", () => getApi().entries.get(id), "Failed to get entry:");
    },
    upsert(params: {
      id?: string;
      project_id: string;
      title?: string;
      body_markdown: string;
      source_json?: string;
      is_starred?: boolean;
      tag_ids?: string[];
    }) {
      return withIpcLog("entries", "upsert", () => getApi().entries.upsert(params), "Failed to upsert entry:");
    },
    delete(id: string) {
      return withIpcLog("entries", "delete", () => getApi().entries.delete(id), "Failed to delete entry:");
    },
    toggleStar(id: string, is_starred: boolean) {
      return withIpcLog(
        "entries",
        "toggleStar",
        () => getApi().entries.toggleStar(id, is_starred),
        "Failed to toggle star:"
      );
    }
  },

  tags: {
    list(project_id: string) {
      return withIpcLog("tags", "list", () => getApi().tags.list(project_id), "Failed to list tags:");
    },
    create(project_id: string, name: string, color?: string) {
      return withIpcLog("tags", "create", () => getApi().tags.create(project_id, name, color), "Failed to create tag:");
    },
    attach(entry_id: string, tag_ids: string[]) {
      return withIpcLog("tags", "attach", () => getApi().tags.attach(entry_id, tag_ids), "Failed to attach tags:");
    }
  }
};
