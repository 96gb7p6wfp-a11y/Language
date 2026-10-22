# Phrase missions

Phrase now centers on one recommended challenge with two alternatives. Debate, roleplay and mystery missions use the existing English/German levels and chunk bank. Earlier exercises, exam drafts and progress remain in the existing tables; new mission history is additive.

## What a mission does

A mission starts with a brief and an initial situation. Your submitted answer goes to a server-only OpenAI call. The character responds to that answer, and the same call returns up to three language improvements, useful phrases and a task outcome supported by what you said. You retry before moving to a more demanding follow-up or helpful scaffolding. The final summary retains original and retry answers so you can compare recorded evidence.

Task success is not a CEFR assessment. Current level remains self-selected. English and German mission history, topic preferences and adaptation are separate. A completed task does not automatically increase a language level.

Mystery files are original practice cases. Private solution guidance stays in server-only code. Audio read aloud by the device is explicitly labelled as a device voice; links to authentic external sources remain identified as external. A microphone response is transcribed before submission, and the transcript can be edited. Transcription is not pronunciation or fluency scoring.

## Credentials and hosting

`OPENAI_API_KEY` is a server-side secret. Never put it in a React component, a variable beginning with `NEXT_PUBLIC_` or `VITE_`, `.openai/hosting.json`, a GitHub commit or a browser request body. The browser sends only its mission response or explicitly submitted audio to Phrase's own API. The backend sends the credential to OpenAI.

For local development, use an ignored `.env.local` through the secure key-setup workflow. A local env file does not configure a deployed Site. For the live Site, the same key must be configured as a secret named `OPENAI_API_KEY` in the Sites runtime environment and the Site redeployed. The existing `.gitignore` excludes local env files.

The variable name is case-sensitive: use exactly `OPENAI_API_KEY`. A secret named `api key`, a display label, or an OpenAI project key name does not configure this variable. Sites returns secret values masked; a saved secret cannot be downloaded into the local test environment. Its presence and Secret flag can be checked without reading the value. Saving environment changes alone does not prove that an undeployed version can read them.

The current default conversation model is `gpt-4.1-mini`; `OPENAI_MODEL` is a server-only override. The backend uses the Responses API with structured output and `store: false`. It sends a bounded scenario, recent turns and a small amount of relevant learning context, rather than an unlimited transcript. It does not enable browsing, tools, realtime voice or autonomous agents.

## Manual configuration

1. Create or rotate a project API key in [OpenAI project settings](https://platform.openai.com/api-keys), using the secure setup flow or a local secret editor. If a key has been pasted into chat, revoke that key and replace it before publication. Store the replacement only in the ignored `/workspace/phrase/.env.local` (`OPENAI_API_KEY=…`, file mode `0600`); do not paste it into chat or commit it.
2. In [OpenAI billing](https://platform.openai.com/settings/organization/billing/overview), add API credits or enable an appropriate paid billing arrangement. Check that the selected project has access and configure a budget/notification threshold for personal use. A ChatGPT subscription does not fund API usage. OpenAI project budget alerts are not an application-enforced spending cap.
3. In the existing Phrase Site's server environment settings, add the replacement as a **secret** named `OPENAI_API_KEY`, then deploy the verified version. A local key alone does not activate the hosted app. Keep the current owner-only audience.
4. Optionally configure `OPENAI_MODEL` if you deliberately want another model with compatible structured-output support.
5. Open the app while signed in and try one English and one German mission. Missing credentials, exhausted credits, rate limits and unavailable transcription are reported as errors; they never activate a simulated opponent.

## Cost and usage boundaries

Conversation input is capped at 1,800 characters per response. Mission context and output are bounded. The default model output cap is 1,100 tokens. A three-round mission permits an original answer and one retry per round, so repeated feedback cannot create an unbounded chat.

The initial limits are 30 AI conversation calls per user per Europe/Berlin calendar day and 100 calls for the Site per day, with a combined three-call-per-minute user burst limit. Audio transcription has its own eight-call per-user and 24-call Site daily limits. Voice capture stops after 90 seconds in the client and the server accepts no more than 2 MB per upload. These are request and size limits, not a guaranteed currency ceiling; model prices and audio duration affect cost. Request IDs prevent normal network retries from creating duplicate AI calls. No automatic provider retry silently bills another generation.

Transcription uses `gpt-4o-mini-transcribe`. Audio is sent to OpenAI only after the user chooses transcription. The application does not keep raw audio recordings in D1. OpenAI data processing and retention are governed by the account's API settings and policies; `store: false` alone is not a promise of zero provider retention.

## Verification and limits

`npm test`, `npm run typecheck` and `npm run build` check the existing and new source. New tests cover mission selection, language separation, adaptation, state progression, retry rules, provider response validation, errors, limits and idempotency. The mission browser suite is `node tests/mission-browser.cjs` against an initialized local preview.

Browser tests use the real local database for preservation, authentication, stored preferences and no-key behavior. When credentials are not configured, model-response UI tests use clearly identified Playwright fixtures only inside the test harness. Those fixtures are not shipped in the app and do not establish model quality or live OpenAI connectivity. Live model validation must be reported separately after secure setup succeeds.

On 21 October 2026, the supplied local key authenticated with the model metadata endpoint. A real Responses API request using the app's request builder was rejected with HTTP 429, `credit_balance_exhausted` / `insufficient_quota`. No successful live generation or transcription was verified. Further paid tests were stopped. The backend now distinguishes exhausted credits from temporary rate limits without displaying provider error details. After billing is fixed, validate debate, roleplay and mystery in both languages, including an original answer and retry, plus short English/German voice transcriptions. These checks remain release requirements.

On 22 October 2026, the local development proxy transport was repaired. When inherited HTTP proxy settings are present, `npm run dev` uses a server-only Vite transport to forward the fixed OpenAI endpoints through a session-authenticated loopback bridge. Node's native proxy support preserves the inherited proxy, exclusions and TLS trust. This path requires a Node version providing `node:http.setGlobalProxyFromEnv` (verified with Node 24.19.0). Development without a proxy and production retain native Worker fetch. The bridge is excluded from production builds; it is not a simulated AI provider.

All 84 automated tests, TypeScript checks and the production build passed. A real Miniflare Worker request passed through the bridge and workspace proxy to OpenAI, receiving the expected HTTP 401 without supplying a key or generating tokens. The local mission API also loaded successfully with the development transport. Production artifacts contained no bridge markers, client-side key identifiers, private adjudication context or credential-shaped strings in source. Live conversation, feedback/retry and transcription checks remain unverified until a valid replacement is configured locally; the revoked local key must not be used. Hosted secret metadata and runtime access are separate checks. No publication was performed.

This repair applies to the Vite development preview. `npm start` runs the built Worker locally without the development bridge, so that separate local preview path still depends on its own network access. The real hosted Cloudflare Worker is not subject to the workspace's proxy configuration, but its authenticated OpenAI request still needs verification after an authorized deployment. Do not bypass the network proxy or disable TLS.

The existing chunk bank and older exercise data remain site-wide, as before. The current Site is owner-only. Before adding other viewers, isolate ownership of legacy data, the phrases supplied as AI context, and device caches; do not treat the new user-scoped mission tables alone as a multiuser migration.

Useful official references: [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Speech transcription](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe), and [API pricing](https://developers.openai.com/api/docs/pricing).
