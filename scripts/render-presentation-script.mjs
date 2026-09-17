import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const configPath = resolve(root, process.env.MISERERU_CONFIG ?? 'misereru.config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const pagesEnabled = featureEnabled(config.publish?.githubPages);
const scriptPublishingEnabled = featureEnabled(config.publish?.githubPages?.presentationScript);

if (!scriptPublishingEnabled) {
  process.exit(0);
}
if (!pagesEnabled) {
  throw new Error('publish.githubPages.presentationScript.enabled requires GitHub Pages publishing to be enabled');
}

const sourcePath = resolve(root, config.source?.path ?? 'slides.md');
const scriptPath = resolve(root, 'presentation-script.md');
const htmlOutputPath = config.outputs?.html?.path ?? 'dist/site/index.html';
const siteDir = resolve(root, dirname(htmlOutputPath));
const rawPublishedScriptPath = resolve(siteDir, 'presentation-script.md');
const htmlPublishedScriptPath = resolve(siteDir, 'presentation-script.html');
const planPath = resolve(root, 'dist/build-plan.json');

const [slidesMarkdown, scriptMarkdown, planText] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  readFile(scriptPath, 'utf8'),
  readFile(planPath, 'utf8'),
]);

const slides = parseSlides(slidesMarkdown);
const finalSlideKeys = getFinalSlideKeys(slides);
const scriptEntries = parsePresentationScript(scriptMarkdown);
const entriesBySlide = new Map(scriptEntries.map((entry) => [entry.slide, entry]));
const orderedEntries = finalSlideKeys.flatMap((key, index) => {
  const entry = entriesBySlide.get(key);
  return entry ? [{ ...entry, slideNumber: index + 1 }] : [];
});

const presentationTitle = slides.metadata[0]?.title ?? 'Presentation';
const slideDocument = basename(htmlOutputPath);
const rendered = renderHtml({
  presentationTitle,
  slideDocument,
  orderedEntries,
});

await mkdir(siteDir, { recursive: true });
await writeFile(htmlPublishedScriptPath, rendered, 'utf8');
await rm(rawPublishedScriptPath, { force: true });

const buildPlan = JSON.parse(planText);
buildPlan.publish ??= {};
buildPlan.publish.githubPages ??= {};
buildPlan.publish.githubPages.presentationScript = {
  status: 'enabled',
  publicPath: 'presentation-script.html',
  format: 'html',
};
await writeFile(planPath, `${JSON.stringify(buildPlan, null, 2)}\n`, 'utf8');

console.log(`Wrote ${htmlPublishedScriptPath}`);

function parseSlides(markdown) {
  const chunks = markdown
    .split(/^---\s*$/m)
    .map((slide) => slide.trim())
    .filter(Boolean);

  const metadata = chunks.map((slide, index) => {
    const metadataMatch = slide.match(/<!--\s*(\{[^\n]*\})\s*-->/);
    if (!metadataMatch) {
      throw new Error(`Slide ${index + 1} is missing metadata`);
    }

    let item;
    try {
      item = JSON.parse(metadataMatch[1]);
    } catch {
      throw new Error(`Slide ${index + 1} has invalid JSON metadata`);
    }

    if (typeof item.key !== 'string' || item.key.length === 0) {
      throw new Error(`Slide ${index + 1} is missing a stable key`);
    }

    const titleMatch = slide.match(/^#\s+(.+?)\s*$/m);
    return {
      key: item.key,
      type: item.type ?? 'content',
      title: titleMatch?.[1] ?? null,
    };
  });

  return { chunks, metadata };
}

function getFinalSlideKeys(parsed) {
  const keys = parsed.metadata.map((slide) => slide.key);
  const hasGeneratedToc =
    parsed.chunks.length >= 2 &&
    parsed.metadata.some((slide) => slide.type === 'section');

  return hasGeneratedToc
    ? [keys[0], '__misereru_toc__', ...keys.slice(1)]
    : keys;
}

function parsePresentationScript(markdown) {
  const chunks = markdown.split(/^---\s*$/m);
  const entries = [];

  for (const [index, chunk] of chunks.entries()) {
    const metadata = readJsonComments(chunk, `presentation-script.md block ${index + 1}`);
    const slideMetadata = metadata.filter((item) => Object.hasOwn(item, 'slide'));

    if (slideMetadata.length === 0) continue;
    if (slideMetadata.length > 1) {
      throw new Error(`presentation-script.md block ${index + 1} contains multiple slide entries`);
    }

    const slide = slideMetadata[0].slide;
    if (typeof slide !== 'string' || slide.length === 0) {
      throw new Error(`presentation-script.md block ${index + 1} has an invalid slide reference`);
    }

    const titleMatch = /^##\s+(.+?)\s*$/m.exec(chunk);
    const narrationHeading = /^###\s+Narration\s*$/m.exec(chunk);
    if (!narrationHeading) {
      throw new Error(`Presentation script entry ${slide} is missing a Narration section`);
    }

    const narrationStart = narrationHeading.index + narrationHeading[0].length;
    const narrationTail = chunk.slice(narrationStart);
    const nextSection = narrationTail.search(/^###\s+/m);
    const narration = (nextSection === -1
      ? narrationTail
      : narrationTail.slice(0, nextSection)
    ).trim();

    entries.push({
      slide,
      title: titleMatch?.[1]?.trim() || slide,
      narration,
    });
  }

  return entries;
}

function renderHtml({ presentationTitle, slideDocument, orderedEntries }) {
  const toc = orderedEntries
    .map(
      (entry) =>
        `<li><a href="#script-${entry.slideNumber}">Slide ${entry.slideNumber}: ${escapeHtml(entry.title)}</a></li>`
    )
    .join('\n');

  const sections = orderedEntries
    .map(
      (entry) => `
<section class="script-entry" id="script-${entry.slideNumber}">
  <div class="entry-meta">
    <span>Slide ${entry.slideNumber}</span>
    <a href="./${escapeHtml(slideDocument)}#${entry.slideNumber}">スライドを見る</a>
  </div>
  <h2>${escapeHtml(entry.title)}</h2>
  <div class="narration">
    ${renderNarration(entry.narration)}
  </div>
</section>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(presentationTitle)} — 発表原稿</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: "Noto Sans CJK JP", "Noto Sans JP", system-ui, sans-serif;
      line-height: 1.8;
    }
    body {
      margin: 0;
      background: Canvas;
      color: CanvasText;
    }
    main {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 20px 80px;
    }
    header {
      margin-bottom: 40px;
    }
    h1 {
      margin: 12px 0 8px;
      font-size: clamp(2rem, 5vw, 3rem);
      line-height: 1.25;
    }
    .back-link,
    .entry-meta a,
    .toc a {
      color: LinkText;
    }
    .toc {
      margin: 32px 0 48px;
      padding: 24px;
      border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
      border-radius: 12px;
    }
    .toc h2 {
      margin-top: 0;
    }
    .toc ol {
      margin-bottom: 0;
      padding-left: 1.5em;
    }
    .script-entry {
      padding: 32px 0;
      border-top: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
      scroll-margin-top: 16px;
    }
    .entry-meta {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 8px;
      font-size: 0.9rem;
      opacity: 0.78;
    }
    .script-entry h2 {
      margin: 0 0 16px;
      font-size: 1.5rem;
      line-height: 1.4;
    }
    .narration p,
    .narration ul,
    .narration ol {
      margin: 0 0 1em;
    }
    .narration code {
      padding: 0.1em 0.35em;
      border-radius: 4px;
      background: color-mix(in srgb, CanvasText 9%, transparent);
      font-family: "Noto Sans Mono CJK JP", "Noto Sans Mono", monospace;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <a class="back-link" href="./${escapeHtml(slideDocument)}">← スライドへ戻る</a>
      <h1>${escapeHtml(presentationTitle)} — 発表原稿</h1>
      <p>各項目は実際のスライド順に並んでいます。</p>
    </header>
    <nav class="toc" aria-label="発表原稿の目次">
      <h2>目次</h2>
      <ol>${toc}</ol>
    </nav>
    ${sections}
  </main>
</body>
</html>
`;
}

function renderNarration(value) {
  const blocks = value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines
          .map((line) => `<li>${renderInline(line.replace(/^[-*]\s+/, ''))}</li>`)
          .join('')}</ul>`;
      }

      if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
        return `<ol>${lines
          .map((line) => `<li>${renderInline(line.replace(/^\d+\.\s+/, ''))}</li>`)
          .join('')}</ol>`;
      }

      return `<p>${lines.map(renderInline).join('<br>')}</p>`;
    })
    .join('\n');
}

function renderInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function readJsonComments(value, context) {
  const comments = [];
  const pattern = /<!--\s*(\{[^\n]*\})\s*-->/g;

  for (const match of value.matchAll(pattern)) {
    try {
      comments.push(JSON.parse(match[1]));
    } catch {
      throw new Error(`${context} contains invalid JSON metadata`);
    }
  }

  return comments;
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
