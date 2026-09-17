# AGENTS.md

このrepositoryは、TypeSafe AIのJev / System One Modelsを継続調査し、misereru形式で公開する資料repositoryです。

AI agentがこのrepositoryを扱うときは、**新しい資料を作るのではなく、ここにある正本を継続更新する**ことを最優先にします。

## Repository identity

- repository: `myokoym/misereru-slide-jev`
- default branch: `main`
- 公開スライド: https://myokoym.github.io/misereru-slide-jev/
- 公開発表原稿: https://myokoym.github.io/misereru-slide-jev/presentation-script.html
- 公開記事: https://myokoym.github.io/misereru-slide-jev/article.html

Jevについて「スライド更新」「資料更新」「調査結果を反映」と依頼された場合、原則としてこのrepositoryが作業対象です。

## 正本

- `research.md`: 調査台帳。一次情報、第三者検証、数値条件、留保、誤記訂正、追跡項目を残す
- `slides.md`: 人に見せるためのスライド正本。Reference modeを基本とする
- `presentation-script.md`: stable `key`で各slideに対応する発表原稿の正本
- `article.md`: スライドを見なくても単体で理解できる記事の正本
- `README.md`: repositoryの役割、公開先、調査方針、運用説明
- `misereru.config.json`: output / GitHub Pages設定

`dist/`やGitHub Pages上のHTMLは生成物であり、直接編集しません。

## Jev調査を更新するときの順序

1. 既存の`research.md`を読む
2. 必要ならWebで最新情報を再調査する
3. 一次情報と第三者情報を区別して`research.md`へ反映する
4. 資料として重要な内容だけを`slides.md`へ反映する
5. slideを追加・変更した場合、`presentation-script.md`の対応keyとNarrationを同期する
6. 記事だけで理解するために必要な変更を`article.md`へ反映する
7. 追跡方針、公開先、ファイル役割が変わった場合だけ`README.md`を更新する
8. push後にGitHub Actionsのbuild / Pages deployを確認する

## 調査の品質基準

- TypeSafe公式、公式docs、公式evalを一次情報として優先する
- ベンダー自身の速度・精度主張と第三者実測を混ぜない
- latencyは地域、ネットワーク、入力条件、サンプル数を確認する
- accuracyと型の整合性を分ける
- 「hallucinateしない」は候補外生成の抑制と意味的正答を分けて書く
- Jevだけの固有能力と断定する前に、LLMのlogit/logprobs、rule、utility AI、専用model等で同等処理が可能か比較する
- early accessの仕様、価格、rate limit、model version、SLA等は日付付きで扱う

## リアルタイム / ゲーム用途を扱うときの注意

このrepositoryでは、リアルタイム・ゲーム用途を主要な評価軸の1つとして扱います。

最低限、次を分けて記録します。

- TypeSafe公式のReal-time applicationsの位置づけ
- 公式DOOMの10 queries/s
- 入力が画面画像ではなくstructured game stateであること
- 日本・アジアからの実効latency
- Mario、五目並べ、Snake等の第三者実装
- 60/120Hzのengine loopと、低頻度の意味判断層の違い
- LLM logit方式や従来game AIとの比較

「DOOMが10Hzで動いた」ことから「日本から常時10Hzで使える」「ゲームAI全体を置き換えられる」とは書きません。

## slide / script / articleの同期

`slides.md`の既存stable `key`は、意味を保つ編集では変更しません。

新しいslideを追加したら、`presentation-script.md`にも同じkeyのentryを追加します。

`article.md`はslideの1対1書き起こしではありません。ただし、主要な事実、数値、留保、結論は`slides.md` / `research.md`と矛盾させません。

同じ事実が複数ファイルに存在する場合、片方だけ更新して不整合を残さないこと。

## 外部成果物を勝手に作らない

このrepositoryの標準成果物はMarkdown正本とmisereru buildによるHTMLです。

ユーザーが明示していない限り、次を作りません。

- PPTX
- Google Slides
- 別Markdown一式
- `/mnt/data`だけに存在する完成資料
- 別repository
- 別ホスティング先

「スライドを更新」は`slides.md`を更新する意味として扱います。PowerPointを新規生成する意味に読み替えません。

## publish設定

このrepositoryではGitHub Pages公開が有効です。テンプレートの既定値がOFFであっても、**このrepositoryの現在の`misereru.config.json`を優先**します。

設定を確認せず、公開しない前提へ戻したり、別のデプロイ先を提案・設定したりしません。

## 関連Skill

作業時は必要に応じて次を読むこと。

- `.agents/skills/misereru-slide-writing/SKILL.md`
- `.agents/skills/misereru-presentation-script/SKILL.md`
- `.agents/skills/misereru-article-writing/SKILL.md`

この`AGENTS.md`はrepository運用、Skillは各成果物の書き方・レビュー規則を担います。

## 作業後の確認

最低限、次を確認します。

- 変更対象がこのrepositoryの正本になっているか
- research / slides / script / article間に矛盾がないか
- stable keyが壊れていないか
- buildが成功したか
- GitHub Pages deployが成功したか
- 公開URLが従来のURLのまま更新されているか

## 最重要ルール

**Jev資料について作業するとき、既存の`myokoym/misereru-slide-jev`を確認せず別資料を新規生成しないこと。**

最初にrepositoryを開き、正本と現在のpublish設定を確認してから作業します。