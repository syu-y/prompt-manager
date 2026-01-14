import { dialog, IpcMain } from 'electron';
// @ts-ignore
import { getDatabase, generateId, now } from '../db/index.cjs';
import { writeFileSync } from 'fs';

interface ListEntriesParams {
  project_id: string;
  query?: string;
  filters?: {
    tag_ids?: string[];
    starred?: boolean;
  };
  sort?: 'updated_desc' | 'created_desc';
}

interface UpsertEntryParams {
  id?: string;
  project_id: string;
  title?: string;
  body_markdown: string;
  source_json?: string;
  is_starred?: boolean;
  is_locked?: boolean;
  tag_ids?: string[];
}

export function registerEntryHandlers(ipcMain: IpcMain): void {
  // エントリ一覧
  ipcMain.handle('entries:list', async (_, params: ListEntriesParams) => {
    const db = getDatabase();
    const { project_id, query, filters, sort = 'updated_desc' } = params;

    let sql = `
      SELECT DISTINCT
        pe.id,
        pe.title,
        pe.created_at,
        pe.updated_at,
        pe.is_starred,
        pe.is_locked,
        SUBSTR(pe.body_markdown, 1, 100) as snippet
      FROM prompt_entries pe
      WHERE pe.project_id = ?
    `;

    const sqlParams: any[] = [project_id];

    // 検索クエリ
    if (query && query.trim()) {
      sql += ` AND (
        pe.title LIKE ? COLLATE NOCASE
        OR pe.body_markdown LIKE ? COLLATE NOCASE
      )`;
      const searchTerm = `%${query}%`;
      sqlParams.push(searchTerm, searchTerm);
    }

    // スター絞り込み
    if (filters?.starred) {
      sql += ` AND pe.is_starred = 1`;
    }

    // タグ絞り込み
    if (filters?.tag_ids && filters.tag_ids.length > 0) {
      sql += ` AND pe.id IN (
        SELECT prompt_entry_id
        FROM prompt_entry_tags
        WHERE tag_id IN (${filters.tag_ids.map(() => '?').join(',')})
      )`;
      sqlParams.push(...filters.tag_ids);
    }

    // ソート
    if (sort === 'created_desc') {
      sql += ` ORDER BY pe.created_at DESC`;
    } else {
      sql += ` ORDER BY pe.updated_at DESC`;
    }

    const entries = db.prepare(sql).all(...sqlParams);

    return { entries };
  });

  // エントリ取得
  ipcMain.handle('entries:get', async (_, { id }: { id: string }) => {
    const db = getDatabase();

    const entry = db.prepare(`
      SELECT
        id,
        project_id,
        title,
        body_markdown,
        source_json,
        is_starred,
        is_locked,
        created_at,
        updated_at
      FROM prompt_entries
      WHERE id = ?
    `).get(id);

    if (!entry) {
      throw new Error('Entry not found');
    }

    // タグIDを取得
    const tags = db.prepare(`
      SELECT tag_id
      FROM prompt_entry_tags
      WHERE prompt_entry_id = ?
    `).all(id);

    const tag_ids = tags.map((t: any) => t.tag_id);

    return {
      entry: {
        ...entry,
        tag_ids
      }
    };
  });

  // エントリ作成/更新
  ipcMain.handle('entries:upsert', async (_, params: UpsertEntryParams) => {
    const db = getDatabase();
    const {
      id: existingId,
      project_id,
      title,
      body_markdown,
      source_json,
      is_starred = false,
      is_locked = false,
      tag_ids = []
    } = params;

    const id = existingId || generateId();
    const timestamp = now();

    // トランザクション開始
    const upsertEntry = db.transaction(() => {
      if (existingId) {
        // 更新
        db.prepare(`
          UPDATE prompt_entries
          SET title = ?,
              body_markdown = ?,
              source_json = ?,
              is_starred = ?,
              is_locked = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          title || null,
          body_markdown,
          source_json || null,
          is_starred ? 1 : 0,
          is_locked ? 1 : 0,
          timestamp,
          id
        );
      } else {
        // 新規作成
        db.prepare(`
          INSERT INTO prompt_entries (
            id, project_id, title, body_markdown, source_json,
            is_starred, is_locked, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          project_id,
          title || null,
          body_markdown,
          source_json || null,
          is_starred ? 1 : 0,
          is_locked ? 1 : 0,
          timestamp,
          timestamp
        );
      }

      // タグの紐付けを更新（既存を削除して再作成）
      db.prepare('DELETE FROM prompt_entry_tags WHERE prompt_entry_id = ?').run(id);

      if (tag_ids.length > 0) {
        const insertTag = db.prepare(`
          INSERT INTO prompt_entry_tags (prompt_entry_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tag_id of tag_ids) {
          insertTag.run(id, tag_id);
        }
      }

      // プロジェクトのupdated_atも更新
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(timestamp, project_id);
    });

    upsertEntry();

    return { id };
  });

  // エントリ削除
  ipcMain.handle('entries:delete', async (_, { id }: { id: string }) => {
    const db = getDatabase();

    db.prepare('DELETE FROM prompt_entries WHERE id = ?').run(id);

    return { ok: true };
  });

  // スター切り替え
  ipcMain.handle('entries:toggleStar', async (_, { id, is_starred }: { id: string; is_starred: boolean }) => {
    const db = getDatabase();

    db.prepare(`
      UPDATE prompt_entries
      SET is_starred = ?
      WHERE id = ?
    `).run(is_starred ? 1 : 0, id);

    return { ok: true };
  });

  // ロック切り替え
  ipcMain.handle('entries:toggleLock', async (_, { id, is_locked }: { id: string; is_locked: boolean }) => {
    const db = getDatabase();

    db.prepare(`
      UPDATE prompt_entries
      SET is_locked = ?
      WHERE id = ?
    `).run(is_locked ? 1 : 0, id);

    return { ok: true };
  });


  // 1件エクスポート
  ipcMain.handle('entries:export', async (event, { id }) => {
    const db = getDatabase();

    const entry = db.prepare(`
      SELECT * FROM prompt_entries 
      WHERE id = ? 
      ORDER BY created_at DESC
    `).get(id);

    const fileName = entry.title === null ? '無題' : entry.title;
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `${fileName}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });

    if (filePath) {
      let content = `${entry.body_markdown}`;
      writeFileSync(filePath, content, 'utf8');
      return { success: true };
    }
    return { success: false };
  });
}
