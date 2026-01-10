# クイックスタートガイド

## セットアップ（初回のみ）

```bash
# セットアップスクリプトを実行
./setup.sh

# または手動で
npm install
cd electron && npx tsc && cd ..
```

## 開発

```bash
# 開発サーバーを起動
npm run dev
```

これで以下が自動的に起動します：
1. SvelteKitの開発サーバー（http://localhost:5173）
2. Electronアプリケーション

### 開発時のポイント

- **ホットリロード**: SvelteKitの変更は自動的にリロードされます
- **Electronの変更**: electron/内のファイルを変更した場合は、以下を実行：
  ```bash
  cd electron && npx tsc && cd ..
  ```
  その後、Electronアプリを再起動

## ビルド

```bash
# 本番用ビルド
npm run build

# または段階的に
npm run build:vite      # SvelteKitのビルド
npm run build:electron  # ElectronのTypeScriptコンパイル
npm run electron:package # パッケージング
```

## トラブルシューティング

### Electronが起動しない

1. Electronコードがコンパイルされているか確認：
   ```bash
   ls electron/*.js
   ```

2. コンパイルされていない場合：
   ```bash
   cd electron && npx tsc && cd ..
   ```

### データベースをリセットしたい

データベースファイルを削除：
- macOS: `~/Library/Application Support/Electron/prompt-manager.db`
- Windows: `%APPDATA%/Electron/prompt-manager.db`
- Linux: `~/.config/Electron/prompt-manager.db`

## 主な画面

### プロジェクト一覧（/）
- プロジェクトの作成・削除
- プロジェクト選択で詳細画面へ

### プロジェクト詳細（/projects/[id]）
- 左ペイン：履歴一覧
  - 検索機能
  - スター機能
  - 履歴選択
- 右ペイン：編集・プレビュー
  - Markdown編集
  - プレビュー表示
  - 保存・コピー・削除

## 次のステップ

1. タグ機能の実装
2. テンプレート機能の追加
3. エクスポート機能
4. 全文検索の強化（FTS5）
