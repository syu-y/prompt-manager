# Prompt Manager

AIプロンプトを管理するデスクトップアプリケーション

## 技術スタック

- **TypeScript**: 型安全な開発
- **SvelteKit**: UIフレームワーク
- **Electron**: デスクトップアプリケーション
- **SQLite (better-sqlite3)**: ローカルデータベース

## 機能

- ✅ プロジェクト単位でプロンプトを管理
- ✅ Markdown形式でプロンプトを作成・編集
- ✅ 履歴管理とプレビュー機能
- ✅ 検索機能
- ✅ スター機能
- 🚧 タグ付け機能（準備中）
- 🚧 テンプレート機能（準備中）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. TypeScriptのコンパイル

Electronのコードをコンパイルします：

```bash
cd electron
npx tsc
cd ..
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

これにより以下が起動します：
- SvelteKitの開発サーバー（ポート5173）
- Electronアプリケーション

## ビルド

本番用のビルド：

```bash
npm run build:vite    # SvelteKitのビルド
cd electron && npx tsc && cd ..  # Electronのコンパイル
npm run electron:build  # Electronアプリのパッケージング
```

## プロジェクト構造

```
prompt-manager/
├── electron/           # Electronメインプロセス
│   ├── main.ts        # エントリーポイント
│   ├── preload.ts     # IPCブリッジ
│   ├── db/            # データベース
│   │   └── index.ts   # DB初期化・ヘルパー
│   └── ipc/           # IPCハンドラ
│       ├── projects.ts
│       ├── entries.ts
│       └── tags.ts
├── src/               # SvelteKit (UI)
│   ├── lib/
│   │   └── api.ts     # IPC APIラッパー
│   └── routes/        # ページ
│       ├── +page.svelte           # プロジェクト一覧
│       └── projects/[projectId]/
│           └── +page.svelte       # プロジェクト詳細（2ペイン）
└── package.json
```

## 開発時のメモ

### データベースの場所

開発時のデータベースファイルは以下に作成されます：
- macOS: `~/Library/Application Support/Electron/prompt-manager.db`
- Windows: `%APPDATA%/Electron/prompt-manager.db`
- Linux: `~/.config/Electron/prompt-manager.db`

### デバッグ

Electronアプリ起動時に自動でDevToolsが開きます。

## ライセンス

MIT
