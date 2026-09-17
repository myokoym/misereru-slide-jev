# Jev research deck

TypeSafe AI の **Jev / System One Models** を継続的に調査し、Markdownスライドとして整理するrepositoryです。

- [`slides.md`](slides.md): 人に見せるための要約・スライド正本
- [`presentation-script.md`](presentation-script.md): stable `key` で各slideに対応する発表原稿の正本
- [`research.md`](research.md): 出典、第三者検証、留保、更新履歴を残す調査台帳
- [`.agents/skills/misereru-slide-writing/SKILL.md`](.agents/skills/misereru-slide-writing/SKILL.md): misereru本体から取り込んだスライド内容設計Skill
- [`.agents/skills/misereru-presentation-script/SKILL.md`](.agents/skills/misereru-presentation-script/SKILL.md): misereru本体から取り込んだ発表原稿Skill
- 公開スライド: https://myokoym.github.io/misereru-slide-jev/
- 公開発表原稿: https://myokoym.github.io/misereru-slide-jev/presentation-script.html

## 調査方針

- TypeSafe公式・公式ドキュメント・公式evalを一次情報として優先する
- ベンダー自身の性能主張と第三者実測を分ける
- 価格・モデルversion・rate limit・access条件は日付付きで扱う
- 「型として不正な出力をしない」と「意味的に正しい判断」を混同しない
- 日本語の有用な検証記事があれば優先的に追加する
- 新情報が出ても、重要度が低いものはスライドへ直接追加せず `research.md` に留める

## Agent Skills

`misereru` 本体のAgent Skillを同じパスで取り込んでいます。

- `misereru-slide-writing`: `slides.md` の生成・再構成・推敲。Jev資料は調査・共有を主目的とするため、原則として **Reference mode** を適用する
- `misereru-presentation-script`: `presentation-script.md` に口頭説明を持たせ、stable `key` でslideと対応させて相互レビューする

このrepositoryでは `presentation-script.md` を作成済みで、生成される目次を含む全slideを対象にしたcomplete scriptとして管理します。通常buildでは構造整合性を検査し、全slide分のcoverageを明示的に確認する場合は `npm run build:script-complete` を使います。

## 現在の調査基準日

2026-09-18

## 主な追跡対象

- Jevのmodel update / changelog / jaggedness
- price / latency / rate limit / early access条件
- accuracy / calibrationの独立検証
- agent routing / browser automation / RAG / guardrailでの実用例
- 日本・アジア圏からの実測
- OpenAI / Anthropic / Google等の既存モデルとの役割分担
- production利用時のSLA・privacy・data retention

## スライド生成・公開

このrepositoryは `misereru` テンプレートから作成されています。
通常編集するのは `slides.md` で、GitHub ActionsがHTMLを生成し、GitHub Pagesへ公開します。

```text
slides.md
  ↓ commit / push
GitHub Actions
  ↓
Marp
  ↓
dist/site/index.html
  ↓
GitHub Pages
  ↓
https://myokoym.github.io/misereru-slide-jev/
```

`presentation-script.md` の変更もGitHub Actionsのbuild対象です。このrepositoryでは `publish.githubPages.presentationScript.enabled` を有効にしているため、正本Markdownを検証した後、閲覧用の `dist/site/presentation-script.html` を生成してGitHub Pagesへ公開します。

公開発表原稿は実際のpresentation順で並び、各entryにslide番号・見出し・Narrationを表示し、対応するスライドへ戻るリンクを持ちます。raw `presentation-script.md` はPagesには公開しません。

`misereru.config.json` では GitHub Pages publishing と発表原稿のPages公開を有効にしています。
