import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Run against an already running dev or preview server: npm run test:e2e -- <url>
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
await mkdir('.impeccable/review', { recursive: true });
const ready = async () => {
  await page.getByRole('button', { name: 'Paste text', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.paste-button')?.disabled);
};
const settled = async () => {
  await page.waitForFunction(() => !document.querySelector('.view-switch button')?.disabled);
};
const position = () => page.locator('[aria-current="location"]').getAttribute('data-word');
const saved = () => page.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.textContent === 'Saved on this device');
const importText = async (text, title) => {
  await page.getByRole('button', { name: 'Paste text', exact: true }).click();
  await page.getByLabel('Title (optional)').fill(title);
  await page.getByLabel('Your text', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Start reading', exact: true }).last().click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
};

try {
  const baseUrl = process.argv[2] || 'http://127.0.0.1:5173';
  const homeUrl = new URL('/', baseUrl).href;
  const readerUrl = new URL('/reader', baseUrl).href;
  // Both pages must render on the server, including a direct reader request.
  for (const [url, content] of [[homeUrl, 'A little space.'], [readerUrl, 'The pleasure of paying attention']]) {
    const response = await context.request.get(url);
    assert.equal(response.status(), 200);
    assert.ok((await response.text()).includes(content));
  }
  const missing = await context.request.get(new URL('/missing-page', baseUrl).href);
  assert.equal(missing.status(), 404);

  await page.goto(homeUrl);
  // The server-rendered link works before hydration; wait for the client entry
  // before asserting that this particular click uses client-side routing.
  await page.waitForLoadState('networkidle');
  await page.getByRole('heading', { name: 'A little space. One word at a time.' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Try it', exact: true }).getAttribute('href'), '/reader');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '.impeccable/review/landing-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.impeccable/review/landing-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 568 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { window.stillNavigationMarker = true; });
  await page.getByRole('link', { name: 'Try it', exact: true }).click();
  await ready();
  assert.equal(page.url(), readerUrl);
  await page.waitForFunction(() => document.title === 'Reader — Still');
  assert.equal(await page.title(), 'Reader — Still');
  assert.equal(await page.evaluate(() => window.stillNavigationMarker), true, 'Navigation should stay client-side');
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('article p').count(), 9);
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true });

  // A pause action during the animated handoff must cancel its pending autoplay.
  await page.evaluate(() => {
    document.querySelector('.play-button').click();
    document.querySelector('.about-button').click();
  });
  await settled();
  await page.waitForTimeout(500);
  assert.equal(await page.getByRole('dialog').count(), 1);
  assert.equal(await page.locator('.play-button').getAttribute('aria-label'), 'Start reading');
  assert.equal(await page.getByTestId('focus-word').textContent(), 'There');
  await page.getByRole('button', { name: 'Close about dialog' }).click();
  await page.getByRole('button', { name: 'Article', exact: true }).click();
  await settled();
  await page.evaluate(() => {
    document.querySelector('.play-button').click();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await settled();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.play-button').getAttribute('aria-label'), 'Start reading');
  assert.equal(await page.getByTestId('focus-word').textContent(), 'There');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.getByRole('button', { name: 'Article', exact: true }).click();
  await settled();

  await page.locator('[data-word="4"]').click();
  assert.equal(await position(), '4');
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await settled();
  assert.equal(await page.getByTestId('focus-word').textContent(), 'bookshop');
  assert.equal(await page.getByRole('button', { name: 'Start reading', exact: true }).count(), 1);
  await page.screenshot({ path: '.impeccable/review/desktop-focus.png' });

  // The highlighted character, not the whole word, must stay on the central guide.
  for (let i = 0; i < 8; i++) {
    const delta = await page.evaluate(() => {
      const letter = document.querySelector('.focus-word .anchor-letter').getBoundingClientRect();
      const stage = document.querySelector('.focus-stage').getBoundingClientRect();
      return Math.abs(letter.left + letter.width / 2 - (stage.left + stage.width / 2));
    });
    assert.ok(delta < 1, `Anchor moved ${delta}px`);
    await page.getByRole('button', { name: 'Next word', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Start reading', exact: true }).click();
  await page.waitForTimeout(750);
  await page.getByRole('button', { name: 'Pause reading', exact: true }).click();
  const pausedWord = await page.getByTestId('focus-word').textContent();
  await page.waitForTimeout(500);
  assert.equal(await page.getByTestId('focus-word').textContent(), pausedWord);

  await page.getByRole('button', { name: 'Article', exact: true }).click();
  await settled();
  const pausedPosition = await position();
  await page.waitForTimeout(500);
  assert.equal(await position(), pausedPosition);
  await saved();
  await page.reload();
  await ready();
  assert.equal(await position(), pausedPosition);

  await page.getByRole('button', { name: 'Paste text', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start reading', exact: true }).click();
  assert.match(await page.getByRole('alert').textContent(), /Add a few words/);
  await page.getByLabel('Title (optional)').fill('Discarded draft');
  await page.getByRole('button', { name: 'Close paste dialog' }).click();
  await page.waitForFunction(() => document.activeElement?.matches('.play-button'));
  await page.getByRole('button', { name: 'Paste text', exact: true }).click();
  assert.equal(await page.getByLabel('Title (optional)').inputValue(), '');
  assert.equal(await page.getByRole('alert').count(), 0);
  await page.getByLabel('Your text', { exact: true }).fill('Discarded text');
  await page.getByRole('button', { name: 'Close paste dialog' }).click();
  await page.getByRole('button', { name: 'Paste text', exact: true }).click();
  assert.equal(await page.getByLabel('Your text', { exact: true }).inputValue(), '');
  await page.getByRole('button', { name: 'Close paste dialog' }).click();

  const text = 'First sentence ends here. A second sentence is here.\n\nThe final paragraph has a few words.';
  await importText(text, 'My reading');
  assert.equal(await page.locator('h1').textContent(), 'My reading');
  await page.locator('[data-word="7"]').click();
  await page.getByRole('button', { name: 'Replay sentence', exact: true }).click();
  assert.equal(await position(), '4');
  await page.getByRole('slider').fill('400');
  await saved();
  await page.reload();
  await ready();
  assert.equal(await page.locator('h1').textContent(), 'My reading');
  assert.equal(await page.getByRole('slider').inputValue(), '400');
  assert.equal(await position(), '4');

  // Leaving the reader and using browser history must retain the saved reading.
  await saved();
  await page.getByRole('link', { name: 'Still home', exact: true }).click();
  await page.getByRole('link', { name: 'Try it', exact: true }).waitFor();
  assert.equal(page.url(), homeUrl);
  await page.waitForFunction(() => document.title === 'Still — Make room for reading');
  assert.equal(await page.title(), 'Still — Make room for reading');
  await page.goBack();
  await ready();
  assert.equal(await page.locator('h1').textContent(), 'My reading');
  assert.equal(await page.getByRole('slider').inputValue(), '400');
  assert.equal(await position(), '4');
  await page.goForward();
  await page.getByRole('link', { name: 'Try it', exact: true }).click();
  await ready();
  assert.equal(await position(), '4');

  await page.locator('article').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await position(), '5');
  await page.keyboard.press('Space');
  await settled();
  await page.getByRole('button', { name: 'Pause reading' }).waitFor();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.getByRole('button', { name: 'Start reading', exact: true }).waitFor();
  await page.evaluate(() => { delete document.hidden; });
  await page.getByRole('button', { name: 'Article', exact: true }).click();
  await settled();

  await importText('One last word.', 'A short reading');
  await page.getByRole('slider').fill('700');
  await page.getByRole('button', { name: 'Start reading', exact: true }).click();
  await page.getByRole('button', { name: 'Read again', exact: true }).waitFor();
  assert.equal(await page.getByTestId('focus-word').textContent(), 'word.');
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '100');
  await page.getByRole('button', { name: 'Read again', exact: true }).click();
  await page.getByRole('button', { name: 'Pause reading', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Pause reading', exact: true }).click();

  await page.getByRole('button', { name: 'Paste text', exact: true }).click();
  await page.getByRole('button', { name: 'Use sample instead' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await settled();
  await page.screenshot({ path: '.impeccable/review/mobile-focus.png' });
  const visible = await page.evaluate(() => {
    const word = document.querySelector('.focus-word').getBoundingClientRect();
    const dock = document.querySelector('.reader-dock').getBoundingClientRect();
    return word.top > 0 && word.bottom < dock.top;
  });
  assert.ok(visible, 'Focus word is obscured by controls on mobile');
  await page.setViewportSize({ width: 320, height: 568 });
  assert.ok(await page.evaluate(() => {
    const word = document.querySelector('.focus-word').getBoundingClientRect();
    const back = document.querySelector('.context-button').getBoundingClientRect();
    const dock = document.querySelector('.reader-dock').getBoundingClientRect();
    return word.top > 0 && word.bottom < dock.top && back.bottom < dock.top;
  }), 'Focus word or return control is obscured on a short phone viewport');
  await page.screenshot({ path: '.impeccable/review/small-phone-focus.png' });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Article', exact: true }).click();
  await settled();
  assert.equal(await page.locator('.flying-word').count(), 0);
  await page.getByRole('button', { name: 'About this reader' }).click();
  assert.equal(await page.getByRole('dialog').count(), 1);
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('PASS: server rendering, landing/reader navigation, browser history, direct reader reloads, selection, shared position, fixed anchor, playback/pause, replay, persistence, input validation, keyboard controls, background pause, completion, mobile layout, reduced motion, and dialog accessibility.');
} finally {
  await browser.close();
}
