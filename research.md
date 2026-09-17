# Jev 継続調査ノート

最終更新: 2026-09-17

このファイルは、TypeSafe AI の **Jev / System One Models** を継続的に調査するための根拠メモです。
`slides.md` は見せるための要約、ここは出典・留保・第三者検証まで残す調査台帳として扱います。

## 調査ルール

- 一次情報（TypeSafe公式・公式ドキュメント・公式eval）を優先する。
- ベンダー自身の性能値と第三者の実測を混ぜない。
- 「型として不正な出力をしない」と「判断が正しい」を分ける。
- 価格、モデルバージョン、early access、rate limit は変化しやすいため日付付きで扱う。
- 第三者検証は、サンプル数・地域・ネットワーク・比較条件まで確認する。
- 日本語で有用な実測記事が出た場合は優先的に追記する。

## 1. Jevとは何か

TypeSafe AI は Jev を、最初の **System One Model** と位置づけています。
LLMのように自由文を生成するのではなく、`state` と型付きの `questions` を受け取り、コードが直接使える確率付きの判断を返すモデルです。

公式ドキュメントの基本形は次のとおりです。

- **Choice**: 定義済み候補から1つ選ぶ。候補ごとの確率と confidence を返す。
- **Score**: 定義済みルーブリック上で評価する。各レベルの確率と confidence を返す。
- **Noul**: yes/no のうち yes 側の確率を 0〜1 で返す。

複数 question は同じ state に対して並列・独立に評価されます。TypeSafe は、複雑な判断を1プロンプトに詰めるより、狭い判断へ分解し、最終的な組み合わせをコード側で行う設計を推奨しています。

一次情報:
- https://docs.typesafe.ai/introduction
- https://docs.typesafe.ai/introduction/quickstart
- https://typesafe.ai/blog/introducing-system-one-models-and-jev

## 2. APIの現状

公式 Quick Start では以下のAPIが示されています。

```text
POST https://api.typesafe.ai/v1/systemone
```

代表的なリクエスト:

```json
{
  "state": "入力状態",
  "model": "jev-latest",
  "questions": {
    "route": {
      "type": "choice",
      "instructions": "どこへ振り分けるか",
      "criteria": {
        "a": "候補A",
        "b": "候補B"
      }
    }
  }
}
```

Python SDK と JavaScript SDK が公開されており、Python SDK は `jev-latest` を既定モデルとして利用する例が公式Quick Startにあります。

一次情報:
- https://docs.typesafe.ai/introduction/quickstart
- https://docs.typesafe.ai/sdk

## 3. 価格とレイテンシ

### 価格

2026-09-17時点で、公式サイトは **入力 $42 / 10億 tokens = $0.042 / 100万 input tokens** と表示しています。
第三者記事でも同価格と output 無料が確認されています。

一次情報:
- https://typesafe.ai/

日本語確認:
- https://dev.classmethod.jp/articles/jev-for-llm-model-routing/

### レイテンシ

TypeSafe はおおむね **70〜500ms** のレンジを掲げていますが、これはサービス地点・入力・質問数・ネットワーク条件に依存します。

第三者実測では条件により幅があります。

- DevelopersIO（2026-09-17）: 4種類の分類を各10回、計40回。中央値 **0.643〜0.674秒**。
- Empryo（2026-09-16）: 102件のAPI障害分類で中央値 **273ms**。
- Aera（2026-09-17）: 248回の live call で中央値 **226ms**、p95 **497ms**、p99 **794ms**。

したがって、現時点では「数百ms級」は複数の第三者実測で支持される一方、公式の70〜500msを常に満たすとは扱わない方がよいです。

第三者:
- https://dev.classmethod.jp/articles/jev-for-llm-model-routing/
- https://empryo.com/blog/jev-and-the-harness
- https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks

## 4. 精度はどう見るべきか

Jevの価値は「最も高精度なモデル」というより、**狭い意味判断を低コスト・低遅延で大量に呼べること**にあります。

DevelopersIOが整理した公開値では、TypeSafe自身のworkflow evalで Jev は 76.0% とされ、比較対象の一部LLMとほぼ同水準です。一方、Everyによる第三者検証では Jev 67.8%、最良比較対象 74.1% と差が出ています。

つまり、少なくとも初期段階では、速度・費用の優位と、タスクごとの精度評価を分けて考える必要があります。

第三者:
- https://dev.classmethod.jp/articles/jev-for-llm-model-routing/
- https://every.to/also-true-for-humans/mini-vibe-check-typesafe-s-jev-judged-everything-i-ve-written-in-0-7-seconds

公式eval:
- https://evals.typesafe.ai/

## 5. 「hallucinateしない」の意味

TypeSafeはJevについて「can’t hallucinate」と表現していますが、実務上は意味を限定して読む必要があります。

Jevは自由文を生成せず、事前定義した型・候補空間から結果を返すため、**存在しないフィールド名や候補外の文字列を勝手に生成する種類のhallucinationを構造的に防ぎやすい**です。

一方で、Choiceで間違った候補を高確率で選ぶ、Scoreを誤る、Noulの確率推定を誤る、といった **意味的な誤判定は起こりえます**。公式のconfidenceドキュメントも、低confidence時に人・別システム・追加確認へルーティングする設計を推奨しています。

一次情報:
- https://typesafe.ai/blog/introducing-system-one-models-and-jev
- https://docs.typesafe.ai/confidence

## 6. 現時点で見えている苦手領域

TypeSafe公式ドキュメントには `Jev 1.13 jaggedness` という既知の弱点ページが用意されています。
第三者による同ページの要約・実験では、次の点が報告されています。

- 指示をかなり文字通りに読む。曖昧な意図補完を期待しない方がよい。
- 計数・算術をモデルに任せる用途には向かない。
- 日付の大小比較や期間計算はコード側に寄せるべき。
- state に無関係な情報が増えると精度が落ちうる。
- ユーザー制御文字列を「敵対的入力」として自動的に隔離するわけではない。
- 複数判断を1問に詰め込まず、atomicな質問へ分解する必要がある。

この節は公式 jaggedness ページの直接内容を継続確認し、一次情報ベースへ置き換える対象です。

公式索引:
- https://docs.typesafe.ai/llms.txt

補助的な第三者解説:
- https://dev.to/valyuai/how-to-use-jev-a-practical-guide-to-typesafes-system-one-model-g5e

## 7. 実用例

現時点でJevと相性が良さそうな用途は、自由文生成より **機械向けの狭い意味判断** です。

- LLM / agent のモデルルーティング
- サポート問い合わせの振り分け
- エラーの retry / halt 判定
- RAG passage の採用・棄却
- citation の支持関係チェック
- guardrail判定
- skill / tool候補の選択
- 検索結果のreranking
- ブラウザエージェントの次アクション選択

公式 cookbook はかなり充実しており、Jevを「生成モデルの代替」ではなく、生成モデルの前後や内部に置く判断プリミティブとして使う例が多いです。

一次情報:
- https://docs.typesafe.ai/llms.txt
- https://docs.typesafe.ai/concepts/use-case-map

第三者実装例:
- https://github.com/browser-use/jev-ultrafast
- https://empryo.com/blog/jev-and-the-harness

## 8. ブラウザエージェント事例

`browser-use/jev-ultrafast` は、Jevをブラウザ操作ポリシーの判断部分に使った公開実装です。
Google Flightsの限定タスクについて、同一モデル・同一設定で3組の比較を行い、中央値が **9.450秒 → 7.092秒（25%短縮）** と報告しています。

ただし、これは1タスク・3ペアの小規模比較であり、リポジトリ自身も一般的な信頼性ベンチマークではないと明記しています。

第三者:
- https://github.com/browser-use/jev-ultrafast
- https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md

## 9. 会社・公開状況

TypeSafe AI は2026年9月にステルス状態から表に出て、Jevを early access として公開しました。
DCVCは **4,000万ドルのseed round** を主導したと発表しています。

TypeSafe側の発表ページは2026-09-14、DCVC側の対外発表は2026-09-15であり、資料では日付を混同しないようにします。

一次情報:
- https://typesafe.ai/blog/introducing-system-one-models-and-jev
- https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/
- https://typesafe.ai/team

## 10. 現時点の評価

### 強い点

- 自由文生成を捨てたことで、構造化出力のための生成・parse・retryを減らせる。
- 数百ms級の判断が第三者実測でも複数確認されている。
- 入力単価が非常に低く、output課金を意識せず複数の判断をfan-outしやすい。
- 確率分布とconfidenceをコードの制御に直接組み込める。
- narrow / atomic な意味判断を大量に挟むagent harnessと相性がよい。

### 未確定・注意点

- early access段階であり、仕様・価格・rate limit・モデルversionが動きやすい。
- 一般的な公開ベンチマークでは比較しづらく、TypeSafe自身のeval設計に依存する部分が大きい。
- 第三者精度検証はまだ少ない。
- 数学・日付・長いcontext・敵対的入力など、LLMとは違う形のjaggednessがある。
- 生成能力がないため、Jev単独でagent全体を置換するものではない。

## 11. 継続追跡する項目

1. `jev-latest` が指すモデルversionと変更履歴
2. 公式 jaggedness の更新
3. price / rate limit / access条件
4. 日本・アジア圏からのlatency実測
5. 独立したaccuracy / calibration評価
6. browser / coding agent / RAG / moderationでの実運用例
7. OpenAI / Anthropic / Google等のstructured decision系との比較
8. Vercel AI Gateway等、外部基盤経由での利用性
9. production SLA、データ保持、privacy、enterprise条件
10. Jev向けのprompt/question設計パターン

## 12. 主要出典

### 一次情報

- TypeSafe公式: https://typesafe.ai/
- 発表: https://typesafe.ai/blog/introducing-system-one-models-and-jev
- Documentation: https://docs.typesafe.ai/introduction
- Documentation index: https://docs.typesafe.ai/llms.txt
- Quick Start: https://docs.typesafe.ai/introduction/quickstart
- Confidence: https://docs.typesafe.ai/confidence
- Workflow evals: https://evals.typesafe.ai/
- DCVC: https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/

### 日本語・第三者

- DevelopersIO（実測あり）: https://dev.classmethod.jp/articles/jev-for-llm-model-routing/
- VisionHub（日本語整理）: https://visionhub.jp/presentations/day_slides/day_slide_2026_09_14.html

### 第三者検証・実装

- Every: https://every.to/also-true-for-humans/mini-vibe-check-typesafe-s-jev-judged-everything-i-ve-written-in-0-7-seconds
- Empryo: https://empryo.com/blog/jev-and-the-harness
- Aera: https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks
- browser-use/jev-ultrafast: https://github.com/browser-use/jev-ultrafast
