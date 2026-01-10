import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { randomUUID } from 'crypto';

let db: Database.Database | null = null;

/**
 * データベース接続を取得
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

/**
 * データベースを初期化
 */
export function initDatabase(): void {
  // データベースファイルのパスを決定（ユーザーデータディレクトリ内）
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'prompt-manager.db');

  console.log('Database path:', dbPath);

  // データベース接続
  db = new Database(dbPath);

  // 外部キー制約を有効化
  db.pragma('foreign_keys = ON');

  // テーブル作成
  createTables();
}

/**
 * テーブル作成
 */
function createTables(): void {
  if (!db) return;

  // projects テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // prompt_entries テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT,
      body_markdown TEXT NOT NULL,
      is_starred INTEGER NOT NULL DEFAULT 0,
      source_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // インデックス作成
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_prompt_entries_project_updated
      ON prompt_entries(project_id, updated_at DESC);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_prompt_entries_project_star_updated
      ON prompt_entries(project_id, is_starred, updated_at DESC);
  `);

  // tags テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE (project_id, name)
    );
  `);

  // prompt_entry_tags テーブル（中間テーブル）
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_entry_tags (
      prompt_entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (prompt_entry_id, tag_id),
      FOREIGN KEY (prompt_entry_id) REFERENCES prompt_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  // prompt_templates テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      schema_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_templates_project
      ON prompt_templates(project_id);
  `);

  console.log('Database tables created successfully');
}

/**
 * UUID生成（簡易版）
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * 現在時刻をepoch msで取得
 */
export function now(): number {
  return Date.now();
}
