/* eslint-disable @typescript-eslint/no-require-imports -- This executable browser harness uses the environment's installed Playwright. */
/* Mission integration QA. This script only permits loopback previews.
 * node tests/mission-browser.cjs
 * PHRASE_QA_URL defaults to http://127.0.0.1:5173.
 * PHRASE_PLAYWRIGHT and PHRASE_CHROMIUM may select installed local tools.
 * Model conversations below are explicit Playwright fixtures, not production code.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');

function playwright() {
  const candidates = [process.env.PHRASE_PLAYWRIGHT, 'playwright', '/opt/codex/cua_node/lib/node_modules/playwright', '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'].filter(Boolean);
  for (const candidate of candidates) { try { return require(candidate); } catch {} }
  throw new Error('Install Playwright locally or set PHRASE_PLAYWRIGHT to an installed runtime. This script does not install a browser.');
}
function readPublicCatalog() {
  const filename = path.resolve(__dirname, '../lib/missions.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = new Module(filename, module); loaded.paths = module.paths; loaded._compile(compiled, filename); return loaded.exports;
}
const baseURL = process.env.PHRASE_QA_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname), 'This mutable QA harness is restricted to a local preview.');
const output = path.resolve(__dirname, '../outputs');
const runTag = Date.now().toString(36);
const results = { realDatabase: [], fixtureUI: [], layout: [], runtimeErrors: [], failures: [], liveOpenAI: false };
let browser;

async function checkpoint(group, name, run) {
  try { await run(); results[group].push(name); console.log(`PASS ${name}`); }
  catch (error) { results.failures.push({ group, name, error: error.message }); throw error; }
}
async function nav(page, name) { await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click(); }
async function language(page, name) { await page.locator('.mission-language').getByRole('button', { name, exact: true }).click(); }
async function noOverflow(page, label) {
  const result = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  results.layout.push({ label, ...result }); assert.ok(Math.max(result.scroll, result.body) <= result.width + 1, `${label} overflows: ${JSON.stringify(result)}`);
}
async function touchTargets(page, label) {
  const tooSmall = await page.evaluate(() => [...document.querySelectorAll('button,select,summary,a')].flatMap(element => {
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height || box.bottom < 0 || box.top > innerHeight || element.closest('[hidden]')) return [];
    if (getComputedStyle(element).display === 'none') return [];
    return box.height < 43 || box.width < 38 ? [{ label: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 60), width: box.width, height: box.height }] : [];
  }));
  results.layout.push({ label: `${label} targets`, tooSmall }); assert.deepEqual(tooSmall, [], `${label} controls smaller than touch target`);
}
async function api(context, route, body, status = 200) {
  const response = body ? await context.request.post(`${baseURL}${route}`, { data: body }) : await context.request.get(`${baseURL}${route}`);
  const data = await response.json(); assert.equal(response.status(), status, `${route}: ${JSON.stringify(data)}`); return data;
}
async function signIn(page) {
  await page.goto(`${baseURL}/signin-with-chatgpt?return_to=%2F`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.mission-language'));
}
function preference() { return { likedTopics: ['technology', 'entrepreneurship'], dislikedTopics: ['society'], rejectedTemplateIds: [] }; }
function fixtureFeedback(language, answer, attempt, round) {
  const german = language === 'de';
  return {
    strengths: [german ? 'Deine Position ist klar.' : 'You stated a clear position.'],
    improvements: [{ dimension: 'precision', original: answer.split(' ').slice(0, 5).join(' '), improved: german ? 'Ein konkreter Vorteil wäre mehr Verlässlichkeit.' : 'One concrete benefit would be greater reliability.', why: german ? 'Benenne einen überprüfbaren Vorteil.' : 'Name one benefit that can be tested.' }],
    phrases: german ? [{ expression: 'unter der Voraussetzung, dass', meaning: 'eine Bedingung nennen', example: 'Ich stimme zu, unter der Voraussetzung, dass wir die Ergebnisse prüfen.' }, { expression: 'dagegen spricht allerdings', meaning: 'einen Einwand abwägen', example: 'Dagegen spricht allerdings der hohe Aufwand.' }] : [{ expression: 'provided that', meaning: 'on the condition that', example: 'I would support it provided that we review the evidence.' }, { expression: 'a more pressing concern', meaning: 'an issue that needs attention sooner', example: 'A more pressing concern is whether everyone can take part.' }],
    retryPrompt: german ? 'Begründe dieselbe Position mit einem konkreten Beispiel.' : 'Retry the same position with a concrete example.',
    outcome: { state: attempt === 2 ? 'partial' : 'in_progress', label: german ? 'Position nachvollziehbar' : 'Position understood', evidence: german ? 'Du hast eine Bedingung genannt; ein Gegenargument bleibt offen.' : 'You named a condition, while one objection remains open.' },
    adaptation: attempt === 2 ? 'harder' : 'scaffold',
    nextChallenge: german ? `Runde ${round + 1}: Was wäre ein guter Kompromiss?` : `Round ${round + 1}: What compromise would address the strongest objection?`,
  };
}
function fixtureSummary(run) {
  const german = run.language === 'de';
  return { didWell: [german ? 'Du hast deine Position begründet.' : 'You supported your position.'], weaknesses: [german ? 'Die Wortwahl kann präziser werden.' : 'Some word choices can be more precise.'], betterExpressions: run.turns.at(-1)?.feedback.phrases || [], retryImprovements: [german ? 'Im zweiten Versuch wurde eine Bedingung ausdrücklich genannt.' : 'The retry made a condition explicit.'] };
}
async function installMissionFixtures(page) {
  const catalog = readPublicCatalog();
  const store = { transcriptionCalls: 0, runs: [], preferences: { en: preference(), de: { likedTopics: ['volleyball'], dislikedTopics: ['business'], rejectedTemplateIds: [] } } };
  const service = { configured: true, model: 'gpt-4.1-mini', remainingToday: 30, dailyLimit: 30 };
  await page.route('**/api/missions/transcribe', route => { store.transcriptionCalls += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: 'I would support it provided that we review the evidence.', service }) }); });
  await page.route('**/api/missions', async route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...store, service }) });
    const input = request.postDataJSON();
    if (input.action === 'preferences') { store.preferences[input.language] = input.preferences; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ preferences: store.preferences, service }) }); }
    let run = store.runs.find(run => run.id === input.runId);
    if (input.action === 'start') {
      const template = catalog.missionTemplates.find(template => template.id === input.templateId);
      assert.ok(template, 'Start must use a real public mission ID');
      const brief = catalog.getMissionBrief(template, input.language, input.level, 2);
      run = { id: input.id, templateId: input.templateId, language: input.language, level: input.level, difficulty: 2, status: 'active', phase: 'challenge', round: 1, currentChallenge: brief.opening, opening: brief.opening, turns: [], createdAt: Date.now(), updatedAt: Date.now() };
      store.runs.unshift(run);
    } else {
      assert.ok(run, 'Fixture run must exist');
      if (input.action === 'respond') {
        const attempt = run.phase === 'feedback' ? 2 : 1;
        const feedback = fixtureFeedback(run.language, input.answer, attempt, run.round);
        run.turns.push({ id: input.requestId, round: run.round, attempt, answer: input.answer, inputMode: input.inputMode, characterReply: run.language === 'de' ? 'Du nennst eine Bedingung. Wie würde sie in diesem konkreten Fall funktionieren?' : 'You have named a condition. How would it work in this particular situation?', feedback, challenge: run.currentChallenge, createdAt: Date.now() });
        run.phase = attempt === 1 ? 'feedback' : 'retry'; run.outcome = feedback.outcome;
      } else if (input.action === 'continue' && run.round < 3) {
        run.currentChallenge = run.turns.at(-1).feedback.nextChallenge; run.round += 1; run.phase = 'challenge'; run.difficulty = Math.min(3, run.difficulty + 1);
      } else if (input.action === 'continue' || input.action === 'finish') {
        run.phase = 'summary'; run.status = 'complete'; run.completedAt = Date.now(); run.summary = fixtureSummary(run);
      }
      run.updatedAt = Date.now();
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ run, service }) });
  });
  return store;
}

// UI-specific assertions are below. Keeping fixtures local makes it impossible for
// production backend code to mistake this harness for an AI provider.
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const { chromium } = playwright();
  browser = await chromium.launch({ executablePath: process.env.PHRASE_CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, colorScheme: 'light' });
  const anonymous = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const anonymousPage = await anonymous.newPage();
  await checkpoint('realDatabase', 'anonymous AI routes require sign-in and the app offers the real sign-in path', async () => {
    const denied = await api(anonymous, '/api/missions', undefined, 401);
    assert.equal(denied.code, 'sign_in_required');
    assert.ok(denied.signinPath.startsWith('/signin-with-chatgpt'));
    await anonymousPage.goto(baseURL, { waitUntil: 'networkidle' });
    await anonymousPage.getByRole('link', { name: 'Sign in', exact: true }).waitFor();
  });
  await anonymous.close();
  const page = await context.newPage();
  page.on('pageerror', error => results.runtimeErrors.push(error.message));
  await signIn(page);

  await checkpoint('realDatabase', 'authenticated no-key service is honest and preserves old learner data', async () => {
    const service = await api(context, '/api/missions');
    assert.equal(service.service.configured, false, 'This no-key suite never makes live OpenAI calls.');
    assert.ok(!Object.keys(service.service).some(key => /secret|api.?key/i.test(key)), 'Service metadata exposes no credential field');
    const crossSite = await context.request.post(`${baseURL}/api/missions`, { headers: { Origin: 'https://another-site.invalid' }, data: { action: 'start', id: randomUUID(), templateId: 'invalid', language: 'en', level: 'C1' } });
    assert.equal(crossSite.status(), 403, 'Cross-site mutations must be rejected before provider usage');
    const originalProgress = await api(context, '/api/progress');
    const originalDrafts = await api(context, '/api/writing');
    const originalCoach = (await api(context, '/api/coach')).state;
    const catalog = readPublicCatalog();
    const input = { action: 'start', id: randomUUID(), templateId: catalog.missionTemplates[0].id, language: 'en', level: 'C1' };
    const started = await api(context, '/api/missions', input);
    const rejected = await api(context, '/api/missions', { action: 'respond', runId: started.run.id, requestId: randomUUID(), answer: 'I would support a limited trial provided that we review the evidence.', inputMode: 'text' }, 503);
    assert.equal(rejected.code, 'configuration_required');
    const after = await api(context, '/api/missions');
    assert.equal(after.runs.find(run => run.id === started.run.id).turns.length, 0, 'Missing AI key must never produce a simulated turn.');
    assert.deepEqual(await api(context, '/api/progress'), originalProgress);
    assert.deepEqual(await api(context, '/api/writing'), originalDrafts);
    assert.deepEqual((await api(context, '/api/coach')).state, originalCoach);
  });

  await checkpoint('realDatabase', 'English and German mission preferences survive reload independently', async () => {
    await api(context, '/api/missions', { action: 'preferences', language: 'en', preferences: preference() });
    await api(context, '/api/missions', { action: 'preferences', language: 'de', preferences: { likedTopics: ['volleyball'], dislikedTopics: ['business'], rejectedTemplateIds: [] } });
    const time = Date.now();
    await api(context, '/api/coach', { operations: [
      { id: randomUUID(), createdAt: time, kind: 'preferences', language: 'en', patch: { currentLevel: 'C1', targetLevel: 'C2' } },
      { id: randomUUID(), createdAt: time + 1, kind: 'preferences', language: 'de', patch: { currentLevel: 'C2', targetLevel: 'C2' } },
    ] });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('.mission-level')?.textContent.includes('C1'));
    await language(page, 'Deutsch');
    assert.match(await page.locator('.mission-level').innerText(), /C2/);
    await language(page, 'English');
    assert.match(await page.locator('.mission-level').innerText(), /C1/);
    const saved = await api(context, '/api/missions');
    assert.deepEqual(saved.preferences.en.likedTopics, ['technology', 'entrepreneurship']);
    assert.deepEqual(saved.preferences.de.likedTopics, ['volleyball']);
    assert.deepEqual(saved.preferences.en.dislikedTopics, ['society']);
    assert.deepEqual(saved.preferences.de.dislikedTopics, ['business']);
  });

  await checkpoint('realDatabase', 'Today has one recommendation, two alternatives and four main tabs', async () => {
    await nav(page, 'Today');
    assert.deepEqual(await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button').allTextContents(), ['Today', 'Challenges', 'Progress', 'Settings']);
    assert.equal(await page.locator('.mission-featured').count(), 1);
    assert.equal(await page.locator('.mission-alternative').count(), 2);
    await noOverflow(page, 'Today 390'); await touchTargets(page, 'Today 390');
    await page.screenshot({ path: path.join(output, 'missions-today-mobile.png'), fullPage: true });
  });

  const fixtureStore = await installMissionFixtures(page);
  await page.reload({ waitUntil: 'networkidle' });
  await checkpoint('fixtureUI', 'real responses are sent, feedback is limited, retry is compared and phrases save to the existing bank', async () => {
    await page.locator('.mission-featured').getByRole('button', { name: /start/i }).first().click();
    const answer = page.locator('#mission-answer');
    await answer.waitFor();
    const original = `I think it is good because many people like it. ${runTag}`;
    await answer.fill(original);
    await page.getByRole('button', { name: /send|respond|submit/i }).last().click();
    await page.locator('.mission-feedback').waitFor();
    assert.equal(fixtureStore.runs[0].turns[0].answer, original);
    assert.ok(await page.locator('.mission-correction').count() <= 3, 'At most three improvements by default');
    await page.screenshot({ path: path.join(output, 'missions-feedback-mobile.png'), fullPage: true });
    await answer.fill('I would support a limited trial provided that we review the evidence and protect people who cannot opt out.');
    await page.getByRole('button', { name: 'Try my improved answer', exact: true }).click();
    await page.locator('.mission-comparison').first().waitFor();
    assert.equal(fixtureStore.runs[0].turns[1].attempt, 2);
    assert.match(await page.locator('.mission-comparison').first().innerText(), /provided that/);
    await page.getByText('Two expressions to keep', { exact: true }).click();
    await page.getByRole('button', { name: 'Save provided that', exact: true }).click();
    await page.waitForFunction(() => { const cache = JSON.parse(localStorage.getItem('phrase-coach-v1') || 'null'); return cache && cache.pending.length === 0 && cache.state.chunks.some(item => item.expression === 'provided that' && item.language === 'en'); });
    assert.ok((await api(context, '/api/coach')).state.chunks.some(chunk => chunk.expression === 'provided that' && chunk.language === 'en'));
    await page.getByRole('button', { name: /next|continue/i }).last().click();
    assert.equal(fixtureStore.runs[0].round, 2);
    await noOverflow(page, 'Mission round 2 390');
  });

  await checkpoint('fixtureUI', 'response drafts survive navigation and history stays language-specific', async () => {
    const value = 'This draft should still be here after leaving the challenge.';
    await page.locator('#mission-answer').fill(value);
    await page.getByRole('button', { name: 'Back to challenges', exact: true }).click();
    await page.locator('.mission-resume').click();
    assert.equal(await page.locator('#mission-answer').inputValue(), value);
    await page.getByRole('button', { name: 'Back to challenges', exact: true }).click();
    await nav(page, 'Progress');
    await language(page, 'Deutsch');
    assert.equal(fixtureStore.runs.filter(run => run.language === 'de').length, 0);
    await language(page, 'English');
    await noOverflow(page, 'Progress 390');
  });

  await checkpoint('fixtureUI', 'all three core challenge types expose meaningful input and mystery transcripts wait for an attempt', async () => {
    for (const [kind, label] of [['debate', 'Debate'], ['roleplay', 'Roleplay'], ['mystery', 'Mystery']]) {
      await nav(page, 'Challenges');
      await page.locator('.mission-filters').getByRole('button', { name: label, exact: true }).click();
      await page.locator('.mission-catalog-item').first().click();
      const run = fixtureStore.runs[0];
      assert.equal(readPublicCatalog().missionTemplates.find(item => item.id === run.templateId).kind, kind);
      if (kind === 'mystery') {
        assert.ok(await page.locator('.mission-evidence-file').count() >= 2);
        assert.equal(await page.locator('.mission-transcript').count(), 0, 'Audio statement transcript stays closed before first response');
      }
      await page.locator('#mission-answer').fill(kind === 'mystery' ? 'The two statements cannot both be true because the recorded times conflict.' : 'I would support a limited trial, provided that we review evidence and agree on a clear condition.');
      await page.getByRole('button', { name: 'Send my answer', exact: true }).click();
      await page.locator('.mission-feedback').waitFor();
      if (kind === 'mystery') assert.ok(await page.locator('.mission-transcript').count() >= 1);
      await page.locator('#mission-answer').fill('I would support the proposal provided that we review the evidence and explain the unresolved contradiction.');
      await page.getByRole('button', { name: 'Try my improved answer', exact: true }).click();
      await page.getByText('Short on time?', { exact: true }).click();
      await page.getByRole('button', { name: 'Finish with these rounds', exact: true }).click();
      await page.locator('.mission-summary').waitFor();
      assert.equal(fixtureStore.runs[0].status, 'complete');
      assert.equal(fixtureStore.runs[0].level, run.level, 'Completion never awards an automatic CEFR level');
      assert.match(await page.locator('.mission-comparison').first().innerText(), /provided that/);
      await noOverflow(page, `${kind} summary 390`);
      await page.getByRole('button', { name: 'Back to challenges', exact: true }).last().click();
    }
  });

  await checkpoint('fixtureUI', 'German missions use independent level settings and support a real A1 start', async () => {
    await nav(page, 'Settings');
    await page.getByLabel('German current level', { exact: true }).selectOption('A1');
    await language(page, 'Deutsch');
    await nav(page, 'Challenges');
    await page.locator('.mission-filters').getByRole('button', { name: 'Rollenspiel', exact: true }).click();
    await page.locator('.mission-catalog-item').first().click();
    assert.equal(fixtureStore.runs[0].language, 'de');
    assert.equal(fixtureStore.runs[0].level, 'A1');
    await page.locator('#mission-answer').fill('Ich möchte einen fairen Vorschlag machen und einen einfachen Grund erklären.');
    await page.getByRole('button', { name: 'Meine Antwort senden', exact: true }).click();
    await page.locator('.mission-feedback').waitFor();
    assert.match(await page.locator('.mission-feedback').innerText(), /Deine Position ist klar/);
    await page.locator('#mission-answer').fill('Ich stimme zu, unter der Voraussetzung, dass wir die Ergebnisse prüfen.');
    await page.getByRole('button', { name: 'Meine neue Antwort testen', exact: true }).click();
    await page.locator('.mission-comparison').waitFor();
    assert.equal(fixtureStore.runs[0].turns[1].inputMode, 'text');
    await page.locator('.mission-back').click();
    await nav(page, 'Progress');
    assert.equal(await page.locator('.mission-history-row').count(), fixtureStore.runs.filter(run => run.language === 'de').length);
    await nav(page, 'Settings');
    await page.getByLabel('German current level', { exact: true }).selectOption('C2');
    await language(page, 'English');
    assert.equal(await page.getByLabel('English current level', { exact: true }).inputValue(), 'C1');
  });

  await checkpoint('fixtureUI', 'voice capture requires explicit transcription and lets the user edit before sending', async () => {
    await nav(page, 'Challenges');
    await page.locator('.mission-filters').getByRole('button', { name: 'Roleplay', exact: true }).click();
    await page.locator('.mission-catalog-item').first().click();
    await page.getByText('Use your voice', { exact: true }).click();
    await page.getByRole('button', { name: 'Record an answer', exact: true }).click();
    await page.getByRole('button', { name: /Stop recording/ }).waitFor();
    await page.waitForTimeout(750);
    await page.getByRole('button', { name: /Stop recording/ }).click();
    await page.getByRole('button', { name: 'Transcribe with OpenAI', exact: true }).waitFor();
    assert.equal(fixtureStore.transcriptionCalls, 0, 'Recording alone must not upload audio');
    await page.getByRole('button', { name: 'Transcribe with OpenAI', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#mission-answer').value.includes('provided that'));
    assert.equal(fixtureStore.transcriptionCalls, 1);
    const edited = 'I would support it provided that we review the evidence and agree on a clear budget.';
    await page.locator('#mission-answer').fill(edited);
    await page.getByRole('button', { name: 'Send my answer', exact: true }).click();
    await page.locator('.mission-feedback').waitFor();
    assert.equal(fixtureStore.runs[0].turns[0].answer, edited);
    assert.equal(fixtureStore.runs[0].turns[0].inputMode, 'voice');
    await page.getByRole('button', { name: 'Back to challenges', exact: true }).click();
  });

  await checkpoint('fixtureUI', 'mobile 320, desktop and dark/light appearance remain usable', async () => {
    await nav(page, 'Today');
    await page.setViewportSize({ width: 320, height: 568 });
    await noOverflow(page, 'Today 320'); await touchTargets(page, 'Today 320');
    await page.setViewportSize({ width: 1366, height: 900 });
    await noOverflow(page, 'Today desktop');
    await page.screenshot({ path: path.join(output, 'missions-today-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await noOverflow(page, 'Today dark');
    await page.screenshot({ path: path.join(output, 'missions-today-dark.png'), fullPage: true });
    await page.emulateMedia({ colorScheme: 'light' });
  });

  assert.deepEqual(results.runtimeErrors, [], 'No browser runtime errors');
  await browser.close();
  fs.writeFileSync(path.join(output, 'mission-qa.json'), JSON.stringify(results, null, 2));
  console.log(`PASS ${results.realDatabase.length} real database groups, ${results.fixtureUI.length} fixture UI groups. No live OpenAI requests.`);
})().catch(async error => {
  console.error(error.stack || error);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'mission-qa.json'), JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  process.exitCode = 1;
});
