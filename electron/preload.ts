import { contextBridge, ipcRenderer } from 'electron';
import type { API } from './api-types';


// API定義
const api: API = {
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (name: string) => ipcRenderer.invoke('projects:create', { name }),
    update: (id: string, name: string) => ipcRenderer.invoke('projects:update', { id, name }),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', { id }),
    exportAll: (id: string) => ipcRenderer.invoke('projects:exportAll', { id })
  },

  entries: {
    list: (params: {
      project_id: string;
      query?: string;
      filters?: { tag_ids?: string[]; starred?: boolean };
      sort?: 'updated_desc' | 'created_desc';
    }) => ipcRenderer.invoke('entries:list', params),

    get: (id: string) => ipcRenderer.invoke('entries:get', { id }),

    upsert: (params: {
      id?: string;
      project_id: string;
      title?: string;
      body_markdown: string;
      source_json?: string;
      is_starred?: boolean;
      is_locked?: boolean;
      tag_ids?: string[];
    }) => ipcRenderer.invoke('entries:upsert', params),

    delete: (id: string) => ipcRenderer.invoke('entries:delete', { id }),

    toggleStar: (id: string, is_starred: boolean) =>
      ipcRenderer.invoke('entries:toggleStar', { id, is_starred }),

    toggleLock: (id: string, is_locked: boolean) =>
      ipcRenderer.invoke('entries:toggleLock', { id, is_locked }),

    export: (id: string) => ipcRenderer.invoke('entries:export', { id }),
  },

  tags: {
    list: () => ipcRenderer.invoke('tags:list'),
    create: (name: string, category?: string, color?: string) =>
      ipcRenderer.invoke('tags:create', { name, category, color }),
    delete: (id: string) => ipcRenderer.invoke('tags:delete', { id }),
    attach: (entry_id: string, tag_ids: string[]) =>
      ipcRenderer.invoke('tags:attach', { entry_id, tag_ids })
  }
};

// window.apiとして公開
try {
  console.log('[preload] loaded');
  contextBridge.exposeInMainWorld('api', api);
} catch (e) {
  console.error('[preload] error', e);
}
