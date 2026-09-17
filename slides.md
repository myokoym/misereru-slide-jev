<!-- {"key":"title"} -->
# Jev / System One Models

TypeSafe AIの「生成しない判断モデル」は、どこまで実用的か

2026-09-18 時点の継続調査

---

<!-- {"key":"section-what","type":"section"} -->
# 1. Jevは何を置き換えるのか

文章生成ではなく、ソフトウェア内部の狭い意味判断を対象にする

---

<!-- {"key":"interface"} -->
# Jevは `state` を受け取り、定義済みの型で判断を返す

通常のLLMでは、自由文を生成した後にJSON化・parse・validation・retryが必要になることがあります。Jevは、最初から定義済みの判断型を返します。

| primitive | 役割 | 主な返り値 |
| --- | --- | --- |
| Choice | 候補から1つ選ぶ | choice / probabilities / confidence |
| Score | 段階評価する | score / probabilities / confidence |
| Noul | yes/noを確率で判定 | 0〜1の確率 |

複数の質問は、同じ `state` に対して並列・独立に評価できます。

出典: [TypeSafe Introduction](https://docs.typesafe.ai/introduction)

---

<!-- {"key":"design"} -->
# 複雑な判断は、atomicな質問へ分解する

TypeSafeは、複数の意味判断を1問へ詰め込むより、狭い質問へ分ける設計を推奨しています。

| 判断 | Jevのprimitive |
| --- | --- |
| どの部署へ振るか | Choice |
| 緊急性があるか | Noul |
| 顧客の不満度 | Score |
| 自動処理してよいか | confidenceを使ってcode側で分岐 |

出典: [Quick Start](https://docs.typesafe.ai/introduction/quickstart)

---

<!-- {"key":"design-code"} -->
# 意味判断はJev、正確に計算できる処理はcodeへ残す

**Code calculates. Jev judges.** が基本的な役割分担です。

- Jev: 分類、適合度、緊急性、曖昧な意味判断
- code: 日付比較、件数、閾値、算術、決定済みルール
- system: `confidence` や確率を使い、自動実行・追加確認・エスカレーションを決める

Jevへ「全部考えさせる」のではなく、**モデルが必要な判断だけを切り出す**設計になります。

出典: [Quick Start](https://docs.typesafe.ai/introduction/quickstart) / [Confidence](https://docs.typesafe.ai/confidence)

---

<!-- {"key":"section-performance","type":"section"} -->
# 2. 速度と費用はどこまで低いか

公式値と第三者実測を分けて見る

---

<!-- {"key":"price"} -->
# 公式入力単価は $0.042 / 100万tokens

2026-09-17時点のTypeSafe公式表示は、入力 **$42 / 10億tokens = $0.042 / 100万 input tokens** です。

第三者のDevelopersIOは、同価格に加えてoutput課金なしと報告しています。公式サイト上の表示と第三者記事の記述は分けて扱います。

この単価帯では、1回の大きなLLM呼び出しへ判断を集約するより、**小さな判断を多数fan-outする設計**が現実的になります。

出典: [TypeSafe公式](https://typesafe.ai/) / [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/)

---

<!-- {"key":"latency"} -->
# 第三者実測でも数百ms級の例はあるが、公式レンジを常に満たすとは限らない

TypeSafeはおおむね **70〜500ms** のレンジを掲げています。第三者実測には条件差があります。

| 出典 | 条件 | 実測 |
| --- | --- | --- |
| DevelopersIO | 4分類 × 各10回 | 中央値 643〜674ms |
| Empryo | 102 error cases | 中央値 273ms |
| Aera | 248 live calls | 中央値 226ms / p95 497ms |

現時点では、短い判断レイテンシの例は複数あります。ただし、70〜500msを常時保証する根拠にはしません。

出典: [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Empryo](https://empryo.com/blog/jev-and-the-harness) / [Aera](https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks)

---

<!-- {"key":"section-quality","type":"section"} -->
# 3. 型保証と判断精度は別に評価する

構造化出力の強さだけで、意味的な正しさは決まらない

---

<!-- {"key":"hallucination"} -->
# 「hallucinateしない」は、出力空間を壊しにくいという意味で読む

Jevは自由文を生成せず、事前定義した型・候補空間から結果を返します。そのため、次の失敗は構造的に避けやすくなります。

- 存在しないJSON fieldを追加する
- 候補外の文字列を返す
- 指定した型そのものを壊す

一方で、**定義済み候補の中から誤ったものを選ぶことはあります**。

したがって、型の整合性と意味的正答率は別の品質指標として扱います。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [Confidence](https://docs.typesafe.ai/confidence)

---

<!-- {"key":"accuracy"} -->
# 公開比較では、Jevがfrontier LLMを常に上回るわけではない

DevelopersIOが整理した公開値では、次の差があります。

| 評価 | Jev | 比較対象 |
| --- | ---: | ---: |
| TypeSafe workflow eval | 76.0% | 一部LLMと同水準 |
| Everyの第三者検証 | 67.8% | 最良比較対象 74.1% |

現時点では「最も高精度か」だけで評価するより、**必要精度を満たす範囲で、判断をどれだけ速く・安く差し込めるか**を用途ごとに測る必要があります。

出典: [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Workflow evals](https://evals.typesafe.ai/)

---

<!-- {"key":"confidence"} -->
# confidenceは自動実行・再確認・エスカレーションの分岐に使える

Choice / Score は確率分布と `confidence` を返します。

| confidence | 処理例 |
| --- | --- |
| 高 | 自動実行 |
| 中 | 追加確認・別質問 |
| 低 | 人または別モデルへ送る |

`confidence` は正答保証ではありません。**モデルの不確実性をシステム制御へ露出させる値**として使います。

出典: [TypeSafe Confidence](https://docs.typesafe.ai/confidence)

---

<!-- {"key":"section-limits","type":"section"} -->
# 4. JevにはLLMと異なるjaggednessがある

意味判断へ特化した分、任せない方がよい処理も明確

---

<!-- {"key":"limits"} -->
# 計算・日付比較・長すぎるstateはcode側へ寄せる

TypeSafeは `Jev 1.13 jaggedness` として既知の弱点を公開しています。現時点の調査で確認している注意点です。

- 曖昧な意図補完より、指示を文字通りに読みやすい
- 計数・算術を任せない
- 日付の大小比較や期間計算はcodeへ寄せる
- 無関係な情報を `state` に詰めすぎない
- user-controlled textを自動的に安全な入力として扱わない
- 複数判断を1問へ詰めず、atomicに分ける

この節は、公式jaggedness文書の更新に合わせて継続確認します。

出典: [TypeSafe docs index](https://docs.typesafe.ai/llms.txt) / 詳細メモ: [`research.md`](research.md)

---

<!-- {"key":"section-usecases","type":"section"} -->
# 5. Jevが効きやすいのは、限定した回答空間をcodeがすぐ使う場所

生成モデル全体の置換ではなく、その前後・内部へ差し込む

---

<!-- {"key":"usecases-routing"} -->
# routing・制御・分類では、判断結果をそのまま処理へつなげやすい

公式cookbookや第三者実装で確認できる用途です。

- LLM / agent のモデルルーティング
- tool / skill候補の選択
- retry / halt の判定
- guardrail / moderation
- 問い合わせ・障害・案件の分類

共通するのは、**候補や評価軸を事前に限定しやすいこと**です。

出典: [TypeSafe Cookbooks / docs index](https://docs.typesafe.ai/llms.txt)

---

<!-- {"key":"usecases-retrieval"} -->
# retrieval・agent内部の評価にも、狭い意味判断として差し込める

- RAG passage の採用・棄却
- citationの支持関係チェック
- 検索結果のreranking
- ブラウザエージェントの次アクション選択

この種の処理では、Jevが文章を生成する必要はありません。**返った判断を次のcodeやagent stepが直接使えること**が適合条件です。

出典: [TypeSafe Cookbooks / docs index](https://docs.typesafe.ai/llms.txt) / [browser-use/jev-ultrafast](https://github.com/browser-use/jev-ultrafast)

---

<!-- {"key":"browser"} -->
# browser-useの限定比較では、Jev導入後に中央値25%短縮と報告されている

公開実装 `browser-use/jev-ultrafast` は、ブラウザ操作の判断部分へJevを組み込んでいます。

Google Flightsの限定比較では、同一モデル・同一設定で **中央値 9.450秒 → 7.092秒（25%短縮）** と報告しています。

ただし比較は **1タスク・3ペア** の小規模検証です。リポジトリ自身も一般的な信頼性benchmarkではないと明記しているため、一般化はしません。

出典: [GitHub](https://github.com/browser-use/jev-ultrafast) / [performance.md](https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md)

---

<!-- {"key":"status"} -->
# 2026年9月時点ではearly accessで、production標準部品とみなすには検証が足りない

確認できている公開状況です。

- TypeSafeは2026年9月にステルス状態からJevを公開
- DCVC主導で **$40M seed round**
- SDK / API / cookbooks は既に公開
- 第三者のlatency実測は複数ある
- 独立したaccuracy / calibration評価はまだ少ない
- version、rate limit、価格、SLA、privacy条件は継続確認が必要

現時点では、**新しい判断プリミティブとして有望かを検証する段階**と整理します。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [DCVC](https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/)

---

<!-- {"key":"watch-spec"} -->
# 継続調査: まず変わりやすい仕様を追う

- `jev-latest` が指すmodel versionと変更履歴
- 公式jaggedness / changelog
- price / rate limit / access条件
- production SLA / privacy / data retention

early access段階では、**現在の仕様を固定値として扱わないこと**が重要です。

詳細な変更履歴は [`research.md`](research.md) に蓄積します。

---

<!-- {"key":"watch-evidence"} -->
# 継続調査: 独立検証と実運用例を増やす

- 日本・アジアからのlatency
- 独立したaccuracy / calibration評価
- coding agent / browser / RAGでの実運用例
- OpenAI・Anthropic・Google等のstructured decision系との比較

ベンダー自身の性能主張と、第三者の再現・実測は引き続き分けて記録します。

調査台帳: [`research.md`](research.md)

---

<!-- {"key":"conclusion"} -->
# 現時点のまとめ

Jevは、生成モデルの代替というより **狭い意味判断をcodeへ返すための専用モデル** と見るのが適切です。

- 低単価・数百ms級という特性は、routing・ranking・guardrail・agent内部判断と相性がよい
- 型付き出力は扱いやすいが、意味的な誤判定は残るためconfidenceやfallback設計が必要
- 公開比較では常に最高精度ではなく、速度・費用・必要精度のトレードオフで評価すべき
- early accessのため、version・価格・SLA・独立したaccuracy / calibration検証は継続確認が必要

**「Code calculates. Jev judges.」を成立させられる狭い判断ほど、Jevを試す価値がある**というのが現時点の整理です。

根拠・未確認事項・更新履歴: [`research.md`](research.md)
