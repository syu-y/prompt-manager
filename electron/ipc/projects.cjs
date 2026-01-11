"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProjectHandlers = registerProjectHandlers;
// @ts-ignore
const index_cjs_1 = require("../db/index.cjs");
function registerProjectHandlers(ipcMain) {
    // プロジェクト一覧
    ipcMain.handle('projects:list', async () => {
        const db = (0, index_cjs_1.getDatabase)();
        const projects = db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.updated_at,
        COUNT(pe.id) as entry_count
      FROM projects p
      LEFT JOIN prompt_entries pe ON p.id = pe.project_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `).all();
        return { projects };
    });
    // プロジェクト作成
    ipcMain.handle('projects:create', async (_, { name }) => {
        const db = (0, index_cjs_1.getDatabase)();
        const id = (0, index_cjs_1.generateId)();
        const timestamp = (0, index_cjs_1.now)();
        db.prepare(`
      INSERT INTO projects (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(id, name, timestamp, timestamp);
        return { id };
    });
    // プロジェクト更新
    ipcMain.handle('projects:update', async (_, { id, name }) => {
        const db = (0, index_cjs_1.getDatabase)();
        const timestamp = (0, index_cjs_1.now)();
        db.prepare(`
      UPDATE projects
      SET name = ?, updated_at = ?
      WHERE id = ?
    `).run(name, timestamp, id);
        return { ok: true };
    });
    // プロジェクト削除
    ipcMain.handle('projects:delete', async (_, { id }) => {
        const db = (0, index_cjs_1.getDatabase)();
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        return { ok: true };
    });
}
