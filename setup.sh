#!/bin/bash

echo "🚀 Prompt Manager セットアップ"
echo ""

echo "📦 依存関係をインストール中..."
npm install

echo ""
echo "🔨 Electronコードをコンパイル中..."
cd electron && npx tsc && cd ..

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "開発サーバーを起動するには:"
echo "  npm run dev"
echo ""
echo "ビルドするには:"
echo "  npm run build"
