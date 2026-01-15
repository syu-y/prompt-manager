# Prompt Manager

プロンプト管理のためのデスクトップアプリケーション

## Features

- プロジェクト単位でのプロンプト管理
- 2ペイン構成（履歴一覧 + 編集エリア）
- タグ機能（23種類のデフォルトタグ + カスタムタグ）
- テンプレート機能
- Markdownサポート
- エクスポート機能（個別/全体ZIP）
- 検索・ソート・絞り込み
- クリップボードコピー

## Installation

### Windows

1. [Releases](https://github.com/yourusername/prompt-manager/releases)から最新の`Prompt Manager Setup X.X.X.exe`をダウンロード
2. インストーラーを実行
3. アプリケーションを起動

## Development

### Prerequisites

- Node.js 18.x以上
- npm 9.x以上

### Setup

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/prompt-manager.git
cd prompt-manager

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

### Build

```bash
# SvelteKitのビルド
npm run build:vite

# Electronのビルド
npm run build:electron

# パッケージング (Windows)
npx electron-builder --win --publish never
```

## Technology Stack

- **Electron**: デスクトップアプリケーションフレームワーク
- **SvelteKit**: UIフレームワーク
- **SQLite**: ローカルデータベース
- **better-sqlite3**: SQLiteバインディング
- **marked**: Markdownパーサー
- **adm-zip**: ZIPファイル生成

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Third-Party Licenses

This application uses various open-source packages.
 See [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.txt) for complete license information.

Major dependencies:
- Electron (MIT)
- SvelteKit (MIT)
- better-sqlite3 (MIT)
- marked (MIT)
- adm-zip (MIT)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

syu-y

## Acknowledgments

Special thanks to all the open-source projects that made this application possible.
