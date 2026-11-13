# Handoff: Doctor Finder (hackathon demo)

Written 2026-11-13 for the next agent (Codex) picking this up. Read this first, then `README.md`.

## Ground rules (from the project owner)

- **One branch, one PR.** All work goes on `claude/upbeat-brown-81oeml`, which is open as PR #10
  into `main` (https://github.com/mcruz90/wai_hackathon2026/pull/10). Do not open a new PR.
- **Do not merge PR #10.** Merging `main` redeploys the live app on DigitalOcean; the owner merges once, at the end.
- **Pull before you edit** (`git pull --ff-only origin claude/upbeat-brown-81oeml`). Other sessions
  (the owner's local agent, another cloud session) push to this same branch. Never force-push.
- **No secrets in chat, commits or docs.** Keys live only as encrypted DigitalOcean app secrets and in local `.env`.
- Ask before building anything big that wasn't requested. Keep changes small and demo-focused.
- Run `npm run typecheck` and `npm test` before every push.

## What the project is

An Ontario tool that helps newcomers find a family doctor who is accepting patients and speaks their
language. Patients search by postal-code area (FSA) and get a ranked plan (Health Care Connect first,
then accepting clinics, walk-ins and IFHP notes), an appointment question guide, and a phone script.
Reviewers (staff at a partner agency) publish clinic listings; AI agents only ever write **proposals**,
and a person authorizes every publication.

Hackathon pitch deck (already submitted): Slides artifact https://claude.ai/artifact/QZdFEENm5bEYCDY38JyD1V

## Stack

- Next.js 15 (App Router, server actions), React 19, TypeScript.
- Prisma + PostgreSQL (Neon in production; any Postgres locally). Migrations in `prisma/migrations`.
- Cohere for all LLM work (v2 Chat): `LLM_PROVIDER=cohere`, `LLM_MODEL=command-a-plus-05-2026`,
  translation model `command-a-translate-08-2025` (`COHERE_TRANSLATE_MODEL`).
- Tavily for discovery web search (`DISCOVERY_SEARCH_PROVIDER=tavily|mock|off`).
- Read-aloud uses the browser's `speechSynthesis` (no server, no key).
- Deploy: DigitalOcean App Platform, spec in `.do/app.yaml`, deploys on push to `main`. Services: the web
  app plus a `migrate-and-seed` pre-deploy job (`prisma migrate deploy` + seed). No scheduled jobs.

## Run it locally

See `docs/local-preview.md`. Short version:

```bash
cp .env.example .env    # fill DATABASE_URL, ADMIN_PASSWORD, TOKEN_SECRET; LLM_PROVIDER=mock works offline
npm install
npm run db:migrate && npm run db:seed
npm run dev             # http://localhost:3000, reviewer pages at /admin
```

Offline settings for demos/tests: `LLM_PROVIDER=mock`, `DISCOVERY_SEARCH_PROVIDER=mock`,
`AGENT_PLANNER=scripted` (skips the Cohere tool loop).

## Map of the code

| Area | Files |
| --- | --- |
| Patient search, plan, listing | `app/page.tsx`, `app/results`, `app/plan`, `app/listing/[id]`, `lib/ranking.ts`, `lib/listings.ts`, `lib/fsa.ts` |
| Languages (en, fr, zh, ar, pa, tl; Arabic is right-to-left) | `lib/i18n.ts` (`LANGS`, `T`, `dir`, `MT_NAME`, `speechLangFor`). Phone numbers are wrapped in `<bdi dir="ltr">`. Translations awaiting a human check: `docs/translations-to-review.md` |
| Appointment guide, read-aloud, machine translation | `app/guide/page.tsx` (`?xl=<language>`), `components/Speak.tsx`, `components/ClinicSays.tsx`, `lib/translate.ts` |
| Patient reports ("full", "nobody spoke my language") | `app/api/report/route.ts` → starts the freshness agent for that clinic; `FULL_REPORTS_TO_HIDE` (default 2) |
| Agents | `lib/agent/runtime.ts` (Cohere tool-use loop, scripted fallback), `intake.ts`, `freshness.ts`, `triage.ts`; trace UI `components/AgentTrace.tsx` |
| Reviewer inbox | `app/admin/page.tsx`, `app/admin/actions.ts`, `components/BatchReview.tsx`, `lib/batch-review.ts`, `lib/review-policy.ts` (`REQUIRE_TRUSTED_CLINIC_SOURCE`, off by default) |
| Discovery (find clinic pages on the web) | `app/admin/discovery/*`, `lib/discovery/search.ts` (Tavily/mock), `service.ts`, `web.ts`; see `docs/ontario-discovery.md` |
| Waitlist | `app/waitlist`, `app/admin/waitlist`, `lib/waitlist.ts` |
| Tests | `tests/*.test.ts` (node:test via tsx). Some are `*.integration.test.ts` and need a database |
| Eval | `npm run eval` (`scripts/eval.ts`), Cohere Command A+ extraction eval; results are in the deck |

## How the agents work

`lib/agent/runtime.ts` runs a Cohere v2 tool-use loop: the model gets the agent's tools, returns
`tool_plan` + `tool_calls`, the app runs them and sends back `role: "tool"` messages until the model
finishes. `toCohereSchema()` adapts the JSON schemas (nullable → optional, no `additionalProperties`).
If Cohere errors or doesn't finish, the agent falls back to a fixed scripted plan, and the trace says
which planner ran ("Cohere (model) chose each step" vs scripted).

- **Intake**: turns a pasted clinic notice into a listing proposal.
- **Freshness**: re-checks a listing (started by a patient report, or by hand) and proposes a re-check call task.
- **Triage** (newest): sorts discovered pages from link/title/snippet only (nothing fetched): watch clinic
  or directory pages, dismiss news and social posts, leave unsure ones for a person. Never publishes.

## State of PR #10 (latest first)

0. `8d8242b` Triage sorts 10 pages at a time with short handles (p1, p2, …), and the Cohere loop retries a 422
   "invalid tool generation" once. Fixes the fallback seen after a real 25-page Tavily search.
1. `89664bd` Triage agent for discovered pages (+ migration `20261113180000_discovery_triage`).
2. `2c431b2` `/admin` is now an inbox: Ready to publish / Needs you / Call the clinic.
3. `c51a7af` A patient report starts the freshness agent right away.
4. `d6a2879` Discovery screen redesigned as three numbered steps (find, review, check).
5. `c448586` Pause / Reject source have their own server actions.
6. `c67e35e` Cohere chooses the agents' steps with tool calling.
7. `70e6fe8` Offline mock for discovery search.
8. `bdeb478`, `82332bd` Read-aloud; Cohere machine translation for other languages and for clinic instructions.

The PR description covers commits 0–3 (updated from the cloud session); append to it when you push.

## Verified vs not verified

- Verified locally with mock providers / faked Cohere replies: intake agent end to end, discovery
  approve → check → proposal, translation in mock mode, typecheck and unit tests passing.
- **Not verified live:** the Cohere tool-use loop and the translate model against the real API (the
  cloud sandbox couldn't reach Cohere). This is the most important thing to check before the demo: run
  `/admin` intake with `LLM_PROVIDER=cohere` and a real key, and confirm the trace says Cohere chose the steps.
- The new migration has not been applied to Neon yet; it runs automatically in the `migrate-and-seed`
  job when PR #10 is merged.

## Possible next tasks (confirm with the owner first)

- Clarify the hand-intake box on `/admin` (label it e.g. "Add a notice by hand").
- Live check of the Cohere agents and translation (above), and fix anything it turns up.
- Refresh `docs/screenshots` and the README for the new inbox and triage agent.
- Ideas only, don't build unasked: demand-driven discovery (search where patients are looking but
  listings are thin), patient follow-through reminders.

## Deploy notes (for when the owner merges)

- App-level secrets in DigitalOcean: `DATABASE_URL` (Neon **direct**, non-pooled string, without
  `&channel_binding=require`), `LLM_API_KEY`, `TAVILY_API_KEY`, `ADMIN_PASSWORD`, `TOKEN_SECRET`.
  Pasting a new app spec can blank secrets; re-enter them if the build fails with an empty `DATABASE_URL` (Prisma P1012).
- Optional env vars introduced on this PR: `FULL_REPORTS_TO_HIDE`, `REQUIRE_TRUSTED_CLINIC_SOURCE`,
  `COHERE_TRANSLATE_MODEL`, `AGENT_PLANNER`. Defaults are fine for the demo.
