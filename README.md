# Jev research deck

TypeSafe AI の **Jev / System One Models** を継続的に調査し、Markdownスライドとして整理するrepositoryです。

- [`AGENTS.md`](AGENTS.md): このrepositoryをAI agentが継続更新するときの正本・同期・公開・誤操作防止ルール
- [`slides.md`](slides.md): 人に見せるための要約・スライド正本
- [`presentation-script.md`](presentation-script.md): stable `key` で各slideに対応する発表原稿の正本
- [`article.md`](article.md): スライドを見なくても単体で読める記事形式の正本
- [`research.md`](research.md): 出典、第三者検証、留保、更新履歴を残す調査台帳
- [`.agents/skills/misereru-slide-writing/SKILL.md`](.agents/skills/misereru-slide-writing/SKILL.md): misereru本体から取り込んだスライド内容設計Skill
- [`.agents/skills/misereru-presentation-script/SKILL.md`](.agents/skills/misereru-presentation-script/SKILL.md): misereru本体から取り込んだ発表原稿Skill
- [`.agents/skills/misereru-article-writing/SKILL.md`](.agents/skills/misereru-article-writing/SKILL.md): misereru本体から取り込んだ記事作成Skill
- 公開スライド: https://myokoym.github.io/misereru-slide-jev/
- 公開発表原稿: https://myokoym.github.io/misereru-slide-jev/presentation-script.html
- 公開記事: https://myokoym.github.io/misereru-slide-jev/article.html

## AI agentの運用

Jev資料をAIで更新する場合は、最初に [`AGENTS.md`](AGENTS.md) を確認します。

このrepositoryでは「スライドを更新」「資料を更新」「調査結果を反映」は、**既存repository内の正本を継続更新する依頼**として扱います。明示依頼がない限り、別PPTX、別Markdown一式、別repository、別ホスティング先を新規作成しません。

調査更新の基本順序は `research.md` → `slides.md` → 必要に応じて `presentation-script.md` / `article.md` → build / Pages deploy確認です。詳細な同期条件と禁止事項は`AGENTS.md`を正とします。

## 調査方針

- TypeSafe公式・公式ドキュメント・公式evalを一次情報として優先する
- ベンダー自身の性能主張と第三者実測を分ける
- 価格・モデルversion・rate limit・access条件は日付付きで扱う
- 「型として不正な出力をしない」と「意味的に正しい判断」を混同しない
- 日本語の有用な検証記事があれば優先的に追加する
- 新情報が出ても、重要度が低いものはスライドへ直接追加せず `research.md` に留める
- Jev固有の優位を主張する場合は、LLMのlogit/logprobs利用や既存の専用ロジックでも代替できないか比較する

## Agent Skills

`misereru` 本体のAgent Skillを同じパスで取り込んでいます。

- `misereru-slide-writing`: `slides.md` の生成・再構成・推敲。Jev資料は調査・共有を主目的とするため、原則として **Reference mode** を適用する
- `misereru-presentation-script`: `presentation-script.md` に口頭説明を持たせ、stable `key` でslideと対応させて相互レビューする
- `misereru-article-writing`: `article.md` を、スライド参照なしで単体理解できるブログ記事・解説記事として構成し、slides / researchとの事実整合性を確認する

このrepositoryでは `presentation-script.md` を作成済みで、生成される目次を含む全slideを対象にしたcomplete scriptとして管理します。通常buildでは構造整合性を検査し、全slide分のcoverageを明示的に確認する場合は `npm run build:script-complete` を使います。

`article.md` はスライドや発表原稿の単純な書き起こしではありません。画面依存の表現を避け、記事だけで前提・根拠・留保・結論が理解できるよう、章立てと接続を独立して構成します。

## 現在の調査基準日

2026-09-18

## 主な追跡対象

- Jevのmodel update / changelog / jaggedness
- price / latency / rate limit / early access条件
- accuracy / calibrationの独立検証
- agent routing / browser automation / RAG / guardrailでの実用例
- real-time / game / interactive用途の公開デモ、harness、再現実測
- 日本・アジア圏からの実測とリージョン差
- OpenAI / Anthropic / Google等の既存モデルとの役割分担
- LLMのlogit/logprobs利用、rule / utility AI、専用modelとの比較
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

`article.md` もGitHub Actionsのbuild対象です。このrepositoryでは `publish.githubPages.article.enabled` を有効にしているため、Markdownを読み物向けの `dist/site/article.html` へ変換して公開します。記事はraw HTMLを許可せず、H1を1つだけ持つMarkdown文書として検査します。

`misereru.config.json` では GitHub Pages publishing、発表原稿、記事のPages公開を有効にしています。