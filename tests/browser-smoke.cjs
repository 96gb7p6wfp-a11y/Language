/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS permits the installed Playwright runtime to be loaded without changing application dependencies. */
/* Real-browser integration QA. Requires a running preview and initialized local D1.
 * Run: node tests/browser-smoke.cjs
 * Override PHRASE_QA_URL, PHRASE_PLAYWRIGHT, or PHRASE_CHROMIUM for another machine.
 * This adds uniquely named QA records to the local preview database; it never clears it.
 */
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { chromium } = require(process.env.PHRASE_PLAYWRIGHT || '/opt/codex/runtimes/cua/lib/node_modules/playwright');

const baseURL = process.env.PHRASE_QA_URL || 'http://127.0.0.1:5173';
const output = resolve(__dirname, '../outputs');
const runId = Date.now().toString(36);
const failures = [];
const layout = [];
const passed = [];
let browser;

async function api(path, body) {
  const response = await fetch(baseURL + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await response.json();
  assert.equal(response.status, 200, `${path}: ${JSON.stringify(data)}`);
  return data;
}
async function checkpoint(name, work) {
  try { await work(); passed.push(name); console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); throw error; }
}
async function nav(page, name) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click();
}
async function language(page, name) { await page.locator('.language-control').getByRole('button', { name, exact: true }).click(); }
async function practice(page, name) {
  await nav(page, 'Practice');
  await page.locator('.practice-grid button').filter({ hasText: name }).click();
}
async function synced(page) {
  await page.waitForFunction(() => {
    const cache = JSON.parse(localStorage.getItem('phrase-coach-v1') || 'null');
    return cache && Array.isArray(cache.pending) && cache.pending.length === 0;
  }, null, { timeout: 20000 });
}
async function noOverflow(page, label) {
  const measurement = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  layout.push({ label, ...measurement });
  assert.ok(Math.max(measurement.scroll, measurement.body) <= measurement.width + 1, `${label}: horizontal overflow ${JSON.stringify(measurement)}`);
}
async function touchTargets(page, label) {
  const small = await page.evaluate(() => [...document.querySelectorAll('button, select, summary')].flatMap(element => {
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height || box.bottom < 0 || box.top > window.innerHeight || element.closest('[hidden]')) return [];
    return box.height < 43 || box.width < 39 ? [{ text: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 65), width: Math.round(box.width), height: Math.round(box.height) }] : [];
  }));
  layout.push({ label: `${label} touch targets`, small });
}
async function draft(page, german, value) {
  await practice(page, 'Write');
  const field = page.locator('#fluency-writing-draft');
  await field.fill(value);
  await synced(page);
}
async function clearOwnInput(page) {
  if (await page.locator('#own-input-text').inputValue()) {
    await page.getByText('Use my own input', { exact: true }).click();
    await page.locator('#own-input-text').fill('');
    await page.getByText('Use my own input', { exact: true }).click();
  }
}

(async () => {
  mkdirSync(output, { recursive: true });
  // Exercise legacy API before new settings/chunks to check data stays intact.
  for (let i = 0; i < 3; i++) await api('/api/practice', { id: randomUUID(), exerciseId: 'en-C1-g0', answer: 'qa wrong answer' });
  await api('/api/practice', { id: randomUUID(), exerciseId: 'de-C2-g0', answer: 'qa wrong answer' });
  const original = await api('/api/progress');
  const initialCoach = (await api('/api/coach')).state;
  const operations = [
    { kind: 'preferences', language: 'en', patch: { currentLevel: 'C1', targetLevel: 'C2', dailyMinutes: 60, goal: 'near-native' } },
    { kind: 'preferences', language: 'de', patch: { currentLevel: 'C2', targetLevel: 'C2', dailyMinutes: 20, goal: 'natural' } },
    { kind: 'theme', theme: 'system' },
  ].map((operation, index) => ({ ...operation, id: randomUUID(), createdAt: Date.now() + index }));
  await api('/api/coach', { operations });

  browser = await chromium.launch({ executablePath: process.env.PHRASE_CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start today', exact: true }).waitFor();

  await checkpoint('four tabs, C1 plan and time budgets on iPhone', async () => {
    assert.deepEqual(await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button').allTextContents(), ['Today', 'Practice', 'Progress', 'Settings']);
    assert.match(await page.locator('.level-pill').innerText(), /C1/);
    for (const minutes of [20, 45, 60, 90]) {
      await page.locator('.time-selector button').filter({ hasText: String(minutes) }).click();
      const rows = page.locator('.daily-plan .activity-row');
      const count = await rows.count();
      assert.ok(count >= 2 && count <= 4, `${minutes} min has ${count} activities`);
      const sum = (await rows.locator('.activity-label > span').allTextContents()).reduce((total, text) => total + Number(text.match(/(\d+) min/)[1]), 0);
      assert.equal(sum, minutes, `${minutes} minute budget`);
    }
    await page.locator('.time-selector button').filter({ hasText: '60' }).click();
    await synced(page);
    await noOverflow(page, 'iPhone 390 Today');
    await touchTargets(page, 'iPhone Today');
    const startBounds = await page.locator('.start-today').boundingBox();
    const navBounds = await page.locator('.bottom-nav').boundingBox();
    assert.ok(startBounds.y + startBounds.height <= navBounds.y, 'Start today is fully visible above navigation');
    await page.screenshot({ path: resolve(output, 'today-mobile.png'), fullPage: true });
  });
  await checkpoint('language-specific settings and legacy history survive switching and reload', async () => {
    await language(page, 'Deutsch');
    assert.match(await page.locator('.level-pill').innerText(), /C2/);
    assert.equal((await page.locator('.daily-budget strong').innerText()).trim(), '20');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.language-control').getByRole('button', { name: 'Deutsch' }).getAttribute('aria-pressed'), 'true');
    await nav(page, 'Progress');
    assert.equal(await page.locator('.level-large').innerText(), 'C2');
    await language(page, 'English');
    assert.equal(await page.locator('.level-large').innerText(), 'C1');
    const current = await api('/api/progress');
    assert.deepEqual(current.records['en-C1-g0'], original.records['en-C1-g0']);
    assert.deepEqual(current.records['de-C2-g0'], original.records['de-C2-g0']);
    assert.equal(current.settings.en, 'C1'); assert.equal(current.settings.de, 'C2');
  });
  const expression = `put this QA example into perspective ${runId}`;
  await checkpoint('save a chunk, reveal it, rate recall and persist spaced review', async () => {
    await practice(page, 'Chunks');
    await page.getByRole('button', { name: 'Add expression', exact: true }).click();
    await page.getByLabel('Expression', { exact: true }).fill(expression);
    await page.getByLabel('Meaning', { exact: true }).fill('Consider the wider context.');
    await page.getByLabel(/Example/).fill('It helped me put this example into perspective.');
    await page.getByRole('button', { name: 'Save expression', exact: true }).click();
    await page.getByRole('button', { name: 'Review due expressions', exact: true }).click();
    let loops = 0;
    while (!(await page.getByRole('heading', { name: 'Review complete', exact: true }).isVisible())) {
      assert.ok(loops++ < 150, 'bounded review queue');
      await page.getByRole('button', { name: 'Reveal expression', exact: true }).click();
      await page.getByRole('button', { name: 'Easy', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Finish review', exact: true }).click();
    await synced(page);
    const chunk = (await api('/api/coach')).state.chunks.find(item => item.expression === expression);
    assert.equal(chunk.language, 'en'); assert.equal(chunk.mastery, 2); assert.ok(chunk.dueAt > Date.now() + 86400000);
    await page.reload({ waitUntil: 'networkidle' });
    await practice(page, 'Chunks');
    await page.getByRole('button', { name: 'All saved', exact: true }).click();
    await page.getByRole('button').filter({ hasText: expression }).waitFor();
    await language(page, 'Deutsch');
    await practice(page, 'Chunks');
    await page.getByRole('button', { name: 'All saved', exact: true }).click();
    assert.equal(await page.getByText(expression, { exact: true }).count(), 0);
    await language(page, 'English');
  });
  await checkpoint('quick/deep reading, expression capture, real input stages and shadowing', async () => {
    await practice(page, 'Read');
    await clearOwnInput(page);
    assert.equal(await page.getByRole('button', { name: 'Quick read', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.deep-reading-notes').count(), 0);
    await page.getByRole('button', { name: 'Deep read', exact: true }).click();
    await page.getByRole('heading', { name: 'Look closer', exact: true }).waitFor();
    await page.locator('.session-details').filter({ hasText: 'Useful expressions' }).getByRole('button', { name: /^Save / }).first().click();
    await noOverflow(page, 'iPhone 390 Deep reading');
    await page.getByRole('button', { name: 'Finish session', exact: true }).click();
    await practice(page, 'Listen');
    await clearOwnInput(page);
    assert.equal(await page.locator('.reading-text').count(), 0);
    await page.getByRole('button', { name: 'Show transcript', exact: true }).click();
    await page.locator('.reading-text').waitFor();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.locator('.missed-expressions input').first().check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.locator('.expression-row button').first().click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Repeat now', exact: true }).click();
    await page.getByRole('button', { name: 'Again with rhythm', exact: true }).click();
    await page.getByRole('button', { name: 'Next sentence', exact: true }).click();
    await page.getByRole('button', { name: 'Finish session', exact: true }).click();
  });
  await checkpoint('own target-language input persists independently and replaces curated expressions', async () => {
    const englishInput = `For all its merits, the proposal deserves closer scrutiny. We need to put the evidence into perspective. QA ${runId}`;
    const germanInput = `Bei näherer Betrachtung wird deutlich, dass mehrere Interessen abzuwägen sind. QA ${runId}`;
    await practice(page, 'Read');
    await page.getByText('Use my own input', { exact: true }).click();
    await page.locator('#own-input-text').fill(englishInput);
    assert.equal(await page.locator('.reading-text').innerText(), englishInput);
    assert.equal(await page.getByText('Useful expressions', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Deep read', exact: true }).click();
    await page.getByText(/Find one useful phrase, one sentence pattern/).waitFor();
    await synced(page);
    await language(page, 'Deutsch');
    await practice(page, 'Read');
    await page.getByText('Eigenes Material verwenden', { exact: true }).click();
    await page.locator('#own-input-text').fill(germanInput);
    assert.equal(await page.locator('.reading-text').innerText(), germanInput);
    await synced(page);
    await language(page, 'English');
    await practice(page, 'Read');
    assert.equal(await page.locator('.reading-text').innerText(), englishInput);
    await page.reload({ waitUntil: 'networkidle' });
    await practice(page, 'Read');
    assert.equal(await page.locator('.reading-text').innerText(), englishInput);
    await language(page, 'Deutsch');
    await practice(page, 'Read');
    assert.equal(await page.locator('.reading-text').innerText(), germanInput);
    await language(page, 'English');
    await practice(page, 'Listen');
    await page.getByText('Use my own input', { exact: true }).click();
    await page.locator('#own-input-text').fill(englishInput);
    await page.getByText('Use my own input', { exact: true }).click();
    assert.equal(await page.locator('.reading-text').count(), 0, 'transcript hidden on first listen');
    await page.getByRole('button', { name: 'Show transcript', exact: true }).click();
    assert.equal(await page.locator('.reading-text').innerText(), englishInput);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    assert.equal(await page.locator('.missed-expressions').count(), 0, 'curated expressions do not accompany custom input');
    await page.getByText('Save another expression', { exact: true }).click();
    await page.locator('#session-expression').fill(`for all its merits ${runId}`);
    await page.locator('#session-expression-meaning').fill('Acknowledge strengths before a reservation.');
    await page.locator('#session-expression-example').fill('For all its merits, the proposal needs work.');
    await page.getByRole('button', { name: 'Save to Chunks', exact: true }).click();
    await page.getByRole('button', { name: 'Finish session', exact: true }).click();
    await synced(page);
    assert.ok((await api('/api/coach')).state.chunks.some(item => item.expression === `for all its merits ${runId}` && item.language === 'en'));
  });
  const englishDraft = `This argument considers the wider context. QA ${runId}`;
  const germanDraft = `Diese Argumentation berücksichtigt den weiteren Zusammenhang. QA ${runId}`;
  await checkpoint('English/German writing drafts survive switching and reload', async () => {
    await draft(page, false, englishDraft);
    await page.getByText('See a short correction example', { exact: true }).click();
    await page.getByText('Incorrect', { exact: true }).waitFor();
    await page.getByText('Correct but unnatural', { exact: true }).waitFor();
    await page.getByText('Why?', { exact: true }).click();
    await page.getByRole('button', { name: 'Finish session', exact: true }).click();
    await language(page, 'Deutsch');
    await draft(page, true, germanDraft);
    await language(page, 'English');
    await practice(page, 'Write');
    assert.equal(await page.locator('#fluency-writing-draft').inputValue(), englishDraft);
    await page.reload({ waitUntil: 'networkidle' });
    await practice(page, 'Write');
    assert.equal(await page.locator('#fluency-writing-draft').inputValue(), englishDraft);
    await language(page, 'Deutsch');
    await practice(page, 'Write');
    assert.equal(await page.locator('#fluency-writing-draft').inputValue(), germanDraft);
    await page.getByRole('button', { name: 'Übung abschließen', exact: true }).click();
    await language(page, 'English');
  });
  await checkpoint('speaking timers, pause, reflection and honest assessment disclosure', async () => {
    await practice(page, 'Speak');
    for (const duration of [1, 2, 5, 10]) {
      await page.getByRole('group', { name: 'Speaking timer length' }).getByRole('button', { name: `${duration} min`, exact: true }).click();
      assert.equal(await page.getByRole('timer', { name: 'Speaking time', exact: true }).innerText(), `${duration}:00`);
    }
    await page.getByRole('group', { name: 'Speaking timer length' }).getByRole('button', { name: '1 min', exact: true }).click();
    await page.getByRole('button', { name: 'Start speaking', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.timer-display').textContent !== '1:00');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const paused = await page.locator('.timer-display').innerText();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.timer-display').innerText(), paused);
    await page.getByRole('button', { name: 'Okay', exact: true }).click();
    await page.getByText('Record & listen back', { exact: true }).click();
    await page.getByText(/Your voice stays in this session and is not assessed/).waitFor();
    await page.getByRole('button', { name: 'Finish session', exact: true }).click();
    await synced(page);
    const state = (await api('/api/coach')).state;
    assert.ok(state.sessions.some(session => session.language === 'en' && session.skill === 'speak' && session.rating === 'okay'));
    assert.ok(state.sessions.filter(session => session.language === 'en').length > initialCoach.sessions.filter(session => session.language === 'en').length);
  });
  await checkpoint('grammar weak points use preserved errors and original drills save answers', async () => {
    await practice(page, 'Grammar');
    await page.getByRole('button', { name: 'My Weak Points', exact: true }).click();
    await page.getByRole('button', { name: 'Practise weak points', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Practise weak points', exact: true }).click();
    await page.locator('.answer-options button').first().click();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await page.getByText('Answer saved', { exact: true }).waitFor();
    await noOverflow(page, 'iPhone 390 grammar feedback');
  });
  const examDraft = `Legacy exam draft remains safe across navigation. QA ${runId}`;
  await checkpoint('exam is optional, IELTS/school tasks and legacy draft persistence work', async () => {
    await practice(page, 'Exam Mode');
    await page.getByRole('heading', { name: 'Exam Mode', exact: false }).waitFor();
    await page.getByRole('button', { name: 'School / Klausur', exact: true }).click();
    await page.locator('#exam-draft').waitFor();
    await page.locator('#exam-draft').fill(examDraft);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Draft saved', { exact: true }).waitFor();
    await nav(page, 'Today');
    await practice(page, 'Exam Mode');
    assert.equal(await page.locator('#exam-draft').inputValue(), examDraft);
    await page.reload({ waitUntil: 'networkidle' });
    await practice(page, 'Exam Mode');
    await page.getByRole('button', { name: 'School / Klausur', exact: true }).click();
    assert.equal(await page.locator('#exam-draft').inputValue(), examDraft);
    await page.getByRole('button', { name: 'IELTS', exact: true }).click();
    await page.getByRole('button', { name: 'Start timer', exact: true }).click();
    await page.getByRole('button', { name: 'Pause timer', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Pause timer', exact: true }).click();
    await language(page, 'Deutsch');
    await practice(page, 'Exam Mode');
    assert.equal(await page.getByRole('button', { name: 'IELTS', exact: true }).count(), 0);
    await noOverflow(page, 'iPhone 390 German exam');
    await language(page, 'English');
  });
  await checkpoint('A1 content/settings, 320px navigation, light/dark/system appearance', async () => {
    await nav(page, 'Settings');
    const english = page.locator('.settings-group').filter({ has: page.getByRole('heading', { name: 'English', exact: true }) });
    await english.getByLabel(/^Current level/).selectOption('A1');
    await synced(page);
    await practice(page, 'Read');
    assert.match(await page.locator('.session-header').innerText(), /A1/);
    assert.ok((await page.locator('.reading-text').innerText()).length > 20);
    await nav(page, 'Settings');
    await english.getByLabel(/^Current level/).selectOption('C1');
    await page.getByLabel(/^Appearance/).selectOption('dark');
    await nav(page, 'Today');
    await page.screenshot({ path: resolve(output, 'today-dark.png'), fullPage: true });
    const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await nav(page, 'Settings');
    await page.getByLabel(/^Appearance/).selectOption('light');
    await page.emulateMedia({ colorScheme: 'dark' });
    const forcedLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.notEqual(forcedLight, darkBackground, 'explicit light overrides dark OS');
    await page.getByLabel(/^Appearance/).selectOption('system');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), darkBackground, 'system follows dark OS');
    await page.emulateMedia({ colorScheme: 'light' });
    await synced(page);
    await page.setViewportSize({ width: 320, height: 700 });
    for (const name of ['Today', 'Practice', 'Progress', 'Settings']) { await nav(page, name); await noOverflow(page, `320px ${name}`); await touchTargets(page, `320px ${name}`); }
    await practice(page, 'Speak'); await noOverflow(page, '320px speaking'); await touchTargets(page, '320px speaking');
    await nav(page, 'Today');
    await page.setViewportSize({ width: 1366, height: 900 });
    await noOverflow(page, 'desktop Today');
    await page.screenshot({ path: resolve(output, 'today-desktop.png'), fullPage: true });
  });
  await checkpoint('fresh browser restores synchronized language plans, chunks and drafts', async () => {
    const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    const other = await fresh.newPage();
    await other.goto(baseURL, { waitUntil: 'networkidle' });
    await other.getByRole('button', { name: 'Start today', exact: true }).waitFor();
    assert.match(await other.locator('.level-pill').innerText(), /C1/);
    await practice(other, 'Write');
    assert.equal(await other.locator('#fluency-writing-draft').inputValue(), englishDraft);
    await language(other, 'Deutsch');
    await practice(other, 'Write');
    assert.equal(await other.locator('#fluency-writing-draft').inputValue(), germanDraft);
    const server = (await api('/api/coach')).state;
    assert.ok(server.chunks.some(chunk => chunk.expression === expression));
    await fresh.close();
  });
  assert.deepEqual(consoleErrors, [], 'no browser runtime or console errors');
  passed.push('no browser runtime or console errors');
  writeFileSync(resolve(output, 'browser-qa.json'), JSON.stringify({ passed, failures, layout, consoleErrors }, null, 2));
  await browser.close();
  console.log(`Completed ${passed.length} checks. Screenshots and layout measurements: ${output}`);
})().catch(async error => {
  writeFileSync(resolve(output, 'browser-qa.json'), JSON.stringify({ passed, failures, layout, fatal: error.stack }, null, 2));
  if (browser) await browser.close();
  process.exitCode = 1;
});
