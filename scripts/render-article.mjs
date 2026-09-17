import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { marked } from 'marked';

const root = resolve(import.meta.dirname, '..');
const configPath = resolve(root, process.env.MISERERU_CONFIG ?? 'misereru.config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const pagesEnabled = featureEnabled(config.publish?.githubPages);
const articlePublishingEnabled = featureEnabled(config.publish?.githubPages?.article);

if (!articlePublishingEnabled) {
  process.exit(0);
}
if (!pagesEnabled) {
  throw new Error('publish.githubPages.article.enabled requires GitHub Pages publishing to be enabled');
}

const articlePath = resolve(root, 'article.md');
const htmlOutputPath = config.outputs?.html?.path ?? 'dist/site/index.html';
const siteDir = resolve(root, dirname(htmlOutputPath));
const publishedArticlePath = resolve(siteDir, 'article.html');
const planPath = resolve(root, 'dist/build-plan.json');

let articleMarkdown;
try {
  articleMarkdown = await readFile(articlePath, 'utf8');
} catch (error) {
  if (error?.code === 'ENOENT') {
    throw new Error('Publishing article.html requires article.md to exist');
  }
  throw error;
}

const articleTokens = marked.lexer(articleMarkdown, { gfm: true });
const h1Tokens = articleTokens.filter((token) => token.type === 'heading' && token.depth === 1);
if (h1Tokens.length !== 1) {
  throw new Error(`article.md must contain exactly one H1 title; found ${h1Tokens.length}`);
}

marked.use({
  walkTokens(token) {
    if (token.type === 'html') {
      throw new Error('article.md must be text/Markdown only; raw HTML is not allowed');
    }
    if ((token.type === 'link' || token.type === 'image') && !safeHref(token.href)) {
      throw new Error(`article.md contains an unsafe URL scheme: ${token.href}`);
    }
  },
});

const articleTitle = h1Tokens[0].text.trim();
const articleBody = await marked.parse(articleMarkdown, {
  gfm: true,
  breaks: false,
});
const slideDocument = htmlOutputPath.split('/').pop() || 'index.html';
const scriptPublished = featureEnabled(config.publish?.githubPages?.presentationScript);

const html = renderArticleHtml({
  articleTitle,
  articleBody,
  slideDocument,
  scriptPublished,
});

await mkdir(siteDir, { recursive: true });
await writeFile(publishedArticlePath, html, 'utf8');

const buildPlan = JSON.parse(await readFile(planPath, 'utf8'));
buildPlan.publish ??= {};
buildPlan.publish.githubPages ??= {};
buildPlan.publish.githubPages.article = {
  status: 'enabled',
  publicPath: 'article.html',
  format: 'html',
  source: 'article.md',
};
await writeFile(planPath, `${JSON.stringify(buildPlan, null, 2)}\n`, 'utf8');

console.log(`Wrote ${publishedArticlePath}`);

function renderArticleHtml({ articleTitle, articleBody, slideDocument, scriptPublished }) {
  const scriptLink = scriptPublished
    ? '<a href="./presentation-script.html">発表原稿</a>'
    : '';

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(articleTitle)}</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: "Noto Sans CJK JP", "Noto Sans JP", system-ui, sans-serif;
      line-height: 1.9;
    }
    body {
      margin: 0;
      background: Canvas;
      color: CanvasText;
    }
    main {
      max-width: 780px;
      margin: 0 auto;
      padding: 28px 20px 96px;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 40px;
      font-size: 0.95rem;
    }
    a { color: LinkText; }
    article {
      font-size: 1.05rem;
      overflow-wrap: break-word;
    }
    h1 {
      margin: 0 0 32px;
      font-size: clamp(2rem, 6vw, 3.2rem);
      line-height: 1.28;
      letter-spacing: -0.02em;
    }
    h2 {
      margin: 3em 0 0.8em;
      padding-top: 0.3em;
      font-size: 1.65rem;
      line-height: 1.4;
    }
    h3 {
      margin: 2.2em 0 0.7em;
      font-size: 1.25rem;
      line-height: 1.5;
    }
    p, ul, ol, blockquote, table, pre {
      margin: 0 0 1.4em;
    }
    ul, ol { padding-left: 1.6em; }
    li + li { margin-top: 0.35em; }
    blockquote {
      margin-left: 0;
      padding: 0.2em 0 0.2em 1.2em;
      border-left: 4px solid color-mix(in srgb, CanvasText 25%, transparent);
      opacity: 0.88;
    }
    code {
      padding: 0.1em 0.35em;
      border-radius: 4px;
      background: color-mix(in srgb, CanvasText 9%, transparent);
      font-family: "Noto Sans Mono CJK JP", "Noto Sans Mono", monospace;
      font-size: 0.92em;
    }
    pre {
      overflow-x: auto;
      padding: 16px;
      border-radius: 8px;
      background: color-mix(in srgb, CanvasText 7%, transparent);
    }
    pre code { padding: 0; background: transparent; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95em;
    }
    th, td {
      padding: 0.65em 0.75em;
      border-bottom: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
      text-align: left;
      vertical-align: top;
    }
    hr {
      margin: 3em 0;
      border: 0;
      border-top: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    }
    @media (max-width: 600px) {
      main { padding-inline: 18px; }
      article { font-size: 1rem; }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <main>
    <nav aria-label="関連資料">
      <a href="./${escapeHtml(slideDocument)}">スライド</a>
      ${scriptLink}
    </nav>
    <article>
${articleBody}
    </article>
  </main>
</body>
</html>
`;
}

function safeHref(value) {
  const href = String(value ?? '').trim();
  return !/^(?:javascript|data|vbscript):/i.test(href);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function featureEnabled(value) {
  return value === true || value?.enabled === true;
}
