# 🚀 Prompt Manager - デスクトップアプリビルドガイド

## 📥 ダウンロード後の手順

### 1️⃣ セットアップ（初回のみ）

ZIPファイルを解凍後：

```bash
cd prompt-manager

# 依存関係をインストール
npm install

# Electronコードをコンパイル
cd electron && npx tsc && cd ..
```

または：

```bash
./setup.sh
```

### 2️⃣ デスクトップアプリとしてビルド

```bash
# 簡単な方法
./build.sh

# または
npm run build
```

⏱️ ビルド時間: 初回5-10分、2回目以降2-4分

### 3️⃣ アプリケーションの起動

ビルドが完了したら、`dist/`フォルダ内のファイルを実行：

#### Windows 🪟
- `dist/Prompt Manager Setup.exe` - インストーラー
- または `dist/win-unpacked/Prompt Manager.exe` - ポータブル版

#### macOS 🍎
- `dist/Prompt Manager.dmg` - DMGインストーラー
- または `dist/mac/Prompt Manager.app` - 直接起動

#### Linux 🐧
- `dist/Prompt Manager-*.AppImage` - AppImage（実行権限付与後ダブルクリック）
- または `dist/*.deb` - Debianパッケージ

---

## 📚 詳細ドキュメント

- **README.md** - プロジェクト概要と基本的な使い方
- **BUILD_GUIDE.md** - 詳細なビルド手順
- **BUILD_NOTES.md** - ビルド時の注意点とトラブルシューティング
- **QUICKSTART.md** - 開発環境のクイックスタート
- **build/ICON_GUIDE.md** - カスタムアイコンの設定方法

---

## 🔧 開発モードで試したい場合

ビルドせずに開発モードで動作確認：

```bash
npm run dev
```

Electronアプリが自動的に起動します（ホットリロード有効）

---

## ⚡ まとめ

1. ✅ `npm install` - 依存関係インストール
2. ✅ `cd electron && npx tsc && cd ..` - TypeScriptコンパイル
3. ✅ `npm run build` - デスクトップアプリビルド
4. 🎉 `dist/`内のアプリを起動！

---

## 💡 ヒント

- **開発中**: `npm run dev`を使う（速い）
- **配布用**: `npm run build`を使う（実行可能ファイル生成）
- **特定OS向け**: `npx electron-builder --windows`など

問題が発生した場合は `BUILD_NOTES.md` のトラブルシューティングを参照してください。
