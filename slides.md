<!-- {"key":"title"} -->
# Jev

TypeSafe AIの「判断専用モデル」は、何を変えるのか

2026-09-17 時点の調査

---

<!-- {"key":"summary"} -->
# 先に結論

Jevは、LLMの小型版というより **「意味を理解する if / switch」** に近いAIです。

- 自由文を生成せず、**Choice / Score / Noul** の型付き判断を返す
- 数百ms級・極低単価で、ソフトウェア内部の細かい判断を何度も呼ぶ設計
- 強みは「最高精度」より **速度・費用・構造化・確率をコードで扱えること**
- 一方で、意味的な誤判定は起こる。計算・日付・長いcontextなどにも弱点がある
- 現状は early access。第三者検証は増え始めたばかり

---

<!-- {"key":"section-what","type":"section"} -->
# 1. Jevとは何か

生成AIではなく、ソフトウェア内の「判断」を狙う

---

<!-- {"key":"interface"} -->
# unstructured state in, typed decisions out

通常のLLMは、文章を生成してからJSONなどへ整形します。

Jevは最初から、事前定義した型の判断を返します。

| primitive | 用途 | 主な返り値 |
| --- | --- | --- |
| Choice | 候補から1つ選ぶ | choice / probabilities / confidence |
| Score | 段階評価する | score / probabilities / confidence |
| Noul | yes/noを確率で判定 | 0〜1 の確率 |

複数の質問を、同じ `state` に対して並列・独立に評価できます。

[公式Introduction](https://docs.typesafe.ai/introduction)

---

<!-- {"key":"design"} -->
# 「考えさせる」より「分解して聞く」

TypeSafeが推奨する基本設計は、複雑な判断をatomicな質問へ分解し、結合はコード側で行うことです。

たとえば「この問い合わせをどう処理する？」を1問で聞くのではなく、

- どの部署か → Choice
- 緊急性はあるか → Noul
- 顧客の不満度は → Score
- 自動処理してよいconfidenceか → code

という形に分けます。

**Code calculates. Jev judges.** という役割分担が中心です。

[Quick Start](https://docs.typesafe.ai/introduction/quickstart)

---

<!-- {"key":"section-performance","type":"section"} -->
# 2. 速さと安さ

ここがJevの主戦場

---

<!-- {"key":"price"} -->
# 価格は極端に低い

2026-09-17時点の公式表示では、入力は

**$42 / 10億 tokens = $0.042 / 100万 input tokens**

第三者記事では output は無料と確認されています。

この価格構造では、1回の大きなLLM呼び出しに詰め込むより、**小さな判断を大量にfan-outする**設計が現実的になります。

[TypeSafe公式](https://typesafe.ai/)  
[DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/)

---

<!-- {"key":"latency"} -->
# 「数百ms級」は第三者実測でも見える

TypeSafeは、おおむね **70〜500ms** のレンジを掲げています。

第三者実測:

| 検証 | 実測 |
| --- | --- |
| DevelopersIO / 40 calls | 中央値 643〜674ms |
| Empryo / 102 cases | 中央値 273ms |
| Aera / 248 live calls | 中央値 226ms、p95 497ms |

公式値を常時保証するとは言えませんが、**従来LLMよりかなり短い判断レイテンシ**は複数の独立例で確認され始めています。

[DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [Empryo](https://empryo.com/blog/jev-and-the-harness) / [Aera](https://aerabrowser.com/news/agent-memory-doesnt-need-a-generator-typesafes-jev-vs-llm-on-400-real-tasks)

---

<!-- {"key":"section-quality","type":"section"} -->
# 3. では、判断は正しいのか

型保証と正答率は別

---

<!-- {"key":"hallucination"} -->
# 「hallucinateしない」は限定して読む

Jevは自由文を生成しないため、

- 存在しないJSON fieldを作る
- 候補外の文字列を返す
- 指定した型そのものを壊す

といった種類の失敗を構造的に減らせます。

しかし、**候補の中から間違ったものを選ぶことはあります。**

したがって、

**型は保証できても、意味的な正答は保証されない**

という整理が重要です。

[公式発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [Confidence](https://docs.typesafe.ai/confidence)

---

<!-- {"key":"accuracy"} -->
# 精度は「圧勝」ではない

公開されている比較では、Jevの精度はfrontier系LLMと同等〜やや下になる例があります。

DevelopersIOが整理した値:

- TypeSafe workflow eval: Jev **76.0%**
- Everyの第三者検証: Jev **67.8%**、最良比較対象 **74.1%**

現状の価値は、

**少し精度を落としてでも、判断を桁違いに速く・安く差し込めるか**

で評価した方が実態に近そうです。

[DevelopersIO](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/) / [公式Workflow evals](https://evals.typesafe.ai/)

---

<!-- {"key":"confidence"} -->
# confidenceを「実行可否」に使える

Choice / Score は確率分布と `confidence` を返します。

たとえば、

- 高confidence → 自動実行
- 中confidence → 追加確認
- 低confidence → 人または別モデルへ

といった制御をコード側で明示できます。

重要なのは、confidenceが正答保証ではなく、**モデル自身の不確実性をシステム設計へ露出させる値**だという点です。

[公式Confidence](https://docs.typesafe.ai/confidence)

---

<!-- {"key":"section-limits","type":"section"} -->
# 4. Jevの苦手なところ

LLMとは違うjaggednessがある

---

<!-- {"key":"limits"} -->
# Jevに任せない方がよい仕事

TypeSafeは `Jev 1.13 jaggedness` という既知の弱点ページを用意しています。

現時点で確認できる注意点は、

- 曖昧な意図を補うより、指示を文字通りに読みやすい
- 計数・算術を任せない
- 日付の大小比較や期間計算はcodeへ
- 不要な情報をstateへ詰めすぎない
- user-controlled textを自動的に安全な入力として扱わない
- 複数判断を1問へ詰め込まない

です。

**AIに任せるのは意味判断。正確に計算できるものはcodeへ。**

[公式docs index](https://docs.typesafe.ai/llms.txt)

---

<!-- {"key":"section-usecases","type":"section"} -->
# 5. どこで使うと効くか

生成モデルを置き換えるより、周囲へ差し込む

---

<!-- {"key":"usecases"} -->
# Jev向きの場所

- LLM / agent のモデルルーティング
- tool / skill候補の選択
- retry / halt の判定
- RAG passage の採用・棄却
- citationの支持関係チェック
- guardrail / moderation
- 検索結果のreranking
- 問い合わせ・障害・案件の分類
- ブラウザエージェントの次アクション選択

共通するのは、**回答空間が限定でき、ソフトウェアがその結果をすぐ使う**ことです。

[公式Cookbooks一覧](https://docs.typesafe.ai/llms.txt)

---

<!-- {"key":"browser"} -->
# browser agentでは既に実装例がある

`browser-use/jev-ultrafast` は、Jevをブラウザ操作の判断部分へ入れた公開実装です。

Google Flightsの限定比較では、同一モデル・設定で

**中央値 9.450秒 → 7.092秒（25%短縮）**

と報告されています。

ただし比較は1タスク・3ペアで、リポジトリ自身も一般的な信頼性benchmarkではないと明記しています。

[GitHub](https://github.com/browser-use/jev-ultrafast) / [performance.md](https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md)

---

<!-- {"key":"status"} -->
# まだ「完成した標準部品」ではない

2026年9月時点では early access。

- TypeSafeは2026年9月にステルス状態から公開
- DCVC主導で **$40M seed round**
- SDK / API / cookbooks は既に公開
- 一方、第三者のaccuracy / calibration検証はまだ少ない
- version、rate limit、価格、運用条件は今後動く可能性が高い

「面白い新技術」から「productionの定番部品」へ進むかは、これからの独立検証が重要です。

[TypeSafe発表](https://typesafe.ai/blog/introducing-system-one-models-and-jev) / [DCVC](https://www.dcvc.com/news-insights/typesafe-emerges-from-stealth-with-a-new-way-of-doing-ai/)

---

<!-- {"key":"watch"} -->
# 継続して追うもの

1. `jev-latest` のversion更新
2. 公式jaggedness / changelog
3. price / rate limit / access条件
4. 日本・アジアからのlatency
5. 独立したaccuracy / calibration検証
6. coding agent / browser / RAGの実運用例
7. OpenAI・Anthropic・Google等との比較
8. production SLA / privacy / data retention

詳細な根拠・更新履歴は [`research.md`](research.md) に蓄積します。

---

<!-- {"key":"sources"} -->
# 主な出典

- [TypeSafe AI](https://typesafe.ai/)
- [Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [TypeSafe Documentation](https://docs.typesafe.ai/introduction)
- [Documentation index](https://docs.typesafe.ai/llms.txt)
- [Workflow evals](https://evals.typesafe.ai/)
- [DevelopersIO: Jevモデルルーティング実測](https://dev.classmethod.jp/articles/jev-for-llm-model-routing/)
- [Every: hands-on test](https://every.to/also-true-for-humans/mini-vibe-check-typesafe-s-jev-judged-everything-i-ve-written-in-0-7-seconds)
- [Empryo: 102 error cases](https://empryo.com/blog/jev-and-the-harness)
- [browser-use/jev-ultrafast](https://github.com/browser-use/jev-ultrafast)

調査台帳: [`research.md`](research.md)
