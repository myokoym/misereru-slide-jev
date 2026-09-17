# misereru

Markdownを正本として、GitHub Actions上でスライドHTMLを生成するためのテンプレートです。通常運用はスマートフォン上のChatGPT / GitHubだけでも完結でき、ローカルPCやNode.js CLIを必須にしません。

> **名称 `misereru` は仮決定です。**
> 開発・調査資料は [`develop` branch](https://github.com/myokoym/misereru/tree/develop) 側で管理します。

## 使い方

このrepositoryをGitHub Template Repositoryとして使い、原則 **1資料 = 1 repository** で管理します。

```text
misereru (Template Repository)
  ↓ Use this template
presentation repository
  ↓
slides.md を編集
  ↓ commit / push
GitHub Actions
  ↓
Marp
  ├─ HTML             常時生成
  ├─ PDF              設定時のみ
  └─ GitHub Pages     設定時のみ公開
```

通常編集するのは [`slides.md`](slides.md) です。出力や公開方法を変える場合だけ [`misereru.config.json`](misereru.config.json) を編集します。

## `slides.md` はサンプル兼テンプレート

`slides.md` 自体に、資料作成で使う代表的なページを一通り入れています。

- 表紙
- セクション見出し
- 通常本文
- 長めの本文
- 箇条書き
- 番号付き手順
- 表
- 引用
- コードブロック
- 外部リンク
- 強調表現
- 複数要素を含むページ
- まとめ

`type: "section"` のページから目次を自動生成します。新しい資料では、`slides.md` の文章を書き換え、不要なページを削除して使います。別の「最小テンプレート」と「サンプルデッキ」は持たず、この1ファイルを基準にします。

## 既定の出力

- HTML: 有効。`dist/site/index.html` を生成
- PDF: 無効。必要な資料だけ有効化
- GitHub Pages: 無効。明示的に有効化した場合だけ公開
- Google Slides / PPTX: 初期production targetには含めない

GitHub Pagesを使う場合は、各資料repositoryで初回だけ Settings > Pages から GitHub Actions publishing を有効化する想定です。公開を自動化するためだけの高権限PATは標準要求しません。

## Template files

新しい資料repositoryで必要な実行ファイルは、テンプレート側にすべて含めます。外部のmisereru repositoryを実行時に参照しません。

```text
slides.md                   # サンプル兼 Markdown source
misereru.config.json        # output / publish 設定
package.json                # Marp依存とbuild command
marp.config.mjs             # Marp設定
themes/                     # 日本語向けMarp theme
scripts/build-project.mjs   # 目次生成とbuild処理
.github/workflows/build.yml # GitHub Actions build / publish
```

`slides.md`、設定、theme、build処理を変更してpushすると、GitHub Actionsが設定済みoutputを生成します。

## Repository branch model

このrepository自身は、配布物と開発資料をbranchで分けます。

- [`main`](https://github.com/myokoym/misereru/tree/main): Template Repositoryとして配布する自己完結セット
- [`develop`](https://github.com/myokoym/misereru/tree/develop): 開発・統合用。docs / research / prototype等を含む

Template Repositoryから通常作成した資料repositoryにはdefault branchである `main` の内容を使う想定です。開発資料を利用者の資料repositoryへ持ち込まないため、`main` には配布に必要なものだけを置きます。

## 開発・設計資料

開発者向け資料は [`develop` branch](https://github.com/myokoym/misereru/tree/develop) を参照します。Template Repositoryから作成した別repositoryでもリンクが切れないよう、ここでは元repositoryへのリンクを使います。

- [運用モデル](https://github.com/myokoym/misereru/blob/develop/docs/product/operation-model.md)
- [要件](https://github.com/myokoym/misereru/blob/develop/docs/product/requirements.md)
- [スライドツール調査](https://github.com/myokoym/misereru/blob/develop/docs/research/slide-tools.md)
- [日本語組版調査](https://github.com/myokoym/misereru/blob/develop/docs/research/japanese-typesetting.md)
- [source / output architecture](https://github.com/myokoym/misereru/blob/develop/docs/research/source-output-architecture.md)
- [Marp prototype](https://github.com/myokoym/misereru/blob/develop/docs/research/marp-prototype.md)
- [命名調査](https://github.com/myokoym/misereru/blob/develop/docs/research/naming.md)

正本 `slides.md` はMarp固有front matterを持たせません。build時に一時的なMarp入力を生成し、初期production buildではMarpだけをrendererとして使用します。
