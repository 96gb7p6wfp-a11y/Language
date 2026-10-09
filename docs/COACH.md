# Phrase fluency coach

This is an incremental update of the existing Phrase app, using the same Vinext/React app, Cloudflare Worker, D1 binding, site identity, and Home Screen assets.

## Preserved data and behavior

`learner_settings`, `exercise_progress`, `practice_days`, `recorded_attempts`, and `writing_drafts` remain intact. Original exercise and exam task IDs are unchanged. Original spelling/ordering drills, spaced exercise review, device audio, Chinese hints, exam timers, checklists and model answers remain available through Practice. Browser integration tools `get_practice_state` and `start_practice` are retained.

Migration 0002 only creates new coach tables/indexes. The API also lazily ensures those additive tables exist. Existing D1 levels seed separate English and German coach preferences. Current-level changes update the original learner settings as well. Progress is scoped by learning language, as before; this change does not migrate identity or account ownership. The existing site's audience is preserved.

New mutations use a transactional operation ledger, so retried requests cannot double-count sessions or reviews. Fields and drafts accept newer timestamps without replacing an entire state snapshot. The browser caches state and unsent operations atomically under `phrase-coach-v1`; changes remain in that outbox until the server acknowledges them. Existing `phrase-language` and `phrase-glosses` keys are retained. Exam drafts also have an immediate device backup under `phrase-exam-drafts-v1` and debounced server autosave.

## Learning experience

Today contains two activities for 20 minutes and four for 45/60/90 minutes, with an exact planned budget. Listening/reading lead; speaking/writing and support activities rotate. Prior-week activity gaps influence tomorrow's plan; completing a task cannot reshuffle today's plan. Languages adapt independently. Exam tasks are optional and included in plans only for exam goals.

Listening, reading, speaking and writing use original, labelled A1–C2 practice content. Advanced content includes register, implication, evidence, collocation and argument, not only difficult vocabulary. Links lead to authentic external input. Browser-synthesized practice audio is labelled; it is not presented as a native recording. Users may bring their own transcript/text and a local audio file. Audio files and microphone recordings are not uploaded.

Progress bars display activity time, not assessed ability. Levels are self-selected. Speaking supports a timer, actual local recording and reflection. Writing uses self-review and illustrative correction models. There is no AI assessment or speech-analysis backend. `lib/writing-feedback.ts` defines a provider contract for real future feedback; no assessment provider is configured.

## Verification

- `npm test`: Node tests for planner, bilingual content, SQLite migration/sync, review, draft restoration, exam compatibility and foreground time.
- `npm run typecheck`: strict TypeScript check.
- `npm run build`: retained Vinext/Worker production build.
- `tests/browser-smoke.cjs`: browser integration against a running local app and D1 database. The Work environment supplies Chromium and Playwright; for other machines install Playwright and set the executable path if needed.

There were no pre-existing tests. Browser checks cover 320px/390px iPhone layouts, desktop, language switching, actual server persistence, reading/listening/speaking/writing flows, chunks, school/IELTS drafts, A1/C1/C2, and system/explicit themes. Existing PWA support is the Web App Manifest and Home Screen assets; there is no claim of service-worker offline delivery.
