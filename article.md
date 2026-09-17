# Jev / System One Modelsは何が違うのか — 「生成しない判断モデル」を整理する

TypeSafe AIが公開したJevは、文章を生成するためのLLMではなく、ソフトウェア内部で必要になる狭い意味判断を返すことに特化したモデルです。

一般的な生成モデルでは、自由文を出力させた後にJSONへ変換し、parse、validation、retryを重ねることがあります。Jevはその部分を別の形で解こうとしています。入力として`state`を受け取り、あらかじめ定義した判断形式で結果を返します。

2026年9月時点ではearly access段階で、productionの標準部品とみなすにはまだ検証が足りません。一方で、低単価、短いレイテンシ、型付きの判断結果という特徴は、routingやranking、guardrail、agent内部の制御などと相性がよさそうです。

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

2026年9月17日時点で、TypeSafe公式サイトに表示されている入力単価は**10億tokensあたり42ドル**です。100万input tokensへ換算すると**0.042ドル**になります。

第三者のDevelopersIOは、同じ価格に加えてoutput課金なしと報告しています。公式サイト上の価格表示と第三者記事の記述は分けて扱う必要がありますが、少なくとも入力単価は一般的な生成モデルとかなり異なる水準です。

この価格帯であれば、1回の大きな生成モデル呼び出しへ複数判断をまとめるのではなく、小さな意味判断を多数fan-outする設計も現実的になります。

出典: [TypeSafe公式](https://typesafe.ai/) / [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/)

## レイテンシは数百ms級の実測がある

TypeSafeは、おおむね**70〜500ms**のレイテンシレンジを掲げています。ただし第三者実測では条件によって差があります。

- DevelopersIO: 4分類を各10回実行し、中央値643〜674ms
- Empryo: 102 error casesで中央値273ms
- Aera: 248 live callsで中央値226ms、p95 497ms

数百ms級の判断が実現している例は複数あります。一方、公式の70〜500msというレンジを常に満たすとまでは言えません。リージョン、入力サイズ、負荷、評価条件を揃えた比較が今後必要です。

出典: [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Empryo](https://empryo.com/blog/jev-and-the-harness) / [Aera](https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks)

## 型付き出力でも、意味的な誤判定は残る

Jevの説明で注意したいのが「hallucinateしない」という表現です。

Jevは自由文を生成せず、事前定義した型や候補空間から結果を返します。そのため、存在しないJSON fieldを追加したり、候補外の文字列を返したり、指定した型そのものを壊したりする失敗は構造的に避けやすくなります。

しかし、定義済み候補の中から誤ったものを選ぶことはあります。

つまり、**出力構造が正しいこと**と**意味的な判断が正しいこと**は別の品質指標です。Jevを評価するときは、この2つを混同しない方がよいでしょう。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [Confidence](https://docs.typesafe.ai/confidence)

## 公開比較ではfrontier LLMを常に上回るわけではない

公開されている比較を見る限り、Jevは絶対的な正答率で常にfrontier LLMを上回るモデルではありません。

DevelopersIOが整理した値では、TypeSafeのworkflow evalでJevは76.0%。Everyの第三者検証では67.8%で、最良比較対象は74.1%でした。

そのため、Jevの価値を「最も高精度なモデル」として評価するより、必要精度を満たす範囲で、判断をどれだけ速く、安く、扱いやすい形でシステムへ差し込めるかを見る方が実態に近いです。

出典: [DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Workflow evals](https://evals.typesafe.ai/)

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

共通しているのは、文章そのものを作る必要がないことです。モデルが返した判断を、次のcodeやagent stepが直接利用できます。

出典: [TypeSafe Cookbooks / docs index](https://docs.typesafe.ai/llms.txt) / [browser-use/jev-ultrafast](https://github.com/browser-use/jev-ultrafast)

## browser-useでは限定的ながら25%短縮の報告もある

公開実装`browser-use/jev-ultrafast`では、ブラウザ操作の判断部分へJevを組み込んでいます。

Google Flightsを使った限定比較では、同一モデル・同一設定で中央値が**9.450秒から7.092秒へ短縮**し、25%高速化したと報告されています。

ただし、この比較は**1タスク・3ペア**という小規模なものです。リポジトリ自身も一般的な信頼性benchmarkではないと明記しているため、ブラウザ操作全般で25%速くなるとは解釈できません。

この例から確認できるのは、agent内部の狭い判断を専用モデルへ置き換えることで、処理全体の待ち時間を削減できる場合がある、という程度です。

出典: [GitHub](https://github.com/browser-use/jev-ultrafast) / [performance.md](https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md)

## 2026年9月時点ではまだearly access

TypeSafeは2026年9月にステルス状態からJevを公開しました。DCVC主導で4000万ドルのseed roundを実施し、SDK、API、cookbookも既に公開されています。

一方、独立したaccuracyやcalibrationの評価はまだ少なく、model version、rate limit、価格、SLA、privacy、data retentionといったproduction利用上の条件は継続確認が必要です。

したがって現時点では、既存の生成モデルを置き換える標準部品として見るより、**新しい判断プリミティブとしてどこまで使えるかを検証する段階**と整理するのが妥当です。

出典: [TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [DCVC](https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/)

## まとめ

Jevは、文章を生成するモデルではなく、狭い意味判断をcodeへ返すための専用モデルです。

低単価と数百ms級のレイテンシ、型付きの判断結果は、routing、ranking、guardrail、agent内部の制御と相性があります。一方、型が正しいことと意味的に正しいことは別であり、誤判定は残ります。`confidence`を使ったfallbackやエスカレーション設計は必要です。

また、計算や日付比較のようにcodeで正確に処理できる仕事までJevへ寄せるべきではありません。

現時点で最も重要なのは、Jevを汎用LLMの代替として見るのではなく、**「Code calculates. Jev judges.」が成立する狭い判断だけを切り出せるか**という観点です。その条件を満たす場所ほど、Jevの特徴を活かしやすいと考えられます。
