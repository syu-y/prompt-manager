# Prompt Manager - セットアップ完了

プロジェクトのセットアップが完了しました！🎉

## 作成されたファイル構造

```
prompt-manager/
├── electron/                    # Electronメインプロセス
│   ├── main.ts                 # アプリケーションのエントリーポイント
│   ├── preload.ts              # IPCブリッジ（contextBridge）
│   ├── tsconfig.json           # TypeScript設定
│   ├── db/
│   │   └── index.ts            # SQLiteデータベース初期化
│   └── ipc/                    # IPCハンドラ
│       ├── projects.ts         # プロジェクト関連API
│       ├── entries.ts          # エントリ（履歴）関連API
│       └── tags.ts             # タグ関連API
│
├── src/                        # SvelteKit (UI)
│   ├── app.css                 # グローバルスタイル
│   ├── app.d.ts                # 型定義
│   ├── lib/
│   │   └── api.ts              # IPC APIラッパー
│   └── routes/
│       ├── +layout.svelte      # ルートレイアウト
│       ├── +layout.ts          # SPA設定
│       ├── +page.svelte        # プロジェクト一覧画面
│       └── projects/[projectId]/
│           └── +page.svelte    # プロジェクト詳細（2ペイン）
│
├── package.json                # npm設定とスクリプト
├── tsconfig.json               # TypeScript設定（ルート）
├── svelte.config.js            # SvelteKit設定
├── vite.config.ts              # Vite設定
├── setup.sh                    # セットアップスクリプト
├── README.md                   # プロジェクト説明
├── QUICKSTART.md               # クイックスタートガイド
└── .gitignore                  # Git除外設定
```

## 実装済み機能

### ✅ データベース層（SQLite）
- プロジェクト管理（CRUD）
- エントリ（履歴）管理（CRUD + 検索）
- タグ管理（作成、紐付け）
- 外部キー制約、インデックス設定

### ✅ IPC通信
- プロジェクト操作API
- エントリ操作API（upsert、検索、スター機能）
- タグ操作API
- エラーハンドリング付きラッパー

### ✅ UI（SvelteKit）
- プロジェクト一覧画面
  - プロジェクト作成・削除
  - カード形式の表示
- プロジェクト詳細画面（2ペイン）
  - 左ペイン：履歴一覧、検索機能
  - 右ペイン：編集・プレビュータブ
  - Markdown編集
  - 保存・コピー・削除機能
  - スター機能

## 次のステップ

### 1. セットアップと起動

```bash
cd prompt-manager

# セットアップ（初回のみ）
./setup.sh

# または手動で
npm install
cd electron && npx tsc && cd ..

# 開発サーバー起動
npm run dev
```

### 2. 動作確認

1. Electronアプリが起動する
2. プロジェクト一覧が表示される
3. 新規プロジェクトを作成できる
4. プロジェクトをクリックして詳細画面に遷移できる
5. プロンプトを作成・編集・保存できる
6. 履歴が左ペインに表示される
7. 検索機能が動作する

### 3. 今後の拡張予定

#### 優先度：高
- [ ] タグUIの実装（バックエンドは完成）
- [ ] エントリのリネーム機能
- [ ] 複製して新規作成機能

#### 優先度：中
- [ ] テンプレート機能のUI実装
- [ ] エクスポート機能（Markdown、JSON）
- [ ] 並び替え機能の強化

#### 優先度：低
- [ ] FTS5による全文検索強化
- [ ] バージョン履歴機能
- [ ] アプリ設定画面

## 技術的な注意点

### Electron + SvelteKitの統合
- `adapter-static`を使用してSPAとしてビルド
- Electronはローカルの`build/index.html`を読み込み
- IPCを通じてRendererとMainが通信

### セキュリティ
- `contextIsolation: true`
- `nodeIntegration: false`
- `contextBridge`で安全にAPIを公開

### データベース
- SQLite（better-sqlite3）を使用
- ユーザーデータディレクトリに保存
- 外部キー制約有効化

### 状態管理
- Svelte 5のrunesを使用（`$state`, `$derived`, `$effect`）
- IPCを通じたデータ取得
- 楽観的UI更新

## よくある問題と解決方法

### Electronが起動しない
→ `cd electron && npx tsc && cd ..` を実行

### データベースをリセットしたい
→ `~/Library/Application Support/Electron/prompt-manager.db`を削除（macOS）

### SvelteKitの変更が反映されない
→ ブラウザをリロード（Cmd/Ctrl + R）

## コマンドリファレンス

```bash
# 開発
npm run dev              # 開発サーバー起動
npm run dev:svelte       # SvelteKitのみ起動
npm run dev:electron     # Electronのみ起動

# ビルド
npm run build            # 全体ビルド
npm run build:vite       # SvelteKitビルド
npm run build:electron   # ElectronのTSコンパイル
npm run electron:package # パッケージング

# その他
npm run check            # 型チェック
npm run lint             # Lint実行
```

## 開発の進め方

1. **機能追加の流れ**
   - データベーススキーマ確認（必要なら追加）
   - IPCハンドラ追加（electron/ipc/）
   - Preloadの型定義更新
   - API wrapper更新（src/lib/api.ts）
   - UI実装（src/routes/）

2. **デバッグ**
   - Electronの DevTools が自動で開きます
   - Console でエラー確認
   - Network タブは使えません（IPCのため）

3. **テスト**
   - 手動テストで動作確認
   - データベース操作はトランザクションで安全に

## サポート

問題が発生した場合は：
1. QUICKSTART.md のトラブルシューティングを確認
2. electron/のコンパイル状態を確認
3. DevToolsのConsoleでエラーを確認

---

Happy Coding! 🚀
