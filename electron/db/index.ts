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

  // デフォルトタグの初期化
  initializeDefaultTags();
}

/**
 * デフォルトタグを初期化
 */
function initializeDefaultTags(): void {
  if (!db) return;

  const defaultTags = [
    // A. 工程（フェーズ）タグ
    { name: '仕様整理', category: '工程', color: '#3B82F6' },
    { name: '要件定義', category: '工程', color: '#3B82F6' },
    { name: '設計', category: '工程', color: '#3B82F6' },
    { name: '実装', category: '工程', color: '#10B981' },
    { name: 'テスト', category: '工程', color: '#F59E0B' },
    { name: 'リファクタ', category: '工程', color: '#8B5CF6' },
    { name: 'バグ修正', category: '工程', color: '#EF4444' },
    { name: 'ドキュメント', category: '工程', color: '#6B7280' },

    // B. 対象（領域）タグ
    { name: 'UI', category: '対象', color: '#EC4899' },
    { name: 'API', category: '対象', color: '#14B8A6' },
    { name: 'DB', category: '対象', color: '#F97316' },
    { name: '認証', category: '対象', color: '#8B5CF6' },
    { name: 'パフォーマンス', category: '対象', color: '#EAB308' },
    { name: 'セキュリティ', category: '対象', color: '#DC2626' },
    { name: 'CI/CD', category: '対象', color: '#059669' },
    { name: 'インフラ', category: '対象', color: '#0EA5E9' },

    // C. 性質（用途）タグ
    { name: '調査', category: '性質', color: '#06B6D4' },
    { name: 'メモ', category: '性質', color: '#64748B' },
    { name: '相談', category: '性質', color: '#A855F7' },
    { name: '依頼', category: '性質', color: '#F97316' },
    { name: '決定事項', category: '性質', color: '#10B981' },
    { name: '共有', category: '性質', color: '#0EA5E9' },
  ];

  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (id, name, category, color, is_default, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `);

  for (const tag of defaultTags) {
    insertTag.run(generateId(), tag.name, tag.category, tag.color, Date.now());
  }

  console.log(`Initialized ${defaultTags.length} default tags`);
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
      is_locked INTEGER NOT NULL DEFAULT 0,
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

  // tags テーブル（全プロジェクト共通）
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      color TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
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
