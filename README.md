# Jev research deck

TypeSafe AI の **Jev / System One Models** を継続的に調査し、Markdownスライドとして整理するrepositoryです。

- [`slides.md`](slides.md): 人に見せるための要約・スライド正本
- [`research.md`](research.md): 出典、第三者検証、留保、更新履歴を残す調査台帳

## 調査方針

- TypeSafe公式・公式ドキュメント・公式evalを一次情報として優先する
- ベンダー自身の性能主張と第三者実測を分ける
- 価格・モデルversion・rate limit・access条件は日付付きで扱う
- 「型として不正な出力をしない」と「意味的に正しい判断」を混同しない
- 日本語の有用な検証記事があれば優先的に追加する
- 新情報が出ても、重要度が低いものはスライドへ直接追加せず `research.md` に留める

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

## スライド生成

このrepositoryは `misereru` テンプレートから作成されています。
通常編集するのは `slides.md` で、GitHub ActionsがHTMLを生成します。

```text
slides.md
  ↓ commit / push
GitHub Actions
  ↓
Marp
  ↓
HTML
```

公開設定は別途明示的に有効化しない限り行いません。
