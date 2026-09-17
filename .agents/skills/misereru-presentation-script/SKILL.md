---
name: misereru-presentation-script
description: Create and maintain optional presentation-script.md narration alongside slides.md in misereru repositories. Use when adding or revising spoken narration, cross-checking slide and narration structure, or checking that a complete slide/script pair is consistent.
---

# misereru presentation script

`presentation-script.md` を使う場合に、`slides.md` と対応する発表原稿を生成・再構成・推敲し、両者を相互レビューするためのSkillです。

`presentation-script.md` は **任意** です。`slides.md` だけで資料を作る運用を標準で許容し、原稿ファイルが存在しないことを欠陥として扱いません。

このSkillの中心は動画生成ではなく、次の2つです。

- 人間が口頭で説明するときに使える自然な発表原稿を持つこと
- slideと原稿を両方向から確認し、構成矛盾・欠落・順序不整合を検出すること

## 適用状態

次の3状態を正当な状態として扱います。

```text
slides-only
  slides.md

partial script
  slides.md
  presentation-script.md   # 一部slideだけでもよい

complete script
  slides.md
  presentation-script.md   # 全slide分が揃っている
```

ユーザーが原稿を求めていない場合、`presentation-script.md` を勝手に作成・必須化しません。

## 公開設定との分離

発表原稿を作成・更新することと、その原稿を公開することは別の操作です。

GitHub Pagesで原稿を公開する場合は、`misereru.config.json` の次の設定を明示的に使います。

```json
{
  "publish": {
    "githubPages": {
      "enabled": true,
      "presentationScript": {
        "enabled": true
      }
    }
  }
}
```

規則:

- `presentation-script.md` を作成・編集しただけでは公開設定を変更しない
- GitHub Pages自体が有効でも、原稿公開を自動的に有効とみなさない
- ユーザーが原稿の公開を明示的に求めた場合だけ `presentationScript.enabled` を変更する
- 公開が有効な場合、Pagesルートの `presentation-script.md` として公開される
- partial script / complete scriptの区別と公開可否を混同しない
- publish/output設定の変更を、原稿内容の編集へ付随する変更として勝手に行わない

## 1. sourceとidentity

対応付けにページ番号を使わず、`slides.md` のstable `key`を使います。

`slides.md`:

```md
<!-- {"key":"body"} -->
# 通常の本文ページ
```

`presentation-script.md`:

```md
<!-- {"slide":"body"} -->
## 通常の本文ページ

### Narration

ここでは通常の本文ページを例にします。……
```

規則:

- slideを並べ替えてもkeyを変えない
- 意味を保った修正でもkeyを変えない
- script entryを残す場合は参照先keyが存在する状態を保つ
- keyを変更する場合は対応するscript entryも更新する
- slideを追加しただけではscript entry追加を必須にしない
- slideを削除した場合、対応script entryが残っていれば削除する

## 2. v1 format

ファイル先頭にはformat metadataを置けます。

```md
<!-- {"misereru":"presentation-script","version":1} -->
```

各entryは `---` で区切ります。

```md
<!-- {"slide":"stable-key"} -->
## slide title

### Narration

自然な口頭説明を書く。
```

entryの必須要素:

- `slide`: 対応するstable key
- `### Narration`: 実際に話す本文

`##` 見出しは人間が追いやすくするための表示です。identityは見出しではなく `slide` metadataです。

原稿を置かないslideには空entryを作らず、entry自体を省略します。

## 3. narrationを書く

### slide本文を逐語読み上げしない

原稿は、画面を見れば分かる文字列をそのまま読み上げるためのものではありません。

- 箇条書きなら項目同士の関係や背景を説明する
- 表なら比較軸や読み取るべき差を説明する
- コードやURLは文字列として読まず、何を示しているか説明する
- 図なら「どこを見るか」と「何が分かるか」を言葉で補う

### 原稿だけに重要情報を追加しない

原稿だけに新しい数値、条件、固有名詞、結論、出典依存の主張を追加しません。

口頭説明に必要な言い換え、接続、例示は可能ですが、資料の根拠から導けない内容を原稿だけで補いません。

### 話し言葉として自然にする

- 文を短めに区切る
- 画面上の列挙を全部読み上げない
- `次に`、`ここでは` 等の接続を実際のslide順と一致させる
- 過剰な前置きや同じ結論の反復を避ける
- slideの見出しを毎回そのまま復唱しない

## 4. 資料モードとの関係

### Presented mode

- slideに載せない補足説明をnarrationで補える
- ただし主要メッセージ自体はslideから把握できる状態を保つ

### Reference mode

- 本来slide単体に必要な情報を原稿へ逃がさない
- narrationは閲覧資料を口頭で説明する場合の補助として扱う

### Mixed mode

- slideは単体でも主要内容を把握できる
- narrationでは関係・背景・読み方を補う

## 5. deterministic consistency check

### 通常build

`presentation-script.md` が存在しない場合は検査をスキップし、warningも出しません。

存在する場合は、書かれているentryだけを構造検査します。

- `slides.md` のstable keyに重複がない
- scriptの`slide`参照に重複がない
- scriptが存在しないslide keyを参照していない
- 各entryに空でない `### Narration` がある
- format versionが明示されている場合、対応可能なversionである

通常buildでは次をエラーにしません。

- scriptが一部のslideにしか存在しない
- generated TOCのscript entryがない
- script entryの記載順がslide順と異なる

presentation sequenceは `slides.md` 側を正とします。

### complete script check

資料として「全slide分の原稿が揃っている」状態を確認したい場合だけ、complete checkを使います。

```bash
npm run build:script-complete
```

この場合は通常の構造検査に加え、build後の最終presentationに含まれる全slideへscript entryがあることを要求します。自動生成される `__misereru_toc__` も、存在する場合はcoverage対象です。

completeであることは通常資料の必須条件ではありません。

## 6. semantic cross review

`presentation-script.md` が存在する場合、機械的なkey一致だけでなく両方向から内容を確認します。partial scriptなら、entryが存在するslideだけを対象にしてかまいません。

### slides → script

- slideの主要メッセージをnarrationが別の意味へ変えていないか
- 重要な条件・留保・比較を落としていないか
- 図表・コードの説明が画面内容と合っているか
- 前後slideへの接続が実際の順序と一致するか
- slide本文の単純な読み上げになっていないか

### script → slides

- 原稿だけに重要な主張や前提を追加していないか
- 原稿の論理順で説明するとslide順が不自然にならないか
- 原稿に必要なのにslide側から完全に読み取れない主要論点がないか
- `この3点`、`次の図` 等の参照が画面上の内容と一致するか
- Reference modeで、本来slideに必要な内容を原稿へ逃がしていないか

矛盾を見つけた場合、原稿だけをslideへ合わせて終了しません。問題がslide構成にあるなら、`misereru-slide-writing` の規則に従ってslide側も修正候補へ戻します。

## 7. 更新手順

### slidesだけを扱う場合

```text
slides.mdを編集
  ↓
slide-writingの自己レビュー
  ↓
通常build
```

原稿が存在しないことを理由に `presentation-script.md` を新規作成しません。

### 原稿も扱う場合

```text
slides.md / presentation-script.mdを編集
  ↓
既存script entryの参照先を確認
  ↓
通常buildの構造検査
  ↓
slides → script semantic review
  ↓
script → slides semantic review
  ↓
必要ならslide / scriptを再修正
```

## 8. 完了条件

原稿を扱う作業では、対象entryについて少なくとも次を満たします。

- stable key対応に構造的不整合がない
- narrationが自然な口頭説明として成立する
- slideとnarrationの主張に矛盾がない
- 原稿だけの重要情報が残っていない
- slide本文の逐語読み上げだけになっていない

全slide coverageは、complete scriptを明示的に求める場合だけ完了条件へ追加します。

## 9. 将来の派生利用

stable keyでslideと原稿が対応していれば、将来、音声合成・録画・発表動画・字幕生成等の入力へ流用できます。ただし、これらは現時点の主要目的ではありません。

- timing
- pronunciation
- pause
- highlight / pointer / reveal等のcue
- SSML / WebVTT / video renderer固有記法

これらを通常の発表原稿sourceへ先回りして必須化しません。必要になった時点でadapterまたは追加仕様として検討します。

## 参照

misereru内の調査:

- `docs/research/presentation-script.md`（develop branch）

外部仕様・実装:

- Marpit presenter notes: <https://github.com/marp-team/marpit/blob/main/docs/directives.md>
- Marp CLI: <https://github.com/marp-team/marp-cli>
- Slidev Syntax Guide 日本語: <https://ja.sli.dev/guide/syntax>
- reveal.js Speaker View: <https://revealjs.com/speaker-view/>
- Microsoft PowerPoint「プレゼンテーションを記録する」: <https://support.microsoft.com/ja-jp/powerpoint/record-your-presentation>
- W3C SSML 1.1: <https://www.w3.org/TR/speech-synthesis11/>
- W3C WebVTT: <https://www.w3.org/TR/webvtt1/>
