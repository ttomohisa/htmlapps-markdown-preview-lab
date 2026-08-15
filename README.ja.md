# Markdown Preview Lab

GitHub / Qiita / Zenn 風の見え方とMarkdown互換性を、ブラウザー内だけで比較できる単一HTMLエディタです。

[English README](README.md)

## 主な機能
- Markdownのリアルタイム編集・プレビュー
- GitHub / Qiita / Zenn / Standard / Minimal / Print / Custom CSS
- 2プレビュー比較モード
- **編集欄 + 比較A + 比較B の3ペイン連動スクロール**
- 投稿先ごとの簡易互換性チェック
- LocalStorage自動保存
- Markdownファイルの読み込み・保存
- 初回サンプルと、未編集時だけ表示される **「新規作成」** 導線
- CDNなし・外部ランタイム依存なし

## 使い方
すぐ試す場合は `dist/index.html` を開いてください。Windowsでは `build-standalone.bat` で再ビルドできます。

## 開発
編集対象は `src/index.template.html` です。変更後は以下を実行します。

```powershell
./scripts/check-repository.ps1
```

## GitHub Pages
`.github/workflows/deploy-pages.yml` を同梱しています。リポジトリの **Settings → Pages → Source** を **GitHub Actions** に設定すると、mainへのpushでビルド・公開できます。

## ライセンス
MIT
