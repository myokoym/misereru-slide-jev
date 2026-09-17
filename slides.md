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

2026-09-18時点のTypeSafe公式表示は、入力 **$42 / 10億tokens = $0.042 / 100万 input tokens** です。公式発表ではoutput tokensも無料と明記されています。

この単価帯では、1回の大きなLLM呼び出しへ判断を集約するより、**小さな判断を多数fan-outする設計**が現実的になります。

出典: [TypeSafe公式](https://typesafe.ai/) / [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

---

<!-- {"key":"latency"} -->
# 数百ms級は確認できるが、地域差を含めて見る必要がある

TypeSafeは **70〜500ms** のend-to-end response timeを掲げています。ただし公式自身が、公開evalは主にサービス拠点に近い**米国西海岸のラップトップから測定**していると説明しています。

| 出典 | 条件 | 実測 |
| --- | --- | --- |
| TypeSafe | 公式レンジ | 70〜500ms |
| DevelopersIO | 4分類 × 各10回 | 中央値 643〜674ms |
| Empryo | 102 error cases | 中央値 273ms |
| Aera | 248 live calls | 中央値 226ms / p95 497ms |
| Zenn 五目並べ | 日本から25手 | 多くが約484〜603ms、1手1243ms |

**「100ms級が可能」と「日本から常時100ms級」は別の主張**として扱います。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Empryo](https://empryo.com/blog/jev-and-the-harness) / [Aera](https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks) / [Zenn: 五目並べ](https://zenn.dev/mizchi/articles/jev-plays-gomoku)

---

<!-- {"key":"realtime-official"} -->
# 公式は「real-time applications」を主要用途に置き、DOOMを10 queries/sで動かしている

TypeSafeは用途として **Real-time applications** を明示し、「100ms speeds」でUXが重要なアプリへAIを組み込めると説明しています。

公式DOOMデモでは、Jevへ **1秒あたり10回** 問い合わせています。約100ms間隔の判断をゲームへ戻す構成で、公式試算では約 **$7/時** です。

ただし、入力は画面画像ではなく**テキストを含む構造化game state**です。TypeSafe自身も、専用の非AI botならDOOMをより上手くプレイできると留保しています。

出典: [TypeSafe発表 — Real-time applications / Doom](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

---

<!-- {"key":"realtime-game-design"} -->
# ゲームでは毎フレーム処理より「数Hz〜10Hzの意味判断層」が現実的

DOOMの10Hzと、日本から約500ms前後になった第三者実測を合わせると、現状のJevを60Hz/120Hzのゲームループそのものへ置く設計は適しません。

| 通常code / engine | Jevへ切り出しやすい判断 |
| --- | --- |
| 入力、物理、衝突、移動補間 | 攻める / 退く / 待つ |
| 射撃・ダメージ計算 | どの敵を優先するか |
| pathfinding・合法手生成 | どの候補行動を選ぶか |
| animation・描画 | 援軍、撤退、交渉などの状態判断 |

**合法手・実行可能候補をcode側で絞り、Jevには意味的な選択を任せる**構成が、公開例と整合します。

これは公開デモと実測からの設計上の含意であり、TypeSafeが2〜10Hzを製品仕様として保証しているわけではありません。

---

<!-- {"key":"realtime-thirdparty"} -->
# 第三者でもMario・五目並べ・Snakeが試され、レイテンシがゲーム結果へ影響している

| 例 | 確認できること | 留保 |
| --- | --- | --- |
| Mario | 同一ハーネス内のLLM比較でJevが最良 | 公開デモより約3倍のlatency。最新推論LLMとの公平な比較ではない |
| 五目並べ | 合法手だけをChoiceへ渡し、25手を13.9秒で対局 | 多くの手が約0.5秒。1手1243msもある |
| Snake | game stateから移動方向をChoiceで決定 | 個人実装であり性能benchmarkではない |

少なくとも、**ゲーム状態 → 限定された行動候補 → 確率付き選択**という設計は複数の独立実装で再現されています。

日本語資料: [Zenn: Mario検証](https://zenn.dev/nwn/articles/824026c76116e0) / [Zenn: 五目並べ](https://zenn.dev/mizchi/articles/jev-plays-gomoku) / [note: Snake](https://note.com/tomonr1984/n/n057b04c37fda)

---

<!-- {"key":"realtime-comparison"} -->
# 「リアルタイム判断」はJevだけに可能な処理ではない

第三者検証では、候補を短いIDへ割り当ててLLMのlogit / logprobsを直接比較し、自由文JSON生成を避ける方法でも高速化できることが示されています。

そのため比較すべきなのは、単純な「Jev vs JSONを全文生成するLLM」だけではありません。

- Jev: 型付き確率出力をAPIとして提供し、複数質問を並列評価
- LLM + logit: 条件が合えば近い判定形を構成できる
- 専用ゲームAI / rule / utility AI: latency・決定性・局所性能では依然有力

現時点では、**Jevの差は「ゲームAIだから」ではなく、意味判断用interfaceを低遅延・低単価で製品化していること**にあります。

出典: [Zenn: Jevを正しく驚く](https://zenn.dev/nwn/articles/824026c76116e0)

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

公式reranking cookbookでは、CLERC legal query 40件でBM25候補をJevでrerankし、**top-1 5% → 18%、top-10 38% → 62%** と報告しています。ただしTypeSafe自身のharnessによる結果で、独立検証ではありません。

出典: [TypeSafe Cookbooks / docs index](https://docs.typesafe.ai/llms.txt)

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

- TypeSafeは **2026年9月15日** にJevをearly accessとして発表
- DCVC主導で **$40M Series Seed**
- SDK / API / cookbooks は既に公開
- 公式Privacy Policyでは **API等のInputをmodel training / fine-tuningに使わない** と明記
- 一方、Inputの具体的な保持日数、zero-retention、リージョン選択、Jev APIの公開SLAは未確認
- 独立したaccuracy / calibration評価はまだ少ない
- version、rate limit、価格は継続確認が必要

現時点では、**新しい判断プリミティブとして有望かを検証する段階**と整理します。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [Privacy Policy](https://typesafe.ai/legal/privacy-policy) / [DCVC](https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/)

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

- 日本・アジアからのlatency、特にリアルタイム用途
- game / browser / coding agent / RAGでの実運用例
- 独立したaccuracy / calibration評価
- OpenAI・Anthropic・Google等のstructured decision系との比較

ベンダー自身の性能主張と、第三者の再現・実測は引き続き分けて記録します。

調査台帳: [`research.md`](research.md)

---

<!-- {"key":"conclusion"} -->
# 現時点のまとめ

- Jevは、生成ではなく **狭い意味判断をcodeへ返す専用モデル**
- 低単価・数百ms級で、routing・ranking・guardrail・agent内部判断に加え、**リアルタイム寄りのインタラクティブ用途**も射程に入る
- 公式DOOMは10Hzだが、日本からの第三者ゲーム実測は約0.5秒/判断の例があり、地域差は無視できない
- ゲームでは毎フレーム処理ではなく、**候補をcodeで制約した低頻度の意味判断層**として使う方が現実的
- 型付き出力でも意味的な誤判定は残るため、`confidence` とfallback設計が必要
- Inputの非学習利用は公式確認できたが、保持期間・zero-retention・SLAは未確認
- early accessのため、version・価格・SLA・accuracy / calibrationは継続確認が必要

**Code calculates. Jev judges.** が成立する狭い判断ほど、Jevの適合度は高いと考えられます。

根拠・未確認事項・更新履歴: [`research.md`](research.md)