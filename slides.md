<!-- {"key":"title"} -->
# Jev / System One Models

TypeSafe AIの「生成しない判断モデル」は、どこまで実用的か

2026-09-21 時点の継続調査

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

<!-- {"key":"section-usecases","type":"section"} -->
# 2. 具体的な用途

Jevは「生成しない」からこそ、判断だけ必要な場所へ差し込みやすい

---

<!-- {"key":"usecases-map"} -->
# 用途は6系統 — agent・検索・安全判定

- **Agent / harness制御**: model・tool・subagent選択、continue / retry / stop
- **Retrieval / evidence**: RAG採否、reranking、citation支持
- **Guardrail / verification**: jailbreak、harm、command safety

共通するのは、**回答空間を限定し、返った判断をcodeが直接使えること**です。

出典: [TypeSafe docs](https://docs.typesafe.ai/llms.txt) / [Vercel: When to use Jev](https://vercel.com/i/when-to-use-jev)

---

<!-- {"key":"usecases-map-2"} -->
# 用途は6系統 — 業務・大量選別・interactive

- **業務workflow分類**: 問い合わせ・障害・email・priority / escalation
- **Batch filtering / context管理**: parallel判定、semantic filtering、keep / drop
- **Real-time / interactive**: browser次行動、DOOM、各種game decision

業界名より、**「何を判断させるか」**で適合性を見る方が整理しやすくなります。

出典: [TypeSafe docs](https://docs.typesafe.ai/llms.txt)

---

<!-- {"key":"usecases-routing"} -->
# Agent / harnessでは「次に何をするか」だけを判断させる

- LLM / subagentのrouting
- tool / skill候補の選択
- continue / retry / ask user / stop
- queue・priority・escalation分類

**Jevはdecision、実行権限・tool実行・policyはcode**へ残します。Vercelもこの役割分担を紹介しています。

出典: [Vercel: Jev agent control](https://vercel.com/i/jev-agent-control) / [TypeSafe docs](https://docs.typesafe.ai/llms.txt)

---

<!-- {"key":"usecases-retrieval"} -->
# Retrieval・verificationでは「採用するか」「支持するか」を判定する

- RAG passage の採用・棄却
- citationがclaimを支持しているか
- 検索結果のreranking
- prompt injection / harmful outputの検査

公式reranking cookbookでは、CLERC legal query 40件でBM25候補をJevでrerankし、**top-1 5% → 18%、top-10 38% → 62%** と報告しています。ただしTypeSafe自身のharnessによる結果で、独立検証ではありません。

出典: [TypeSafe Cookbooks / docs index](https://docs.typesafe.ai/llms.txt)

---

<!-- {"key":"usecases-production"} -->
# safety判定・業務分類でも第三者の利用報告が出ている

| 例 | 報告 | 留保 |
| --- | --- | --- |
| Vercel command safety | Luna 5.6比で5〜18倍高速、accuracyも高かった | dataset・試行回数は未公開 |
| Bryo AI email分類 | Geminiがわずかに高精度、Jevは10〜20倍安価 | 再現benchmarkではない |

**特定workflowでcost・latency・accuracyを比較した採用例**として扱います。

出典: [TechCrunch, 2026-09-18](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/)

---

<!-- {"key":"usecases-context"} -->
# Context管理では、要約生成をkeep / drop判定へ変形できる

`fast-jev-compaction` はClaude Codeのtool履歴を選別します。

- keep / truncate / drop をJevで判定
- **187,635 → 33,447 tokens（82%削減）を1,351ms**
- n=3の小規模実測。長期task qualityは未評価
- 失敗時や削減不足では組込みsummaryへfallback

**生成し直すのではなく、原文を残すか捨てるか判断する**用途です。

出典: [Zenn: fast-jev-compaction](https://zenn.dev/orangewk/articles/claude-code-fast-jev-compaction)

---

<!-- {"key":"browser"} -->
# browser-useの限定比較では、Jev導入後に中央値25%短縮と報告されている

公開実装 `browser-use/jev-ultrafast` は、ブラウザ操作の判断部分へJevを組み込んでいます。

Google Flightsの限定比較では、同一モデル・同一設定で **中央値 9.450秒 → 7.092秒（25%短縮）** と報告しています。

ただし比較は **1タスク・3ペア** の小規模検証です。リポジトリ自身も一般的な信頼性benchmarkではないと明記しているため、一般化はしません。

出典: [GitHub](https://github.com/browser-use/jev-ultrafast) / [performance.md](https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md)

---

<!-- {"key":"section-performance","type":"section"} -->
# 3. 速度と費用はどこまで低いか

公式値と第三者実測を分けて見る

---

<!-- {"key":"price"} -->
# 公式入力単価は $0.042 / 100万tokens

2026-09-18時点のTypeSafe公式表示は、入力 **$42 / 10億tokens = $0.042 / 100万 input tokens** です。公式発表ではoutput tokensも無料と明記されています。

この単価帯では、1回の大きなLLM呼び出しへ判断を集約するより、**小さな判断を多数fan-outする設計**が現実的になります。

出典: [TypeSafe公式](https://typesafe.ai/) / [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

---

<!-- {"key":"latency"} -->
# 公式の70〜500msは、測定地点を含めて読む必要がある

TypeSafeは **70〜500ms** のend-to-end response timeを掲げています。

ただし公式自身が、公開evalの多くをサービス拠点に近い**米国西海岸のラップトップから測定**していると説明しています。

したがって、公式レンジはモデル/APIの目安として使い、**日本からの実効値とは分けて評価**します。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

---

<!-- {"key":"latency-thirdparty"} -->
# 第三者実測は約0.2〜0.7秒中心で、日本では約0.5秒の例がある

- DevelopersIO: 4分類×各10回、中央値 **643〜674ms**
- Empryo: 102 error cases、中央値 **273ms**
- Aera: 248 calls、中央値 **226ms / p95 497ms**
- Zenn五目並べ: 日本から25手、多くが **484〜603ms**、1手1243ms

**「100ms級が可能」と「日本から常時100ms級」は別の主張**です。

出典: [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Empryo](https://empryo.com/blog/jev-and-the-harness) / [Aera](https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks) / [Zenn](https://zenn.dev/mizchi/articles/jev-plays-gomoku)

---

<!-- {"key":"realtime-official"} -->
# 公式は「real-time applications」を主要用途に置き、DOOMを10 queries/sで動かしている

TypeSafeは用途として **Real-time applications** を明示し、「100ms speeds」でUXが重要なアプリへAIを組み込めると説明しています。

公式DOOMデモでは、Jevへ **1秒あたり10回** 問い合わせています。約100ms間隔の判断をゲームへ戻す構成で、公式試算では約 **$7/時** です。

ただし、入力は画面画像ではなく**テキストを含む構造化game state**です。TypeSafe自身も、専用の非AI botならDOOMをより上手くプレイできると留保しています。

出典: [TypeSafe発表 — Real-time applications / Doom](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

---

<!-- {"key":"realtime-game-design"} -->
# ゲームでは毎フレーム処理ではなく、意味判断だけを低頻度で呼ぶ

| code / engineへ残す | Jevへ切り出す |
| --- | --- |
| 入力・物理・衝突・補間 | 攻める / 退く / 待つ |
| 射撃・damage計算 | target priority |
| pathfinding・合法手生成 | 候補行動の選択 |
| animation・描画 | 援軍・撤退・交渉 |

**実行可能候補をcodeで絞り、その中の意味的選択をJevへ任せる**構成です。

---

<!-- {"key":"realtime-thirdparty"} -->
# Mario・五目並べ・Snakeでも「state → 候補 → Choice」が使われている

- **Mario**: 同一harness内でJevが比較LLMより良い結果。ただしlatencyは公開demoの約3倍
- **五目並べ**: 合法手だけをChoiceへ渡し、25手を13.9秒で対局
- **Snake**: game stateから移動方向をChoice。個人実装でbenchmarkではない

複数の独立実装で、**候補をcode側で制約してから意味選択を任せる**形が確認できます。

出典: [Zenn: Mario](https://zenn.dev/nwn/articles/824026c76116e0) / [Zenn: 五目並べ](https://zenn.dev/mizchi/articles/jev-plays-gomoku) / [note: Snake](https://note.com/tomonr1984/n/n057b04c37fda)

---

<!-- {"key":"realtime-comparison"} -->
# 比較対象は「JSON生成LLM」だけではない

- **Jev**: 型付き確率出力、並列質問を専用APIで提供
- **LLM + JSON生成**: 実装しやすいが生成量・parse処理が増える
- **LLM + logit / logprobs**: 条件が合えば近い判定形を構成可能
- **rule / utility AI / 専用model**: 決定性・局所性能・latencyで有力

Jevの差は、**意味判断用interfaceを低遅延・低単価で製品化していること**です。

出典: [Zenn: Jevを正しく驚く](https://zenn.dev/nwn/articles/824026c76116e0)

---

<!-- {"key":"section-quality","type":"section"} -->
# 4. 型保証と判断精度は別に評価する

構造化出力の強さだけで、意味的な正しさは決まらない

---

<!-- {"key":"hallucination"} -->
# 「hallucinateしない」は、候補外を生成しにくいという意味で読む

Jevは事前定義した型・候補空間から結果を返すため、次の失敗を避けやすくなります。

- 存在しないJSON fieldを追加する
- 候補外の文字列を返す
- 指定した型そのものを壊す

ただし、**定義済み候補の中で誤判定することはあります**。型の整合性と意味的正答率は別です。

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
# confidenceは、自動実行するかfallbackするかの分岐に使う

| confidence | 処理例 |
| --- | --- |
| 高 | 自動実行 |
| 中 | 追加確認・別質問 |
| 低 | 人または別モデルへ送る |

**confidenceは正答保証ではなく、不確実性をsystem controlへ露出する値**です。

出典: [TypeSafe Confidence](https://docs.typesafe.ai/confidence)

---

<!-- {"key":"section-limits","type":"section"} -->
# 5. JevにはLLMと異なるjaggednessがある

意味判断へ特化した分、任せない方がよい処理も明確

---

<!-- {"key":"limits"} -->
# 計算・日付比較・長すぎるstateはcode側へ寄せる

- 曖昧な意図補完より、指示を文字通りに読みやすい
- 計数・算術を任せない
- 日付の大小比較や期間計算はcodeへ寄せる
- 無関係な情報を `state` に詰めすぎない
- user-controlled textを自動的に安全扱いしない
- 複数判断を1問へ詰めず、atomicに分ける

出典: [TypeSafe docs index](https://docs.typesafe.ai/llms.txt) / 詳細: [`research.md`](research.md)

---

<!-- {"key":"section-status","type":"section"} -->
# 6. 現在地と継続確認

early accessのため、性能だけでなく運用条件も追う

---

<!-- {"key":"status"} -->
# 2026年9月時点ではearly access

- TypeSafeは **2026年9月15日** にJevを発表
- DCVC主導で **$40M Series Seed**
- SDK / API / cookbooksは公開済み
- 第三者の実装・benchmarkも出始めている

現時点では、**新しい判断プリミティブとして検証する段階**です。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [DCVC](https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/)

---

<!-- {"key":"status-production"} -->
# production利用では契約・privacy・availabilityがまだ重要な確認項目

- Privacy Policy: API等のInputをtraining / fine-tuningに使わない
- 具体的な保持日数・zero-retention・リージョン選択は未確認
- Jev APIの公開SLAは未確認
- 独立したaccuracy / calibration評価はまだ少ない
- launch直後には需要増によるcapacity問題も報道された

**model性能とproduction条件を別々に確認する必要があります。**

出典: [Privacy Policy](https://typesafe.ai/legal/privacy-policy) / [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/)

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
- command safety / workflow分類 / context managementの実運用例
- 独立したaccuracy / calibration評価
- OpenAI・Anthropic・Google等のstructured decision系との比較

ベンダー自身の性能主張と、第三者の再現・実測は引き続き分けて記録します。

調査台帳: [`research.md`](research.md)

---

<!-- {"key":"conclusion"} -->
# 現時点のまとめ — Jevが向く場所

- **生成ではなく、狭い意味判断をcodeへ返す**専用モデル
- 用途はagent制御、retrieval、guardrail、業務分類、context管理、interactive
- 回答空間を限定でき、判断を次の処理が直接使える場所ほど適合しやすい
- ゲームでは毎フレーム処理でなく、候補をcodeで絞った意味判断層に置く

**Code calculates. Jev judges.** が基本の役割分担です。

---

<!-- {"key":"conclusion-caveats"} -->
# 現時点のまとめ — まだ前提にしてはいけないこと

- 公式DOOMの10Hzを、日本から常時再現できるとは限らない
- 型付き出力でも**意味的な誤判定**は残る
- LLM logit / rule / utility AI / 専用modelでも類似処理は可能
- `confidence` とfallbackを含むsystem設計が必要
- early accessのためversion・価格・SLA・calibrationは継続確認

根拠・未確認事項・更新履歴: [`research.md`](research.md)
