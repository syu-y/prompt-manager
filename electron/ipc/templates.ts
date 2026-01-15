import { IpcMain } from 'electron';
// @ts-ignore
import { getDatabase, generateId } from '../db/index.cjs';

export function registerTemplateHandlers(ipcMain: IpcMain) {
  // テンプレート一覧
  ipcMain.handle('templates:list', async (event, { projectId }) => {
    const db = getDatabase();
    const query = projectId
      ? 'SELECT * FROM prompt_templates WHERE project_id = ? OR project_id IS NULL ORDER BY created_at DESC'
      : 'SELECT * FROM prompt_templates WHERE project_id IS NULL ORDER BY created_at DESC';

    const templates = projectId
      ? db.prepare(query).all(projectId)
      : db.prepare(query).all();

    return { templates };
  });

  // テンプレート作成/更新
  ipcMain.handle('templates:upsert', async (event, { id, projectId, name, body_markdown }) => {
    const db = getDatabase();
    const now = Date.now();

    if (id) {
      db.prepare(`
        UPDATE prompt_templates 
        SET name = ?, body_markdown = ?, updated_at = ?
        WHERE id = ?
      `).run(name, body_markdown, now, id);
      return { id };
    } else {
      const newId = generateId();
      db.prepare(`
        INSERT INTO prompt_templates (id, project_id, name, body_markdown, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newId, projectId || null, name, body_markdown, now, now);
      return { id: newId };
    }
  });

  // テンプレート削除
  ipcMain.handle('templates:delete', async (event, { id }) => {
    const db = getDatabase();
    db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(id);
    return { ok: true };
  });
}
