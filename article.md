# Jev / System One Modelsは何が違うのか — 「生成しない判断モデル」を整理する

TypeSafe AIが公開したJevは、文章を生成するためのLLMではなく、ソフトウェア内部で必要になる狭い意味判断を返すことに特化したモデルです。

一般的な生成モデルでは、自由文を出力させた後にJSONへ変換し、parse、validation、retryを重ねることがあります。Jevはその部分を別の形で解こうとしています。入力として`state`を受け取り、あらかじめ定義した判断形式で結果を返します。

2026年9月時点ではearly access段階で、productionの標準部品とみなすにはまだ検証が足りません。一方で、低単価、短いレイテンシ、型付きの判断結果という特徴は、routingやranking、guardrail、agent内部の制御に加えて、リアルタイム寄りのインタラクティブ用途でも試されています。

この記事では、Jevの役割、速度と費用、精度、既知の弱点、実際の使いどころを、公式情報と第三者検証を分けながら整理します。

## Jevは文章ではなく「判断」を返す

Jevには、用途の異なる複数のprimitiveがあります。

| primitive | 役割 | 主な返り値 |
| --- | --- | --- |
| Choice | 候補から1つ選ぶ | choice / probabilities / confidence |
| Score | 段階評価する | score / probabilities / confidence |
| Noul | yes/noを確率で判定する | 0〜1の確率 |

たとえば問い合わせ処理なら、「どの部署へ振るか」はChoice、「緊急性があるか」はNoul、「顧客の不満度」はScoreというように分けられます。

重要なのは、複数の意味判断を1つの大きな質問へ詰め込まないことです。TypeSafeは、狭くatomicな質問へ分解する設計を推奨しています。同じ`state`に対して複数の質問を並列・独立に評価できるため、1回の入力から複数種類の判断を取り出せます。

出典: [TypeSafe Introduction](https://docs.typesafe.ai/introduction) / [Quick Start](https://docs.typesafe.ai/introduction/quickstart)

## 「Code calculates. Jev judges.」という役割分担

Jevを使うときは、何でもモデルへ任せるのではなく、意味判断だけを切り出すことが重要です。

たとえば、分類、適合度、緊急性のように意味解釈が必要な部分はJevへ渡せます。一方、日付比較、件数、算術、決定済みの閾値判定のように正確に計算できる処理はcode側へ残します。

さらに、ChoiceやScoreが返す`confidence`や確率分布を使えば、自動実行するか、追加確認するか、人や別モデルへエスカレーションするかをcode側で分けられます。

ここでの`confidence`は正答保証ではありません。モデルの不確実性をシステム制御へ露出させるための値として使う方が適切です。

出典: [Quick Start](https://docs.typesafe.ai/introduction/quickstart) / [Confidence](https://docs.typesafe.ai/confidence)

## 価格はかなり低い

2026年9月18日時点で、TypeSafe公式サイトに表示されている入力単価は**10億tokensあたり42ドル**です。100万input tokensへ換算すると**0.042ドル**になります。公式発表ではoutput tokensは無料と明記されています。

この価格帯であれば、1回の大きな生成モデル呼び出しへ複数判断をまとめるのではなく、小さな意味判断を多数fan-outする設計も現実的になります。

出典: [TypeSafe公式](https://typesafe.ai/) / [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## レイテンシは数百ms級だが、地域差を含めて見る必要がある

TypeSafeは、**70〜500ms**のend-to-end response timeを掲げています。ただし公式発表では、公開evalの多くをサービス拠点に近い米国西海岸のラップトップから実行していると説明しています。

第三者実測では条件によって差があります。

- DevelopersIO: 4分類を各10回実行し、中央値643〜674ms
- Empryo: 102 error casesで中央値273ms
- Aera: 248 live callsで中央値226ms、p95 497ms
- Zennの五目並べ検証: 日本からの25手で多くが484〜603ms程度、1手は1243ms

数百ms級の判断が実現している例は複数あります。一方、公式の100ms級を日本から常時再現できるとまでは言えません。リージョン、入力サイズ、負荷、評価条件を揃えた比較が必要です。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Empryo](https://empryo.com/blog/jev-and-the-harness) / [Aera](https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks) / [Zenn: 五目並べ](https://zenn.dev/mizchi/articles/jev-plays-gomoku)

## 公式はリアルタイム用途を主要use caseとして挙げている

Jevのリアルタイム用途は、第三者が後から考えた応用ではありません。TypeSafe自身が公式発表で**Real-time applications**を主要use caseとして挙げ、「100ms speeds」でUXが重要なアプリケーションへAIを組み込めると説明しています。

その具体例がDOOMです。公式デモではJevへ**1秒あたり10回**問い合わせています。約100ms間隔でゲーム状態を判断させ、結果をゲームへ戻す構成です。TypeSafeの試算では、この頻度でも費用は約**7ドル/時**です。

ただし、JevがDOOMの画面画像を直接見ているわけではありません。入力はテキストを含む**構造化されたgame state**です。さらにTypeSafe自身が、専用の非AI botならDOOMをより上手くプレイできると明記しています。

このデモが示しているのは、Jevが最強のゲームAIになることではなく、**構造化された状態に対する意味判断を、ゲームへ戻せる程度の短い間隔で繰り返せること**です。

出典: [TypeSafe発表 — Real-time applications / Doom](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## ゲームでは毎フレーム処理ではなく「意味判断層」に置く方が自然

公式DOOMの10Hzと、日本から約500ms前後になった第三者実測を合わせると、Jevを60Hzや120Hzのゲームループそのものへ置く設計は現実的ではありません。

たとえば次のような役割分担が考えられます。

| 通常のcode / engineに残す | Jevへ切り出しやすい |
| --- | --- |
| 入力、物理、衝突、移動補間 | 攻める / 退く / 待つ |
| 射撃、ダメージ計算 | どの敵を優先するか |
| pathfinding、合法手生成 | どの候補行動を選ぶか |
| animation、描画 | 援軍、撤退、交渉などの状態判断 |

つまり、**合法手や実行可能候補をcode側で絞り、その中の意味的な選択をJevへ任せる**構成です。

ここでいう「数Hz〜10Hz程度の判断層」は、公開例から導く設計上の目安であって、TypeSafeが製品仕様として保証している頻度ではありません。

## Mario・五目並べ・Snakeでも第三者実装が出ている

公式DOOM以外にも、ゲームを使った第三者検証が出ています。

### Mario

Zennの検証では、公開されたMarioハーネスを使ってJevと複数のLLMを比較しています。検証者の環境では、公開デモより**約3倍程度のレイテンシ**があり、その差がプレイ結果へ影響した可能性が指摘されています。

同じ環境内ではJevが比較対象LLMより良い結果でした。ただし、比較できたLLMはlogitやlogprobsを取得できる旧世代の非推論モデルが中心で、最新の推論モデルとの公平な比較ではありません。

出典: [Zenn: TypeSafeのJevを正しく驚く](https://zenn.dev/nwn/articles/824026c76116e0)

### 五目並べ

別のZenn記事では、15x15の五目並べをJev同士で対戦させています。ここでは盤面全体を丸投げせず、**現在合法な手だけをChoice候補として渡す**構成です。

25手の対局ログでは、多くのAPI呼び出しが約484〜603ms、1回は1243msで、対局全体は13.913秒でした。

この実装は、ゲーム用途でのJevの置き場所を理解するうえで分かりやすい例です。ルール判定や合法手生成はcode側で行い、Jevには候補の中からどれを選ぶかという意味判断を任せています。

出典: [Zenn: jev同士に五目並べで対戦させた](https://zenn.dev/mizchi/articles/jev-plays-gomoku) / [GitHub: mizchi/jev-gomoku](https://github.com/mizchi/jev-gomoku)

### Snake

個人実装として、Snakeのgame stateを渡し、移動方向をChoiceで選ばせる例も公開されています。これは性能benchmarkとしては扱えませんが、別のゲームでも**state → 限定された行動候補 → Choice**という設計が再現されている確認材料になります。

出典: [note: 確率しか返さないAIモデル「Jev」にSnakeを遊ばせた技術メモ](https://note.com/tomonr1984/n/n057b04c37fda)

## Wikiracingは高cardinality選択の例になっている

TypeSafeはもう1つ、game-likeな例としてWikiracingを公開しています。Wikipedia上で、現在のページにある数百から数千のリンクから次に進むリンクを選び、目的ページを目指すタスクです。

公式説明では、JevのChoiceはcardinality最大255まで対応し、それを超える候補では、独立scoreの後にexplicit choiceを行う2段構成を使っています。

これはDOOMのようなリアルタイム操作ではありませんが、**候補数の多い選択を何度も繰り返す探索タスク**として、Jevの別の使い方を示しています。

出典: [TypeSafe発表 — Wikiracing](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## 「リアルタイム判断」はJevだけに可能な処理ではない

Jevの特徴を評価する際には、比較対象の置き方に注意が必要です。

Zennの検証では、通常のLLMでも、回答候補を短いIDへ割り当てて最初の1tokenのlogitを比較し、複数質問をbatch推論することで、自由文JSONを最後まで生成させる方式より大幅に高速化できることが示されています。Gemma 3 270Mを用いた検証では、JSON全文生成に対して77倍高速だったと報告されています。

したがって、Jevと比較すべき対象は「JSONを全文生成するLLM」だけではありません。

- Jev
- LLM + logit / logprobs
- rule / utility AI / behavior tree
- ゲームや制御向けの専用model

Jevの強みは、同種の意味判断を他方式では実現できないことではなく、**型付きの確率判断、複数質問の並列評価、低単価・低遅延を専用APIとしてまとめて提供していること**にあります。

出典: [Zenn: TypeSafeのJevを正しく驚く](https://zenn.dev/nwn/articles/824026c76116e0)

## 型付き出力でも、意味的な誤判定は残る

Jevの説明で注意したいのが「hallucinateしない」という表現です。

Jevは自由文を生成せず、事前定義した型や候補空間から結果を返します。そのため、存在しないJSON fieldを追加したり、候補外の文字列を返したり、指定した型そのものを壊したりする失敗は構造的に避けやすくなります。

しかし、定義済み候補の中から誤ったものを選ぶことはあります。

つまり、**出力構造が正しいこと**と**意味的な判断が正しいこと**は別の品質指標です。Jevを評価するときは、この2つを混同しない方がよいでしょう。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [Confidence](https://docs.typesafe.ai/confidence)

## 公開比較ではfrontier LLMを常に上回るわけではない

公開されている比較を見る限り、Jevは絶対的な正答率で常にfrontier LLMを上回るモデルではありません。

DevelopersIOが整理した値では、TypeSafeのworkflow evalでJevは76.0%。Everyの第三者検証では67.8%で、最良比較対象は74.1%でした。

TypeSafe自身も、workflow evalから得た193.6倍高速・444.6倍低コストという値について、実利用で得られる改善幅の高い側にあると予想する旨を留保しています。

そのため、Jevの価値を「最も高精度なモデル」として評価するより、必要精度を満たす範囲で、判断をどれだけ速く、安く、扱いやすい形でシステムへ差し込めるかを見る方が実態に近いです。

出典: [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Workflow evals](https://evals.typesafe.ai/) / [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## Jevにも固有の弱点がある

TypeSafeはJevの既知の弱点を`jaggedness`として公開しています。現時点で確認している注意点には、次のようなものがあります。

- 曖昧な意図を補完するより、指示を文字通りに読みやすい
- 計数や算術を任せない方がよい
- 日付の大小比較や期間計算はcodeへ寄せる
- 無関係な情報を`state`へ詰めすぎない
- user-controlled textを自動的に安全な入力として扱わない
- 複数の意味判断を1問へ詰め込まず、atomicに分ける

意味判断へ特化したモデルだからこそ、任せる仕事と任せない仕事を明確に分ける必要があります。

出典: [TypeSafe docs index](https://docs.typesafe.ai/llms.txt)

## どこで使うと効果が出やすいか

Jevが適合しやすいのは、回答空間を事前に限定し、その結果をcodeやagentがすぐ使える場所です。

代表的な候補には、次があります。

- LLM / agentのモデルルーティング
- tool / skill候補の選択
- retry / haltの判定
- guardrail / moderation
- 問い合わせ、障害、案件の分類
- RAG passageの採用・棄却
- citationの支持関係チェック
- 検索結果のreranking
- ブラウザエージェントの次アクション選択
- ゲームやリアルタイムアプリ内の低頻度な意味判断

共通しているのは、文章そのものを作る必要がないことです。モデルが返した判断を、次のcodeやagent stepが直接利用できます。

出典: [TypeSafe Cookbooks / docs index](https://docs.typesafe.ai/llms.txt) / [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [browser-use/jev-ultrafast](https://github.com/browser-use/jev-ultrafast)

## browser-useでは限定的ながら25%短縮の報告もある

公開実装`browser-use/jev-ultrafast`では、ブラウザ操作の判断部分へJevを組み込んでいます。

Google Flightsを使った限定比較では、同一モデル・同一設定で中央値が**9.450秒から7.092秒へ短縮**し、25%高速化したと報告されています。

ただし、この比較は**1タスク・3ペア**という小規模なものです。リポジトリ自身も一般的な信頼性benchmarkではないと明記しているため、ブラウザ操作全般で25%速くなるとは解釈できません。

この例から確認できるのは、agent内部の狭い判断を専用モデルへ置き換えることで、処理全体の待ち時間を削減できる場合がある、という程度です。

出典: [GitHub](https://github.com/browser-use/jev-ultrafast) / [performance.md](https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md)

## 2026年9月時点ではまだearly access

TypeSafeは**2026年9月15日**にJevをearly accessとして公式発表しました。DCVCも同日、4000万ドルのSeries Seedを主導したと発表しています。SDK、API、cookbookも既に公開されています。

一方、独立したaccuracyやcalibrationの評価はまだ少なく、model version、rate limit、価格、SLA、privacy、data retentionといったproduction利用上の条件は継続確認が必要です。

したがって現時点では、既存の生成モデルを置き換える標準部品として見るより、**新しい判断プリミティブとしてどこまで使えるかを検証する段階**と整理するのが妥当です。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [DCVC](https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/)

## まとめ

Jevは、文章を生成するモデルではなく、狭い意味判断をcodeへ返すための専用モデルです。

低単価と数百ms級のレイテンシ、型付きの判断結果は、routing、ranking、guardrail、agent内部の制御と相性があります。さらに、公式DOOMやMario、五目並べ、Snakeといった例から、リアルタイム寄りのインタラクティブ用途も実際に試されています。

ただし、公式DOOMの10Hzを日本からそのまま前提にはできません。第三者実測では約500msになる例もあります。ゲームで使う場合は、物理や衝突、合法手生成をcodeへ残し、その上の低頻度な意味判断をJevへ切り出す構成が現実的です。

また、LLMのlogit利用や従来のrule / utility AI、専用モデルでも類似処理は可能です。Jevの価値は「他では不可能なこと」より、**意味判断専用の型付き確率interfaceを低遅延・低単価で扱えること**にあります。

型が正しいことと意味的に正しいことは別であり、誤判定は残ります。`confidence`を使ったfallbackやエスカレーション設計も必要です。

現時点で最も重要なのは、Jevを汎用LLMの代替として見るのではなく、**「Code calculates. Jev judges.」が成立する狭い判断だけを切り出せるか**という観点です。その条件を満たす場所ほど、Jevの特徴を活かしやすいと考えられます。