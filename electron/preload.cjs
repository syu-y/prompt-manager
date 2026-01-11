"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// API定義
const api = {
    // Projects
    projects: {
        list: () => electron_1.ipcRenderer.invoke('projects:list'),
        create: (name) => electron_1.ipcRenderer.invoke('projects:create', { name }),
        update: (id, name) => electron_1.ipcRenderer.invoke('projects:update', { id, name }),
        delete: (id) => electron_1.ipcRenderer.invoke('projects:delete', { id })
    },
    // Entries
    entries: {
        list: (params) => electron_1.ipcRenderer.invoke('entries:list', params),
        get: (id) => electron_1.ipcRenderer.invoke('entries:get', { id }),
        upsert: (params) => electron_1.ipcRenderer.invoke('entries:upsert', params),
        delete: (id) => electron_1.ipcRenderer.invoke('entries:delete', { id }),
        toggleStar: (id, is_starred) => electron_1.ipcRenderer.invoke('entries:toggleStar', { id, is_starred }),
        toggleLock: (id, is_locked) => electron_1.ipcRenderer.invoke('entries:toggleLock', { id, is_locked })
    },
    // Tags
    tags: {
        list: () => electron_1.ipcRenderer.invoke('tags:list'),
        create: (name, category, color) => electron_1.ipcRenderer.invoke('tags:create', { name, category, color }),
        delete: (id) => electron_1.ipcRenderer.invoke('tags:delete', { id }),
        attach: (entry_id, tag_ids) => electron_1.ipcRenderer.invoke('tags:attach', { entry_id, tag_ids })
    }
};
// window.apiとして公開
try {
    console.log('[preload] loaded');
    electron_1.contextBridge.exposeInMainWorld('api', api);
}
catch (e) {
    console.error('[preload] error', e);
}
