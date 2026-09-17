import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const configPath = resolve(root, process.env.MISERERU_CONFIG ?? 'misereru.config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const requireCompleteScript = process.argv.includes('--require-complete-script');

if (config.source?.format !== 'markdown') {
  throw new Error(`Initial template workflow supports source.format=markdown only; got ${config.source?.format ?? 'unset'}`);
}

const sourcePath = resolve(root, config.source?.path ?? 'slides.md');
const scriptPath = resolve(root, 'presentation-script.md');
const outputs = config.outputs ?? {};
const pagesEnabled = featureEnabled(config.publish?.githubPages);
const sourceMarkdown = await readFile(sourcePath, 'utf8');
const parsedSource = parseSlideSource(sourceMarkdown);
const finalSlideKeys = getFinalSlideKeys(parsedSource);
const presentationScript = await validatePresentationScript({
  scriptPath,
  finalSlideKeys,
  requireComplete: requireCompleteScript,
});

const buildPlan = {
  version: 6,
  source: config.source,
  renderer: 'marp',
  navigation: {
    toc: 'generated-after-title',
    tocScope: 'section-slides-only',
    sourceIdentity: 'stable-key',
    targetIdentity: 'generated-slide-number'
  },
  presentationScript,
  outputs: {},
  publish: {
    githubPages: {
      status: pagesEnabled ? 'enabled' : 'disabled',
      source: 'html'
    }
  }
};

if (outputs.html?.enabled !== true) {
  throw new Error('HTML is the required default output for the initial template workflow');
}

const unsupportedOutputs = Object.keys(outputs).filter((name) => !['html', 'pdf'].includes(name));
if (unsupportedOutputs.length > 0) {
  throw new Error(
    `Unsupported outputs in the initial template workflow: ${unsupportedOutputs.join(', ')}. ` +
    'Only html and pdf are exposed until a same-design renderer strategy is validated.'
  );
}

const marpSourcePath = await createMarpInput(sourcePath, sourceMarkdown, parsedSource);
try {
  await renderMarp(marpSourcePath, resolve(root, outputs.html.path ?? 'dist/site/index.html'), []);
  buildPlan.outputs.html = {
    status: 'generated',
    path: outputs.html.path ?? 'dist/site/index.html'
  };

  if (outputs.pdf?.enabled === true) {
    const pdfPath = outputs.pdf.path ?? 'dist/slides.pdf';
    await renderMarp(marpSourcePath, resolve(root, pdfPath), ['--pdf']);
    buildPlan.outputs.pdf = { status: 'generated', path: pdfPath };
  } else {
    buildPlan.outputs.pdf = { status: 'disabled' };
  }
} finally {
  await rm(marpSourcePath, { force: true });
}

const planPath = resolve(root, 'dist/build-plan.json');
await mkdir(dirname(planPath), { recursive: true });
await writeFile(planPath, `${JSON.stringify(buildPlan, null, 2)}\n`, 'utf8');
console.log(`Wrote ${planPath}`);

async function createMarpInput(source, original, parsed) {
  const generatedPath = resolve(dirname(source), `.misereru-${basename(source)}.marp.md`);
  const withToc = injectGeneratedToc(original, parsed);
  const frontmatter = [
    '---',
    'marp: true',
    'theme: misereru-ja',
    'paginate: true',
    '---',
    ''
  ].join('\n');
  await writeFile(generatedPath, `${frontmatter}${withToc}`, 'utf8');
  return generatedPath;
}

function parseSlideSource(markdown) {
  const slides = markdown
    .split(/^---\s*$/m)
    .map((slide) => slide.trim())
    .filter(Boolean);

  if (slides.length === 0) {
    throw new Error('slides.md does not contain any slides');
  }

  const metadata = slides.map((slide, index) => readSlideMetadata(slide, index));
  const keys = new Set();
  for (const slide of metadata) {
    if (slide.key === '__misereru_toc__') {
      throw new Error('Slide key __misereru_toc__ is reserved for the generated table of contents');
    }
    if (keys.has(slide.key)) {
      throw new Error(`Duplicate slide key: ${slide.key}`);
    }
    keys.add(slide.key);
  }

  return { slides, metadata };
}

function getFinalSlideKeys(parsed) {
  const keys = parsed.metadata.map((slide) => slide.key);
  const hasGeneratedToc = parsed.slides.length >= 2 && parsed.metadata.some((slide) => slide.type === 'section');
  if (!hasGeneratedToc) return keys;
  return [keys[0], '__misereru_toc__', ...keys.slice(1)];
}

function injectGeneratedToc(markdown, parsed) {
  if (parsed.slides.length < 2) return markdown;

  const tocItems = parsed.metadata.flatMap((slide, originalIndex) => {
    if (slide.type !== 'section') return [];
    if (!slide.title) {
      throw new Error(`Section slide ${originalIndex + 1} (${slide.key}) is missing an H1 title required for the generated TOC`);
    }

    const generatedSlideNumber = originalIndex + 2;
    return [`- [${escapeMarkdownLinkLabel(slide.title)}](#${generatedSlideNumber})`];
  });

  if (tocItems.length === 0) return markdown;

  const tocSlide = [
    '<!-- {"key":"__misereru_toc__"} -->',
    '# 目次',
    '',
    ...tocItems,
  ].join('\n');

  return [parsed.slides[0], tocSlide, ...parsed.slides.slice(1)].join('\n\n---\n\n');
}

function readSlideMetadata(slide, index) {
  const metadataMatch = slide.match(/<!--\s*(\{[^\n]*\})\s*-->/);
  if (!metadataMatch) {
    throw new Error(`Slide ${index + 1} is missing metadata such as <!-- {"key":"overview"} -->`);
  }

  let metadata;
  try {
    metadata = JSON.parse(metadataMatch[1]);
  } catch {
    throw new Error(`Slide ${index + 1} has invalid JSON metadata`);
  }

  if (typeof metadata.key !== 'string' || metadata.key.length === 0) {
    throw new Error(`Slide ${index + 1} is missing a stable key`);
  }

  const titleMatch = slide.match(/^#\s+(.+?)\s*$/m);
  return {
    key: metadata.key,
    type: metadata.type ?? 'content',
    title: titleMatch?.[1] ?? null,
  };
}

async function validatePresentationScript({ scriptPath, finalSlideKeys, requireComplete }) {
  let markdown;
  try {
    markdown = await readFile(scriptPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT' && !requireComplete) {
      return {
        status: 'not-present',
        validation: 'optional',
        path: 'presentation-script.md'
      };
    }
    if (error?.code === 'ENOENT') {
      throw new Error('Complete presentation-script validation requires presentation-script.md');
    }
    throw error;
  }

  const parsed = parsePresentationScript(markdown);
  const knownSlideKeys = new Set(finalSlideKeys);
  const scriptSlideKeys = new Set();

  for (const entry of parsed.entries) {
    if (scriptSlideKeys.has(entry.slide)) {
      throw new Error(`Duplicate presentation script entry for slide: ${entry.slide}`);
    }
    if (!knownSlideKeys.has(entry.slide)) {
      throw new Error(`Presentation script references unknown slide key: ${entry.slide}`);
    }
    if (!entry.narration) {
      throw new Error(`Presentation script entry ${entry.slide} has an empty Narration section`);
    }
    scriptSlideKeys.add(entry.slide);
  }

  const missing = finalSlideKeys.filter((key) => !scriptSlideKeys.has(key));
  if (requireComplete && missing.length > 0) {
    throw new Error(`Complete presentation-script validation is missing entries for: ${missing.join(', ')}`);
  }

  return {
    status: requireComplete ? 'complete' : 'validated',
    validation: requireComplete ? 'complete' : 'optional',
    path: 'presentation-script.md',
    entries: parsed.entries.length,
    slides: finalSlideKeys.length,
    coveredSlides: scriptSlideKeys.size,
    complete: missing.length === 0
  };
}

function parsePresentationScript(markdown) {
  const chunks = markdown.split(/^---\s*$/m);
  const entries = [];
  let formatVersion = null;

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const metadata = readJsonComments(chunk, `presentation-script.md block ${chunkIndex + 1}`);
    for (const item of metadata) {
      if (item.misereru === 'presentation-script') {
        if (formatVersion !== null) {
          throw new Error('presentation-script.md contains duplicate format metadata');
        }
        formatVersion = item.version ?? null;
        if (formatVersion !== 1) {
          throw new Error(`Unsupported presentation script version: ${String(formatVersion)}`);
        }
      }
    }

    const slideMetadata = metadata.filter((item) => Object.hasOwn(item, 'slide'));
    if (slideMetadata.length === 0) continue;
    if (slideMetadata.length > 1) {
      throw new Error(`presentation-script.md block ${chunkIndex + 1} contains multiple slide entries`);
    }

    const slide = slideMetadata[0].slide;
    if (typeof slide !== 'string' || slide.length === 0) {
      throw new Error(`presentation-script.md block ${chunkIndex + 1} has an invalid slide reference`);
    }

    const narrationHeading = /^###\s+Narration\s*$/m.exec(chunk);
    if (!narrationHeading) {
      throw new Error(`Presentation script entry ${slide} is missing a Narration section`);
    }

    const narrationStart = narrationHeading.index + narrationHeading[0].length;
    const narrationTail = chunk.slice(narrationStart);
    const nextSection = narrationTail.search(/^###\s+/m);
    const narration = (nextSection === -1 ? narrationTail : narrationTail.slice(0, nextSection)).trim();
    entries.push({ slide, narration });
  }

  return { entries, formatVersion };
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

function escapeMarkdownLinkLabel(value) {
  return value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

async function renderMarp(source, output, extraArgs) {
  await mkdir(dirname(output), { recursive: true });
  await run('npx', [
    '--no-install',
    'marp',
    source,
    '--config',
    resolve(root, 'marp.config.mjs'),
    '--output',
    output,
    ...extraArgs,
  ]);
}

function featureEnabled(value) {
  return value === true || value?.enabled === true;
}

async function run(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${command} exited with code ${code}`));
    });
  });
}
