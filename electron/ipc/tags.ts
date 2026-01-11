import { IpcMain } from 'electron';
// @ts-ignore
import { getDatabase, generateId, now } from '../db/index.cjs';

export function registerTagHandlers(ipcMain: IpcMain): void {
  // タグ一覧（全プロジェクト共通）
  ipcMain.handle('tags:list', async () => {
    const db = getDatabase();

    const tags = db.prepare(`
      SELECT id, name, category, color, is_default
      FROM tags
      ORDER BY 
        CASE category
          WHEN '工程' THEN 1
          WHEN '対象' THEN 2
          WHEN '性質' THEN 3
          ELSE 4
        END,
        name
    `).all();

    return { tags };
  });

  // タグ作成
  ipcMain.handle('tags:create', async (_, { name, category, color }: { name: string; category?: string; color?: string }) => {
    const db = getDatabase();
    const id = generateId();
    const timestamp = now();

    try {
      db.prepare(`
        INSERT INTO tags (id, name, category, color, is_default, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `).run(id, name, category || null, color || null, timestamp);

      return { id };
    } catch (error: any) {
      // UNIQUE制約違反の場合
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('Tag with this name already exists');
      }
      throw error;
    }
  });

  // タグ削除（デフォルトタグは削除不可）
  ipcMain.handle('tags:delete', async (_, { id }: { id: string }) => {
    const db = getDatabase();

    // デフォルトタグかチェック
    const tag = db.prepare('SELECT is_default FROM tags WHERE id = ?').get(id) as { is_default: number } | undefined;

    if (!tag) {
      throw new Error('Tag not found');
    }

    if (tag.is_default === 1) {
      throw new Error('Cannot delete default tag');
    }

    // タグを削除（CASCADE により prompt_entry_tags も自動削除される）
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);

    return { ok: true };
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
