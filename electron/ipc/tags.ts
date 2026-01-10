import { IpcMain } from 'electron';
import { getDatabase, generateId, now } from '../db/index.js';

export function registerTagHandlers(ipcMain: IpcMain): void {
  // タグ一覧
  ipcMain.handle('tags:list', async (_, { project_id }: { project_id: string }) => {
    const db = getDatabase();

    const tags = db.prepare(`
      SELECT id, name, color
      FROM tags
      WHERE project_id = ?
      ORDER BY name
    `).all(project_id);

    return { tags };
  });

  // タグ作成
  ipcMain.handle('tags:create', async (_, { project_id, name, color }: { project_id: string; name: string; color?: string }) => {
    const db = getDatabase();
    const id = generateId();
    const timestamp = now();

    try {
      db.prepare(`
        INSERT INTO tags (id, project_id, name, color, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, project_id, name, color || null, timestamp);

      return { id };
    } catch (error: any) {
      // UNIQUE制約違反の場合
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('Tag with this name already exists in this project');
      }
      throw error;
    }
  });

  // タグ紐付け（完全置換）
  ipcMain.handle('tags:attach', async (_, { entry_id, tag_ids }: { entry_id: string; tag_ids: string[] }) => {
    const db = getDatabase();

    const attachTags = db.transaction(() => {
      // 既存の紐付けを削除
      db.prepare('DELETE FROM prompt_entry_tags WHERE prompt_entry_id = ?').run(entry_id);

      // 新しい紐付けを作成
      if (tag_ids.length > 0) {
        const insert = db.prepare(`
          INSERT INTO prompt_entry_tags (prompt_entry_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tag_id of tag_ids) {
          insert.run(entry_id, tag_id);
        }
      }
    });

    attachTags();

    return { ok: true };
  });
}
