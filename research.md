# Jev 継続調査ノート

最終更新: 2026-09-21

このファイルは、TypeSafe AI の **Jev / System One Models** を継続的に調査するための根拠メモです。
`slides.md` は見せるための要約、ここは出典・留保・第三者検証まで残す調査台帳として扱います。

## 調査ルール

- 一次情報（TypeSafe公式・公式ドキュメント・公式eval）を優先する。
- ベンダー自身の性能値と第三者の実測を混ぜない。
- 「型として不正な出力をしない」と「判断が正しい」を分ける。
- 価格、モデルバージョン、early access、rate limit は変化しやすいため日付付きで扱う。
- 第三者検証は、サンプル数・地域・ネットワーク・比較条件まで確認する。
- 日本語で有用な実測記事が出た場合は優先的に追記する。
- 「既存LLMではできない」といった差別化主張は、同等interfaceをLLMで構成した場合も含めて比較する。

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

2026-09-18時点で、公式サイトは **入力 $42 / 10億 tokens = $0.042 / 100万 input tokens** と表示しています。
公式発表では **output tokensは無料** と明記されています。

一次情報:
- https://typesafe.ai/
- https://typesafe.ai/blog/introducing-system-one-models-and-jev

日本語確認:
- https://dev.classmethod.jp/articles/jev-for-llm-model-routing/

### レイテンシ

TypeSafe は **70〜500ms** のend-to-end response timeを掲げています。ただし公式発表は、公開evalの多くが **サービス拠点に近い米国西海岸のラップトップから実行されている** と明記しています。したがって、ネットワーク距離を含めた利用地点の差を分離して見る必要があります。

第三者実測では条件により幅があります。

- DevelopersIO（2026-09-17）: 4種類の分類を各10回、計40回。中央値 **0.643〜0.674秒**。
- Empryo（2026-09-16）: 102件のAPI障害分類で中央値 **273ms**。
- Aera（2026-09-17）: 248回の live call で中央値 **226ms**、p95 **497ms**、p99 **794ms**。
- Zennの五目並べ検証（2026-09-17）: 日本からの対局ログでは25手の多くが **484〜603ms程度**、1手は **1243ms**。記事では平均約500msと整理している。

したがって、現時点では「数百ms級」は複数の第三者実測で支持される一方、**公式の100ms級と、日本からの実効レイテンシを同一視しない**方がよいです。

一次情報:
- https://typesafe.ai/blog/introducing-system-one-models-and-jev

第三者:
- https://dev.classmethod.jp/articles/jev-for-llm-model-routing/
- https://empryo.com/blog/jev-and-the-harness
- https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks
- https://zenn.dev/mizchi/articles/jev-plays-gomoku

## 4. 精度はどう見るべきか

Jevの価値は「最も高精度なモデル」というより、**狭い意味判断を低コスト・低遅延で大量に呼べること**にあります。

DevelopersIOが整理した公開値では、TypeSafe自身のworkflow evalで Jev は 76.0% とされ、比較対象の一部LLMとほぼ同水準です。一方、Everyによる第三者検証では Jev 67.8%、最良比較対象 74.1% と差が出ています。

TypeSafe自身もworkflow evalの193.6x高速・444.6x低コストという値について、**real-world gainsの高い側にあると予想する**旨を留保しています。

つまり、少なくとも初期段階では、速度・費用の優位と、タスクごとの精度評価を分けて考える必要があります。

第三者:
- https://dev.classmethod.jp/articles/jev-for-llm-model-routing/
- https://every.to/also-true-for-humans/mini-vibe-check-typesafe-s-jev-judged-everything-i-ve-written-in-0-7-seconds

公式eval・説明:
- https://evals.typesafe.ai/
- https://typesafe.ai/blog/introducing-system-one-models-and-jev

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

現時点でJevと相性が良さそうなのは、自由文生成より **機械向けの狭い意味判断** です。公開例を役割で整理すると、主に次の6系統に分けられます。

| 用途系統 | 具体例 | Jevが担当する判断 |
| --- | --- | --- |
| Agent / harness制御 | model / subagent routing、tool / skill選択、continue / retry / ask / stop | 次に何をするか |
| Retrieval / evidence | RAG passage採否、reranking、citation支持関係 | どれを採用・優先・支持とみなすか |
| Guardrail / verification | prompt injection、jailbreak / harm、command safety、agent trace監視 | 実行・通過させてよいか |
| 業務workflow分類 | 問い合わせ、障害、business email、priority / escalation | どのqueue・分類・処理へ送るか |
| Batch filtering / context管理 | parallel questions、line単位semantic search、tool履歴のkeep / drop | 大量候補のうち何を残すか |
| Real-time / interactive | browser next action、DOOM、Mario、五目並べ、Snake | 現在stateで次にどの行動を選ぶか |

この6系統は排他的ではありません。たとえばcommand safetyはagent制御とguardrailの両方に関係します。重要なのは業界名ではなく、**回答空間を事前に限定でき、返った判断をcodeが直接使えるか**です。

証拠レベルも用途ごとに異なります。公式cookbookだけの例、第三者の実装、実運用者の報告、再現可能benchmarkを分けて扱います。

公式 cookbook はかなり充実しており、Jevを「生成モデルの代替」ではなく、生成モデルの前後や内部に置く判断プリミティブとして使う例が多いです。

### 公式cookbookで公開された定量例（2026-09-18確認）

TypeSafe公式ドキュメント索引から、単なる用途例だけでなく定量結果を伴うcookbookが確認できました。これらは**ベンダー自身の例**であり、独立benchmarkではありません。

- **RAG / reranking**: CLERCのlegal query 40件について、BM25で各30 passageを候補化しJevでrerank。公式記載では top-1 accuracy **5% → 18%**、top-10 **38% → 62%**。
- **parallel questions**: GDPR Wikipedia記事に対する13問を1 callへbatchし、公式記載では個別call比 **12.2x cheaper / 10.0x faster**、answersは不変。
- **line-by-line semantic search**: GitHub Terms of Serviceの218 line idを1 requestのChoiceで評価し、Noulで「文書内に答えがあるか」も判定。
- **RAG passage classification / citation check / LLM guardrails**: passageの採否・prompt injection、citation支持関係、入出力のjailbreak/harm判定を、それぞれ閉じた判断問題として実装するcookbookを公式公開。

これらはJevの「狭い判断を大量に差し込む」という設計を具体化する資料として有用ですが、accuracy改善値や速度倍率はTypeSafe自身のharness・datasetでの結果なので、第三者再現を待つ必要があります。

一次情報:
- https://docs.typesafe.ai/llms.txt
- https://docs.typesafe.ai/cookbooks/rerank_typesafe
- https://docs.typesafe.ai/cookbooks/parallel_questions
- https://docs.typesafe.ai/cookbooks/classifying_rag_passages
- https://docs.typesafe.ai/cookbooks/citation_check
- https://docs.typesafe.ai/cookbooks/llm_guardrails

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

## 9. リアルタイム・ゲーム用途

### TypeSafe公式: Real-time applications

TypeSafeは公式発表のuse caseとして **Real-time applications** を独立して挙げ、「100ms speeds means you can use AI in your applications where UX is critical」と説明しています。

これはJevの用途を業務ルーティングやagent内部判断だけに限定せず、**人が操作するインタラクティブシステムへ意味判断を差し込む**ことを狙っていると読めます。

一次情報:
- https://typesafe.ai/blog/introducing-system-one-models-and-jev

### TypeSafe公式: DOOM

公式DOOMデモでは、Jevへ **10 queries / second**、つまり約100ms間隔で判断を要求しています。TypeSafeは、この頻度でも費用は約 **$7/hour** と説明しています。

重要な留保:

- Jevが画面画像を直接見ているわけではない。
- 入力は、テキストを含む **structured game state**。
- TypeSafe自身が「non-AI Doom bot could play better」と認めている。
- 狙いは専用botの最高性能ではなく、異なるgame state表現へ反応し、instruction followingを伴うリアルタイム判断を示すこと。

したがって、このデモを「JevはゲームAIとして既存専用botより優秀」と解釈してはいけません。

一次情報:
- https://typesafe.ai/blog/introducing-system-one-models-and-jev

### TypeSafe公式: Wikiracing

公式は別のgame-like demoとしてWikiracingも示しています。各stepで数百〜数千リンクから次候補を選ぶタスクです。

JevのChoiceはcardinality最大255まで対応し、それを超える高cardinalityでは、独立score → explicit choiceの2段構成を使うと公式は説明しています。

この例は「リアルタイム操作」というより、**高cardinality選択を繰り返す探索・ゲーム的タスク**での適用例です。

一次情報:
- https://typesafe.ai/blog/introducing-system-one-models-and-jev

### 第三者: Mario

Zennの検証では、公開されたMarioハーネスを使ってJevと複数LLMを比較しています。

確認できる点:

- 検証者環境では、公開デモより **約3倍程度のlatency** があった。
- その環境内ではJevが比較対象LLMより良いプレイ結果だった。
- ただし比較可能だったLLMは、logit/logprobsを取得できる旧世代の非推論モデルが中心。
- したがって「Jevが最新LLMよりゲーム性能で優れている」とは結論できない。

第三者:
- https://zenn.dev/nwn/articles/824026c76116e0

### 第三者: 五目並べ

Zennの五目並べ実装は、15x15盤面のgame stateと、**現在合法な手だけ**をChoice候補へ渡しています。

25手のログでは、多くのAPI呼び出しが **484〜603ms程度**、1回は1243msで、対局全体は13.913秒でした。記事では平均約500msと整理されています。

この実装はJevの設計上重要な示唆があります。

- 合法手生成やゲームルール判定はcode側へ残す。
- Jevには、合法候補の中の「意味的な選択」を任せる。
- choice候補を絞るハーネス設計が性能・精度の一部になる。

第三者:
- https://zenn.dev/mizchi/articles/jev-plays-gomoku
- https://github.com/mizchi/jev-gomoku

### 第三者: Snake

個人実装として、Snakeのgame stateから移動方向をChoiceで選ばせる例も公開されています。

これはbenchmarkとしては扱いませんが、DOOM、Mario、五目並べとは別系統の実装でも、**state → 限定行動候補 → Choice**という構成が使われている確認材料になります。

第三者:
- https://note.com/tomonr1984/n/n057b04c37fda

### ゲーム設計への含意

公開例と日本からの実測を合わせると、Jevを60Hz/120Hzの物理・入力・描画ループへ直接置くより、**低頻度の意味判断層**として置く方が現実的です。

例:

```text
60Hz / 120Hz code loop
  ├─ input
  ├─ physics
  ├─ collision
  ├─ animation
  └─ deterministic rules

数Hz〜10Hz程度のdecision layer
  └─ Jev
      ├─ attack / retreat / wait
      ├─ target selection
      ├─ strategy state
      └─ dialogue / negotiation / escalation
```

ここでの「数Hz〜10Hz」は、公式DOOMの10Hzと日本から約0.5秒/判断の第三者実測から導く**設計上の目安**であり、TypeSafeが製品仕様として保証する頻度ではありません。

### Jevだけが可能なのか

この点は公平に比較する必要があります。

Zennの検証では、LLMでも回答候補を短いtoken IDへ対応させ、最初の1tokenのlogitを比較し、複数質問をbatch推論することで、自由文JSON生成より大幅に高速化できることを示しています。Gemma 3 270Mを用いたその検証では、JSON全文生成に対して77倍高速だったと報告されています。

したがって、Jevのリアルタイム価値を評価するときは、

- Jev
- 普通のLLMにJSONを全文生成させる方式
- LLMのlogit/logprobsを直接使う方式
- rule / utility AI / behavior tree / 専用model

を分けて比較する必要があります。

現時点でJevの特徴は、**型付き確率判断・並列質問・低単価を専用APIとして一体化していること**であり、「同様の判断が他方式では不可能」ということではありません。

第三者:
- https://zenn.dev/nwn/articles/824026c76116e0

## 10. 会社・公開状況

TypeSafe AI は **2026年9月15日** に公式ブログでJevをearly accessとして発表しました。
DCVCも同日の記事で、**4,000万ドルのSeries Seed** を主導したと発表しています。

以前の資料にあった「TypeSafe側の発表は2026-09-14」という記載は誤りだったため、2026-09-18の再調査で訂正しました。

一次情報:
- https://typesafe.ai/blog/introducing-system-one-models-and-jev
- https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/
- https://typesafe.ai/team

## 10.5. Privacy / data retention / production契約条件

2026-09-18にTypeSafe公式Privacy Policy（最終更新 2025-11-19）をAPI利用条件として確認しました。これはJev固有のmodel cardではなく、Playground・API等を含むTypeSafe Services全体のprivacy policyです。

確認できた点:

- API等へ送る prompts / data / instructions / other input を **Input** と定義して収集する。
- TypeSafeは **InputをAI/MLモデルのtrainingまたはfine-tuningに使用しない** と明記している。
- Inputを第三者へ開示しない。ただし **service providersへの開示は例外**。
- Servicesは **米国でhost** され、EEA・UK等から利用する場合も米国へstorage / processingのため移転されると明記。
- retentionは固定日数ではなく、Services提供やbusiness/commercial purposesに **reasonably necessaryな期間** 保持するとしている。法的保持義務がある場合はさらに長くなりうる。
- securityについて「reasonable efforts」は記載されるが、電子的な送信・保存の完全なsecurity/privacyは保証しない。

したがって、**「学習に使われない」ことは一次情報で確認できた一方、API Inputの具体的な保持日数、zero-retention option、リージョン選択、Jev向けproduction SLAは公開資料から確認できていない**、という状態です。

また公開Terms of Use（2026-09-14更新）は主としてSite利用規約で、Siteを`as is` / `as available`とし、中断・error-free等を保証していません。これはenterprise/API個別契約のSLA不存在を証明するものではないため、**公開Web上でJev APIのSLAを確認できない**という表現に留めます。

一次情報:
- https://typesafe.ai/legal/privacy-policy
- https://typesafe.ai/legal/terms

## 10.6. 2026-09-19: 第三者から見え始めたproduction利用とearly-access運用リスク

2026-09-18公開のTechCrunch記事で、TypeSafe外の開発者による具体的な利用報告が追加で確認できました。これはTypeSafe公式evalではなく、**開発者本人の報告をTechCrunchが取材・引用した第三者情報**として扱います。再現可能なbenchmark datasetやraw logが公開された独立検証とは区別します。

- **Vercelのcommand safety classifier**: Vercelのsoftware engineer Pranit Sharmaは、commandの安全性を判定するclassifierをOpenAIのChatGPT Luna 5.6からJevへ置き換えたところ、**5〜18倍高速で、accuracyも高かった**と報告したとTechCrunchが伝えています。guardrail / safety判定が単なる公式cookbookではなく、実際の開発基盤で試されている具体例として重要です。ただし、dataset、試行回数、accuracy値そのものは記事中に示されていないため、定量benchmarkとしては扱いません。
- **Bryo AIのbusiness-email classification**: CTO Nikhil Mudholkarの比較では、Geminiの方がaccuracyはわずかに高かった一方、Jevは**10〜20倍安価**だったと報告されています。これは「Jevが常に意味精度でfrontier LLMを上回る」という見方を支持せず、既存の注意書きどおり **accuracyとcost/latencyを別軸で評価すべき**という材料になります。また、confidence/probabilityをworkflow automationへ直接使える点を評価しています。
- **early-access時のAPI capacity**: TechCrunchは、launch後の需要増でTypeSafeが**一時的にAPI利用者へサービスを提供できない状態になった**と報じています。これは公開SLAやrate limitの代替情報ではありませんが、production導入ではモデル性能だけでなくcapacity / availability / fallbackを確認すべきという新しい運用上の材料です。
- TypeSafe CEO Diogo Almeidaは、JevでLLM agent traceを監視しjailbreakを防ぐ利用が出ていると説明していますが、これは**ベンダー側の観測・主張**であり、上記Vercel報告と同じ証拠レベルには置きません。

この追加情報からも、型付き出力の保証と意味的accuracyは分離して扱います。Vercelの「accuracyも高かった」という報告は特定classifierでの比較であり、Jev一般の意味的正答保証ではありません。

第三者報道:
- https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/

## 10.7. 2026-09-20: Jev 1.13の独立benchmarkと日本語のagent実装実測

### JevBench v1.2: accuracy / calibration / latencyを同じharnessで比較

Benchmark Heavenが2026-09-19に公開した **JevBench v1.2** は、TypeSafe非提携の第三者benchmarkで、harness・公開task・scoring code・results JSONをGitHubで公開しています。534 decisions（easy 72 / standard 96 / judge 146 / hard 220）を、ドイツのserverから各systemへserialに実行しています。

Jev 1.13.0の結果は次のとおりです。

- easy **100.0%** / standard **99.0%** / judge **94.5%** / hard **74.1%**
- JevBench Intelligence score **90.4**
- Calibration score **82.7**
- production APIへのraw latency **p50 0.65s / p95 0.72s**
- 実測token量と公称単価から算出したcost **$0.041 / 1,000 decisions**
- Intelligence / Calibration / Speed / Costを各25%で幾何平均した独自compositeでは **75.3**

比較対象ではGPT-5.6 Luna (low)がIntelligence **96.8**、Calibration **89.8**でJevを上回る一方、raw latencyはp50 **0.97s / p95 1.82s**、costは **$0.247 / 1,000 decisions**。このbenchmarkでは、Jevは「最高accuracy」ではなく、**accuracy・calibrationをある程度維持しながらspeed / costを下げるtrade-off**として見える結果です。

重要な留保:

- JevBench Scoreは第三者が定義した独自compositeで、TypeSafe公式指標ではない。
- hard tierはClaude Opus 5とGPT-5.6 Solで作成・cross-reviewされており、すべてが人手ground truthというわけではない。
- self-hosted / demo endpointにはproduction load近似のためlatency補正を入れているが、**JevとGPT-5.6 Lunaはproduction APIのraw値**。
- benchmark全体の優劣を、個別production workloadの正答率へそのまま一般化しない。

一方、これまで不足していた **Jevのcalibrationを他systemと同じ公開harnessで測る第三者資料**としては意味が大きいです。型保証とは別に、確率の品質を検証する材料として扱います。

第三者benchmark / 再現資料:
- https://benchmarkheaven.com/jev-models
- https://github.com/fstandhartinger/jevbench

### モデルversion / 外部gateway

OpenRouterは **Jev 1.13** を2026-09-18 releaseとして掲載し、context **32K**、価格 **$0.042/M input / output free** と表示しています。`Jev Latest` はJev familyのlatestへredirectするaliasです。これはTypeSafe公式model changelogではなく外部gatewayのmodel metadataなので、`jev-latest` が常に1.13を指すことの公式保証とは扱いません。

Vercel AI GatewayでもJevが利用可能で、TypeSafe direct API以外のaccess経路が実際に存在します。外部gateway経由ではgateway側の契約・routing・privacy条件も別途確認が必要です。

外部platform:
- https://openrouter.ai/typesafe/jev-1.13/
- https://openrouter.ai/~typesafe/jev-latest/
- https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway

### 日本語実測: Claude Code compactionの「要約」ではなく保持判定に使う

2026-09-19公開のZenn記事では、`fast-jev-compaction` をClaude Codeのcompaction hookへ組み込み、tool call / resultごとに「今後も必要か」をJevで判定して不要contextを落とす実装が検証されています。

- n=3 sessionの小規模検証。
- Desktop sessionでは **187,635 tokens → 33,447 tokens（82%削減）を1,351ms**。
- terminalの別sessionではmessage数ベースで **86%削減 / 40%削減**。
- 1 requestに約80 questions（tool call 40件分）をbatchする設計。
- state約14,200 tokensの実測では1 requestで処理。
- 失敗時や削減率25%未満ではClaude Code組込みsummaryへfallbackする。

これは生成要約をJevへ置換したものではありません。**原文を生成し直さず、保持 / 削除というbounded decisionへ問題を変形した**例です。Jevの役割分担を示すagent/context-management用途として有用です。

ただしn=3で、compaction後のtask qualityや長期的な再読コストは未評価です。記事自身も、削除後に同じcommandを再実行した例や、日本語token推定が32K contextを超える可能性を注意点として挙げています。

日本語第三者実測:
- https://zenn.dev/orangewk/articles/claude-code-fast-jev-compaction
- https://github.com/tamaratran/fast-jev-compaction

## 11. 現時点の評価

### 強い点

- 自由文生成を捨てたことで、構造化出力のための生成・parse・retryを減らせる。
- 数百ms級の判断が第三者実測でも複数確認されている。
- 入力単価が非常に低く、output課金を意識せず複数の判断をfan-outしやすい。
- 確率分布とconfidenceをコードの制御に直接組み込める。
- narrow / atomic な意味判断を大量に挟むagent harnessと相性がよい。
- 公式DOOMや複数の第三者ゲーム実装から、interactive systemのdecision layerとしての用途が実際に試されている。
- 公式Privacy Policyでは、API等へ送るInputをモデルtraining / fine-tuningに使わないと明記されている。
- command safety classifierやbusiness-email分類でも第三者の具体的な採用・比較報告が出始めた。ただし再現benchmarkではない。
- JevBench v1.2では、公開harness上でJev 1.13.0のaccuracyだけでなくcalibrationも測定され、低コスト・低遅延とのtrade-offを第三者データで比較できるようになった。

### 未確定・注意点

- early access段階であり、仕様・価格・rate limit・モデルversionが動きやすい。
- 一般的な公開ベンチマークでは比較しづらく、TypeSafe自身のeval設計に依存する部分が大きい。
- 第三者精度検証はまだ少なく、JevBenchも独自task / 独自scoreである。
- 数学・日付・長いcontext・敵対的入力など、LLMとは違う形のjaggednessがある。
- 生成能力がないため、Jev単独でagent全体を置換するものではない。
- レイテンシは地域差があり、日本から公式DOOMと同じ10Hzを前提にはできない。
- game用途でも、60Hz/120Hzのengine loopを置き換えるのではなく、意味判断の層として設計する必要がある。
- logit/logprobsを使うLLMや専用AIでも類似の構成は可能で、Jevだけの独占的用途ではない。
- API Inputの具体的な保持日数、zero-retention、リージョン選択、公開SLAは確認できていない。
- launch直後には需要増でAPI提供不能になったとの報道があり、productionではavailability / fallbackを別途検証する必要がある。

## 12. 継続追跡する項目

1. `jev-latest` が指すモデルversionと変更履歴
2. 公式 jaggedness の更新
3. price / rate limit / access条件
4. 日本・アジア圏からのlatency実測
5. 独立したaccuracy / calibration評価
6. browser / coding agent / RAG / moderationでの実運用例
7. real-time / game / interactive用途の公開harnessと再現実測
8. OpenAI / Anthropic / Google等のstructured decision系との比較
9. LLM logit/logprobs利用との速度・精度・API usability比較
10. Vercel AI Gateway / OpenRouter等、外部基盤経由での利用性・契約条件
11. production SLA、データ保持、privacy、enterprise条件
12. Jev向けのprompt/question設計パターン
13. launch後のAPI capacity / availabilityと障害・rate-limit情報
14. agent context management / compaction用途での長期品質と再読コスト

## 13. 主要出典

### 一次情報

- TypeSafe公式: https://typesafe.ai/
- 発表: https://typesafe.ai/blog/introducing-system-one-models-and-jev
- Documentation: https://docs.typesafe.ai/introduction
- Documentation index: https://docs.typesafe.ai/llms.txt
- Quick Start: https://docs.typesafe.ai/introduction/quickstart
- Confidence: https://docs.typesafe.ai/confidence
- Workflow evals: https://evals.typesafe.ai/
- Privacy Policy: https://typesafe.ai/legal/privacy-policy
- Terms of Use: https://typesafe.ai/legal/terms
- DCVC: https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/

### 日本語・第三者

- DevelopersIO（実測あり）: https://dev.classmethod.jp/articles/jev-for-llm-model-routing/
- Zenn（Jev / LLM比較、DOOM・Mario）: https://zenn.dev/nwn/articles/824026c76116e0
- Zenn（五目並べ、国内レイテンシ実測）: https://zenn.dev/mizchi/articles/jev-plays-gomoku
- Zenn（Claude Code compaction実測）: https://zenn.dev/orangewk/articles/claude-code-fast-jev-compaction
- note（Snake実装）: https://note.com/tomonr1984/n/n057b04c37fda
- VisionHub（日本語整理）: https://visionhub.jp/presentations/day_slides/day_slide_2026_09_14.html

### 第三者検証・実装

- JevBench: https://benchmarkheaven.com/jev-models
- JevBench GitHub: https://github.com/fstandhartinger/jevbench
- Every: https://every.to/also-true-for-humans/mini-vibe-check-typesafe-s-jev-judged-everything-i-ve-written-in-0-7-seconds
- Empryo: https://empryo.com/blog/jev-and-the-harness
- Aera: https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks
- browser-use/jev-ultrafast: https://github.com/browser-use/jev-ultrafast
- mizchi/jev-gomoku: https://github.com/mizchi/jev-gomoku
- fast-jev-compaction: https://github.com/tamaratran/fast-jev-compaction
- TechCrunch（Vercel / Bryo AI利用報告、launch後capacity）: https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/
- OpenRouter Jev 1.13: https://openrouter.ai/typesafe/jev-1.13/
- Vercel AI Gateway: https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway
