import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(await readFile(resolve(root, 'misereru.config.json'), 'utf8'));
const htmlPath = resolve(root, config.outputs?.html?.path ?? 'dist/site/index.html');

if (!existsSync(htmlPath)) {
  throw new Error(`Rendered HTML not found: ${htmlPath}`);
}

const executablePath = findBrowserExecutable();
if (!executablePath) {
  throw new Error('No Chrome/Chromium executable found. Set BROWSER_PATH to enable rendered overflow verification.');
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });

  const report = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('.marpit section')];
    const tolerance = 1;

    return sections.map((section, index) => {
      const overflowY = Math.max(0, section.scrollHeight - section.clientHeight);
      const overflowX = Math.max(0, section.scrollWidth - section.clientWidth);
      const heading = section.querySelector('h1, h2, h3')?.textContent?.trim() ?? '(no heading)';

      const directChildren = [...section.children]
        .filter((el) => !['STYLE', 'SCRIPT'].includes(el.tagName))
        .map((el) => {
          const style = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
            bottom: el.offsetTop + el.offsetHeight + Number.parseFloat(style.marginBottom || '0'),
            right: el.offsetLeft + el.offsetWidth + Number.parseFloat(style.marginRight || '0'),
          };
        });

      const maxBottom = directChildren.reduce((max, item) => Math.max(max, item.bottom), 0);
      const maxRight = directChildren.reduce((max, item) => Math.max(max, item.right), 0);
      const style = getComputedStyle(section);
      const safeBottom = section.clientHeight - Number.parseFloat(style.paddingBottom || '0');
      const safeRight = section.clientWidth - Number.parseFloat(style.paddingRight || '0');
      const contentOverflowY = Math.max(0, maxBottom - safeBottom);
      const contentOverflowX = Math.max(0, maxRight - safeRight);

      const overflow = Math.max(overflowY, contentOverflowY) > tolerance || Math.max(overflowX, contentOverflowX) > tolerance;

      return {
        slide: index + 1,
        heading,
        overflow,
        overflowY: Math.ceil(Math.max(overflowY, contentOverflowY)),
        overflowX: Math.ceil(Math.max(overflowX, contentOverflowX)),
        lastItems: directChildren.slice(-3),
      };
    });
  });

  const layoutDir = resolve(root, 'dist/layout-check');
  await mkdir(layoutDir, { recursive: true });
  const sectionHandles = await page.$('.marpit section');
  for (let index = 0; index < sectionHandles.length; index += 1) {
    await sectionHandles[index].screenshot({
      path: join(layoutDir, `slide-${String(index + 1).padStart(2, '0')}.png`),
    });
  }
  await writeFile(join(layoutDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const failures = report.filter((slide) => slide.overflow);
  if (failures.length > 0) {
    console.error('Rendered slide overflow detected:');
    for (const slide of failures) {
      console.error(
        `- slide ${slide.slide}: ${slide.heading} (vertical +${slide.overflowY}px, horizontal +${slide.overflowX}px)`
      );
      for (const item of slide.lastItems) {
        console.error(`    ${item.tag}: ${item.text}`);
      }
    }
    throw new Error(`Rendered overflow check failed for ${failures.length} slide(s)`);
  }

  console.log(`Rendered overflow check passed for ${report.length} slides.`);
} finally {
  await browser.close();
}

function findBrowserExecutable() {
  const explicit = process.env.BROWSER_PATH;
  if (explicit && existsSync(explicit)) return explicit;

  const fixedCandidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      ]
    : [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/microsoft-edge',
      ];

  for (const candidate of fixedCandidates) {
    if (existsSync(candidate)) return candidate;
  }

  const commands = process.platform === 'win32'
    ? [['where.exe', ['chrome']], ['where.exe', ['msedge']]]
    : [
        ['which', ['google-chrome']],
        ['which', ['google-chrome-stable']],
        ['which', ['chromium']],
        ['which', ['chromium-browser']],
      ];

  for (const [command, args] of commands) {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    const candidate = result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : '';
    if (candidate && existsSync(candidate)) return candidate;
  }

  return null;
}
