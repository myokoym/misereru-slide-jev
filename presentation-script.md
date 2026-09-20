<!-- {"misereru":"presentation-script","version":1} -->
<!-- {"slide":"title"} -->
## Jev / System One Models

### Narration

この資料では、TypeSafe AIのJevを、通常の生成AIとは別の「判断専用モデル」として整理します。何ができるかだけでなく、速度・費用・精度・弱点・実際の使いどころまで、2026年9月時点で確認できる情報を分けて見ていきます。

---

<!-- {"slide":"__misereru_toc__"} -->
## 目次

### Narration

最初にJevの役割を確認し、その直後に具体的な用途を見ます。次に速度と費用、型保証と判断精度、既知の弱点、最後にearly accessとしての現在地と継続確認です。用途を後回しにせず、第2章で先に全体像を示します。

---

<!-- {"slide":"section-what"} -->
## 1. Jevは何を置き換えるのか

### Narration

まず、JevをLLMの小型版として見るのではなく、何を担当させるためのモデルなのかを確認します。中心になるのは文章生成ではなく、ソフトウェア内部で繰り返し発生する狭い意味判断です。

---

<!-- {"slide":"interface"} -->
## Jevは `state` を受け取り、定義済みの型で判断を返す

### Narration

ここでは入出力の違いが重要です。Jevは自由文を作ってから構造化するのではなく、Choice、Score、Noulというあらかじめ決めた判断形式で結果を返します。表はそれぞれ「選択」「段階評価」「yes側の確率」という役割の違いを示しています。同じstateに複数の質問を与えられるため、ひとつの入力から複数の判断を並行して取り出せます。

---

<!-- {"slide":"design"} -->
## 複雑な判断は、atomicな質問へ分解する

### Narration

Jevでは、大きな判断を一度に任せるより、意味の異なる問いを分ける設計が基本になります。たとえば問い合わせ処理なら、振り分け、緊急性、不満度を別々に判断します。自動処理してよいかは、モデルへさらに判断させるのではなく、返ってきたconfidenceを使ってコード側で制御します。

---

<!-- {"slide":"design-code"} -->
## 意味判断はJev、正確に計算できる処理はcodeへ残す

### Narration

役割分担を明確にすると、Jevに向く処理と向かない処理が見えやすくなります。分類や適合度のような意味判断はJevへ、日付比較や件数、算術のように正確な答えをコードで出せるものはコードへ残します。システム全体としては、その間をconfidenceや確率でつなぐ構成です。

---

<!-- {"slide":"section-usecases"} -->
## 2. 具体的な用途

### Narration

ここで用途を先に確認します。Jevの用途は業界名より、どの種類の判断をソフトウェアから切り出すかで整理した方が分かりやすくなります。共通条件は、回答空間を限定でき、返った判断を次のコードやエージェント処理が直接使えることです。

---

<!-- {"slide":"usecases-map"} -->
## 用途は6系統 — agent・検索・安全判定

### Narration

まず3系統です。agentやharnessでは次の行動、retrievalでは採用や順位、guardrailでは通過させてよいかを判断します。いずれも文章生成ではなく、限定された候補や評価軸に対する判断です。

---

<!-- {"slide":"usecases-map-2"} -->
## 用途は6系統 — 業務・大量選別・interactive

### Narration

残りは業務workflow分類、大量候補のfilteringやcontext管理、real-time / interactiveです。問い合わせ分類とゲームAIは見た目が違いますが、Jevへ渡す仕事は「現在のstateから限定候補を選ぶ」という同じ形へ落とせます。

---

<!-- {"slide":"usecases-routing"} -->
## Agent / harnessでは「次に何をするか」だけを判断させる

### Narration

agent loopでは、modelやsubagentのrouting、toolやskillの選択、continue、retry、ユーザーへの確認、stopといった次の一手だけをJevへ判断させます。実際のtool実行、権限確認、決定済みpolicyはコード側へ残します。Vercelもこの責任分担を具体例として説明しています。

---

<!-- {"slide":"usecases-retrieval"} -->
## Retrieval・verificationでは「採用するか」「支持するか」を判定する

### Narration

検索やRAGでは文章生成より前に、候補を採用するか、citationがclaimを支持しているか、検索結果をどの順に並べるかという評価があります。guardrailでも同じように、prompt injectionやharmful outputを通してよいかという判定へ落とせます。ここでも結果を次のコードが直接使えることが重要です。

---

<!-- {"slide":"usecases-production"} -->
## safety判定・業務分類でも第三者の利用報告が出ている

### Narration

公式cookbookだけでなく第三者の利用報告もあります。TechCrunchは、Vercelでcommand safety classifierをLuna 5.6からJevへ替え、5倍から18倍速く、精度も高かったという開発者報告を紹介しています。Bryo AIのbusiness email分類では、Geminiの方がわずかに高精度だった一方、Jevは10倍から20倍安価だったと報告されています。どちらも再現可能benchmarkではないため、特定workflowでの採用例として扱います。

---

<!-- {"slide":"usecases-context"} -->
## Context管理では、要約生成をkeep / drop判定へ変形できる

### Narration

fast-jev-compactionは、生成要約をJevへ書かせるのではありません。tool callとresultごとに今後も必要かを判定し、keep、truncate、dropへ振り分けます。公開されたn=3の実測では、Desktop sessionで187,635 tokenを33,447 tokenまで82パーセント削減し、処理時間は1.351秒でした。長期的なtask qualityは未評価で、失敗時は組込みsummaryへfallbackします。

---

<!-- {"slide":"browser"} -->
## browser-useの限定比較では、Jev導入後に中央値25%短縮と報告されている

### Narration

公開実装の具体例としてbrowser-useがあります。Google Flightsの限定タスクでは、中央値が9.450秒から7.092秒へ短縮したと報告されています。ただし比較は1タスク3ペアだけなので、この25パーセントを一般的な性能差として扱うことはできません。あくまで、判断部分を軽量化した実装例として見ます。

---

<!-- {"slide":"section-performance"} -->
## 3. 速度と費用はどこまで低いか

### Narration

次にJevの主要な訴求点である速度と費用を見ます。ここはベンダーの公式値だけでなく、第三者が実際に呼び出した結果を分けて確認します。特にリアルタイム用途では、利用地域によるレイテンシ差が重要です。

---

<!-- {"slide":"price"} -->
## 公式入力単価は $0.042 / 100万tokens

### Narration

公式の入力単価は100万input tokensあたり0.042ドルです。公式発表ではoutput tokensは無料とされています。この価格なら判断を一つの大きなプロンプトへ詰め込む必要が薄くなり、狭い判断を複数回呼ぶ設計が現実的になります。

---

<!-- {"slide":"latency"} -->
## 公式の70〜500msは、測定地点を含めて読む必要がある

### Narration

TypeSafeは70から500ミリ秒のend-to-end response timeを掲げています。ただし公式自身が、公開evalの多くをサービス拠点に近い米国西海岸のラップトップから測定していると説明しています。したがって、このレンジを日本からの実効値とそのまま同一視しません。

---

<!-- {"slide":"latency-thirdparty"} -->
## 第三者実測は約0.2〜0.7秒中心で、日本では約0.5秒の例がある

### Narration

第三者実測を見ると、Aeraは中央値226ミリ秒、Empryoは273ミリ秒、DevelopersIOは643から674ミリ秒でした。日本からの五目並べ検証では多くの手が484から603ミリ秒で、1回は1243ミリ秒です。100ミリ秒級が可能という主張と、日本から常時100ミリ秒級という主張は分けて扱う必要があります。

---

<!-- {"slide":"realtime-official"} -->
## 公式は「real-time applications」を主要用途に置き、DOOMを10 queries/sで動かしている

### Narration

リアルタイム用途は第三者が後から考えた応用ではなく、TypeSafe自身が主要用途として挙げています。DOOMデモでは1秒あたり10回、約100ミリ秒間隔でJevへ判断を求めています。ただし画面画像を直接見ているのではなく、ゲーム側から構造化されたstateを渡しています。またTypeSafe自身が、専用の非AI botならより上手くプレイできると留保しています。ここで示しているのは最高性能のゲームAIではなく、意味判断を短い間隔でゲームへ戻せることです。

---

<!-- {"slide":"realtime-game-design"} -->
## ゲームでは毎フレーム処理ではなく、意味判断だけを低頻度で呼ぶ

### Narration

ゲームへ入れる場合、Jevで60Hzや120Hzのゲームループを置き換える設計ではありません。入力、物理、衝突、補間、合法手生成、描画などは通常のコードへ残し、「攻めるか退くか」「どの敵を優先するか」といった意味判断だけをJevへ渡します。数Hzから10Hzという幅は公開例から導く設計上の目安で、製品仕様の保証ではありません。

---

<!-- {"slide":"realtime-thirdparty"} -->
## Mario・五目並べ・Snakeでも「state → 候補 → Choice」が使われている

### Narration

第三者実装も複数あります。Marioでは検証者環境のレイテンシが公開デモより約3倍でした。五目並べでは合法手だけをChoice候補へ渡し、25手を約13.9秒で対局しています。Snakeでもgame stateから移動方向をChoiceで選ぶ実装があります。共通するのは、コード側で候補を制約してから意味的な選択をJevへ任せている点です。

---

<!-- {"slide":"realtime-comparison"} -->
## 比較対象は「JSON生成LLM」だけではない

### Narration

比較対象は文章を最後まで生成するLLMだけではありません。通常のLLMでも候補IDのlogitやlogprobsを直接読む構成ができますし、rule、utility AI、専用modelも有力です。Jevの差は、型付きの確率判断と並列質問を、低遅延・低単価の専用interfaceとしてまとめて提供している点にあります。

---

<!-- {"slide":"section-quality"} -->
## 4. 型保証と判断精度は別に評価する

### Narration

ここからは品質です。Jevの型付き出力は強い特徴ですが、型が正しいことと、判断内容が正しいことは別問題なので、切り分けて見ます。

---

<!-- {"slide":"hallucination"} -->
## 「hallucinateしない」は、候補外を生成しにくいという意味で読む

### Narration

Jevの「hallucinateしない」という表現は範囲を限定して読みます。自由文を生成しないため、候補外の文字列や想定外のフィールドを作る種類の失敗は避けやすくなります。一方、用意された候補の中から間違ったものを選ぶことはあるので、意味的な正答まで保証されるわけではありません。

---

<!-- {"slide":"accuracy"} -->
## 公開比較では、Jevがfrontier LLMを常に上回るわけではない

### Narration

公開されている精度比較を見ると、Jevが常に最上位という結果ではありません。表では、TypeSafe側のworkflow evalとEveryの第三者検証で条件も結果も異なっています。Jevの評価では、絶対的な正答率だけでなく、用途に必要な精度を満たしたうえで速度と費用をどこまで下げられるかを見る必要があります。

---

<!-- {"slide":"confidence"} -->
## confidenceは、自動実行するかfallbackするかの分岐に使う

### Narration

confidenceは、判断結果をそのまま採用するかどうかをシステム側で決めるために使えます。高ければ自動実行、中間なら追加確認、低ければ人や別モデルへ回す、といった分岐です。ただしconfidence自体が正答を保証する値ではないので、運用上の閾値は用途ごとに検証する必要があります。

---

<!-- {"slide":"section-limits"} -->
## 5. JevにはLLMと異なるjaggednessがある

### Narration

Jevには一般的なLLMとは少し違う得意不得意があります。意味判断へ特化しているため、何を任せずコードへ残すべきかも比較的はっきりしています。

---

<!-- {"slide":"limits"} -->
## 計算・日付比較・長すぎるstateはcode側へ寄せる

### Narration

特に計数、算術、日付比較のように決定的に計算できる処理はコード側へ寄せます。また、stateへ無関係な情報を詰め込んだり、複数の判断を一問にまとめたりすることも避けます。公式のjaggedness文書は継続して確認します。

---

<!-- {"slide":"section-status"} -->
## 6. 現在地と継続確認

### Narration

最後に、early access製品としての現在地と、今後も追うべき項目を整理します。性能だけでなく、契約条件やavailabilityもproduction利用には必要です。

---

<!-- {"slide":"status"} -->
## 2026年9月時点ではearly access

### Narration

TypeSafeの公式発表日は2026年9月15日です。API、SDK、cookbookは既に公開され、第三者実装やbenchmarkも出始めています。一方でまだearly accessなので、既存の生成モデルを置き換える標準部品というより、新しい判断プリミティブとして検証する段階です。

---

<!-- {"slide":"status-production"} -->
## production利用では契約・privacy・availabilityがまだ重要な確認項目

### Narration

公式Privacy PolicyではAPI等へ送るInputをtrainingやfine-tuningに使わないと明記されています。一方、具体的な保持日数、zero-retention、リージョン選択、Jev APIの公開SLAは確認できていません。launch直後には需要増によるcapacity問題も報道されており、モデル性能とは別にavailabilityとfallbackを確認する必要があります。

---

<!-- {"slide":"watch-spec"} -->
## 継続調査: まず変わりやすい仕様を追う

### Narration

継続調査では、まず変更されやすい仕様を追います。`jev-latest`の実体、jaggednessやchangelog、価格とrate limit、さらにproduction向けのSLAやデータ取り扱いです。early access中は、現在値を固定仕様として資料へ残し続けないことを重視します。

---

<!-- {"slide":"watch-evidence"} -->
## 継続調査: 独立検証と実運用例を増やす

### Narration

もう一つの軸は第三者検証です。日本やアジアからのレイテンシ、ゲームなどリアルタイム用途での実効値、accuracyやcalibrationに加え、agent、RAG、command safety、業務workflow、context managementの実利用例を増やしていきます。ベンダー自身の主張、開発者報告、再現可能benchmarkを混ぜないことを基本ルールにします。

---

<!-- {"slide":"conclusion"} -->
## 現時点のまとめ — Jevが向く場所

### Narration

Jevは生成モデルの代替というより、狭い意味判断を高速・低コストでコードへ返す専用部品として見るのが適切です。agent制御、retrieval、guardrail、業務分類、context管理、interactiveと用途は広いですが、共通するのは回答空間を限定でき、判断結果を次の処理が直接使えることです。ゲームでも毎フレーム処理ではなく、その上の意味判断層へ置く構成が自然です。

---

<!-- {"slide":"conclusion-caveats"} -->
## 現時点のまとめ — まだ前提にしてはいけないこと

### Narration

一方、公式DOOMの10Hzを日本から常時再現できるとは限りません。型付き出力でも意味的な誤判定は残り、LLMのlogit利用や従来AIでも類似処理は可能です。confidenceとfallbackを含めたシステム設計が必要で、early access中はversion、価格、SLA、calibrationを固定前提にしないよう継続確認します。
