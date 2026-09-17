# Jev research deck

TypeSafe AI の **Jev / System One Models** を継続的に調査し、Markdownスライドとして整理するrepositoryです。

- [`slides.md`](slides.md): 人に見せるための要約・スライド正本
- [`research.md`](research.md): 出典、第三者検証、留保、更新履歴を残す調査台帳
- [`.agents/skills/misereru-slide-writing/SKILL.md`](.agents/skills/misereru-slide-writing/SKILL.md): misereru本体から取り込んだスライド内容設計Skill
- [`.agents/skills/misereru-presentation-script/SKILL.md`](.agents/skills/misereru-presentation-script/SKILL.md): misereru本体から取り込んだ任意の発表原稿Skill
- 公開スライド: https://myokoym.github.io/misereru-slide-jev/

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
- `misereru-presentation-script`: 必要な場合だけ `presentation-script.md` に口頭説明を持たせ、stable `key` でslideと対応させて相互レビューする

`presentation-script.md` は任意です。原稿を求めていない状態では作成・必須化しません。ファイルが存在する場合は通常buildで構造整合性を検査し、全slide分の原稿を確認する場合だけ `npm run build:script-complete` を使います。

## 現在の調査基準日

2026-09-17

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

`presentation-script.md` が存在する場合、その変更もGitHub Actionsのbuild対象です。
`misereru.config.json` では GitHub Pages publishing を有効にしています。
