---
name: misereru-article-writing
description: Create and maintain optional article.md as a standalone text-first article alongside slides.md and presentation-script.md in misereru repositories. Use when producing a readable blog-style document that must make sense without viewing the slides.
---

# misereru article writing

`article.md` を使う場合に、スライドや発表原稿とは別に、文章だけで内容が完結する読み物を作成・再構成・推敲するためのSkillです。

`article.md` は **任意** です。スライドだけ、またはスライドと発表原稿だけで資料を運用する状態を正常として扱います。

## 1. articleの役割

`article.md` はブログ記事・解説記事・共有用テキストのように、単体で読んで理解できる文書です。

次の前提を置きません。

- 読者がスライドを同時に見ていること
- 発表者の口頭補足があること
- ページ番号やstable keyを知っていること

したがって、「このスライド」「次の表」「画面右側」のような画面依存表現を記事本文へ持ち込みません。

## 2. slides / scriptとの違い

### slides.md

- 視覚的に見せるための正本
- 1 slide 1 primary messageを基本とする
- 表、図、箇条書き等を使える

### presentation-script.md

- スライドを見ながら話すための原稿
- stable keyでslideと対応する
- 表や図の見方を口頭で補える

### article.md

- 文章だけで意味が完結する
- slideとの1対1対応を要求しない
- 説明順、章立て、接続を記事として再構成してよい
- スライドを見ない読者にも前提、理由、留保が伝わる状態にする

発表原稿から記事を機械的に展開しません。用途が違うため、articleとして文章構造を作り直します。

## 3. 内容の整合性

記事の章立てや説明順は独立させてよい一方、事実関係は資料全体と整合させます。

- `slides.md` と主要結論を矛盾させない
- `research.md` 等の根拠sourceがある場合、数値・日付・条件・留保を一致させる
- articleだけに未確認の固有名詞、数値、性能主張、結論を追加しない
- スライド側の重要な条件を、読みやすさのために削除しない
- 解釈、提案、仮説は事実と区別する

矛盾が見つかった場合は記事だけを合わせず、どのsourceが正しいか確認してから修正します。

## 4. 文章構成

原則として次を優先します。

- H1は記事タイトル1つだけ
- H2で主要な章を分ける
- 必要な場合だけH3を使う
- 背景 → 論点 → 根拠 → 留保 → まとめの関係が自然につながるようにする
- 箇条書きは並列情報や条件整理に使い、文章を短くするだけの目的で多用しない
- 表は同じ比較軸で複数対象を比べる場合に使う
- 段落は1つの中心内容に絞る
- 同じ結論の言い換えを繰り返さない

Reference modeのスライドを記事化する場合も、スライド順をそのまま見出し順へ変換するのではなく、読み物として自然な順序へ組み替えます。

## 5. テキストで完結させる

記事は画像やスライドがなくても理解できる状態を保ちます。

画像や外部リンクを補助として使うことはできますが、それがないと主要内容が理解できない構成にしません。

raw HTMLは使いません。`article.md` はMarkdownだけで記述します。公開buildではraw HTMLを検出した場合にerrorになります。

## 6. 公開設定との分離

`article.md` の作成・更新と公開は別操作です。

GitHub Pagesで記事を公開する場合だけ、`misereru.config.json` で明示的に有効化します。

```json
{
  "publish": {
    "githubPages": {
      "enabled": true,
      "article": {
        "enabled": true
      }
    }
  }
}
```

公開時は正本Markdownをそのまま配布せず、読みやすいHTMLへ変換してPagesルートの `article.html` として公開します。

規則:

- `article.md` を作成・編集しただけでは公開設定を変更しない
- GitHub Pages自体が有効でも記事公開を自動的に有効とみなさない
- ユーザーが記事公開を明示的に求めた場合だけ `article.enabled` を変更する
- `article.enabled: true` なのに `article.md` が存在しない場合はbuild error
- article公開のためにslides / presentation scriptの公開設定を勝手に変えない

## 7. cross review

記事を扱う場合、少なくとも次を確認します。

### slides / research → article

- 主要論点が抜けていないか
- 数値、条件、留保、出典関係が変わっていないか
- スライドを見ないと意味が通らない表現が残っていないか
- 記事として前提説明が不足していないか

### article → slides / research

- articleだけに重要な新規主張を追加していないか
- articleの説明順から、スライド側の構成上の欠落が見つからないか
- articleで説明しないと成立しない主要論点がスライドから完全に欠けていないか

記事の読みやすさの問題と、資料自体の情報不足を区別します。

## 8. 完了条件

- 記事単体で内容が理解できる
- H1が1つだけ存在する
- raw HTMLを使っていない
- スライド参照前提の表現が残っていない
- 主要な事実・数値・条件・留保が他sourceと矛盾しない
- 文章の章立てと接続が読み物として自然である
- 公開設定を内容編集のついでに勝手に変更していない
