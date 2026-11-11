# New to Ontario Doctor Finder

A working prototype that helps a newcomer in Toronto find a family doctor or nurse practitioner who is taking new patients, and leave with a plan for who to call.

**Every clinic, phone number, count and waitlist entry that ships with this repo is invented sample data.** Sample rows are flagged `is_sample` and the screens that show them carry a "Sample data" banner.

## What it does

| Who | Where | What |
| --- | --- | --- |
| Patient | `/` → `/results` → `/listing/[id]` → `/plan` | Pick a language and postal area, see listings ranked by language (45%), freshness (30%) and distance (25%), get a call script, report "still taking patients" or "they are full", and leave with a call plan. Five languages: English, French, Mandarin, Spanish, Tagalog. |
| Reviewer | `/admin` | Paste an announcement and its link. One LLM call turns it into fields with a confidence for each. Every read waits in the review queue; nothing is published without approval. |
| Partner | `/partner` | Searches, searches with no listing in that language, listing opens and full reports by postal area and language, plus an unmet-demand list. Counts under 5 are hidden. |
| Concept | `/admin/waitlist`, `/waitlist/status`, `/waitlist/rule`, `/waitlist/outbox` | A simulation of how a partner's waitlist could offer open spots fairly. Sample patients only. No message is ever sent. |

`/admin`, `/partner` and `/admin/waitlist` sit behind one password (`ADMIN_PASSWORD`).

## Local setup

Needs Node 22 and PostgreSQL 14 or newer.

```bash
createdb doctorfinder                # or any empty database
cp .env.example .env                 # then edit DATABASE_URL and ADMIN_PASSWORD
npm install
npm run db:migrate                   # create tables
npm run db:seed                      # sample clinics, 30 days of sample counts, 60 sample waitlist entries
npm run dev                          # http://localhost:3000
```

To try it without an LLM key, set `LLM_PROVIDER=mock` in `.env`. That swaps the AI for a small offline keyword reader so you can click through intake and review. It is not AI and its reads are not representative.

Sample listings age like real ones, so a month after seeding they will all have expired. `npm run db:seed -- --refresh` deletes the sample rows and re-creates them with fresh dates. It never touches real listings.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | none | PostgreSQL connection string. |
| `ADMIN_PASSWORD` | none | Password for the review queue, partner view and waitlist admin. If unset, nobody can sign in. |
| `TOKEN_SECRET` | falls back to `ADMIN_PASSWORD` | Secret for hashing the anonymous daily token used by full reports and rate limits. |
| `LLM_PROVIDER` | `anthropic` | `anthropic`, `openai` or `mock`. |
| `LLM_MODEL` | `claude-opus-5-5` for anthropic | Model id for the chosen provider. Required for `openai`. |
| `LLM_API_KEY` | none | API key for the chosen provider. Server-side only. |
| `EXPIRY_DAYS` | `30` | Days a listing stays live after it was last confirmed. |
| `WAITLIST_RADIUS_KM` | `8` | Concept: how far from the clinic an entry can be to get an offer. |
| `OFFER_BATCH_SIZE` | `3` | Concept: how many entries are offered a spot at once. |
| `OFFER_WINDOW_HOURS` | `72` | Concept: hours to reply before the offer moves on. |

Secrets never go in the repo. `.env` is git-ignored.

## The extraction module

All LLM use is in `lib/extract.ts`: one call per announcement, using the provider's structured JSON output with the schema in that file. The prompt says the announcement is data and not instructions, and tells the model to return null rather than guess. `normalize()` re-checks whatever comes back, so an invalid date or postal area becomes null with low confidence.

To add a provider, add a `via…` function there and a branch in `extractListing`. Nothing else in the app knows which provider is in use.

## Running the eval

```bash
npm run eval
```

This reads `eval/announcements.jsonl`, runs each announcement through `lib/extract.ts` with whatever provider your environment points at, scores location, provider type, languages and date, and writes `eval/results.md` with accuracy per field and every mistake.

The file has **3 invented examples**. The target is 20. Add one JSON object per line:

```json
{"id":"ex-04","today":"2026-11-10","text":"…the announcement…","expected":{"fsa":"M4C","provider_type":"family_doctor","languages":["English","Bengali"],"date":"2026-11-02"}}
```

`fsa` is the first 3 postal characters (one of the areas in `lib/fsa.ts`) or null. `date` is null when the text alone does not settle it; returning null there is the correct answer. `today` is the date given to the model for reference.

The committed `eval/results.md` was produced with `LLM_PROVIDER=mock`, so it shows that the script works, not how well a model reads. Re-run it with a real key.

## Jobs

```bash
npm run job:expire      # marks live listings past EXPIRY_DAYS as expired
npm run job:waitlist    # concept: reminders, closed reply windows, 30-day check-ins (sample rows only)
```

Both also have a "run now" button on the admin screens. Patients never see a listing past its expiry date even before the job runs; the job makes the status change permanent.

## Privacy

- No patient accounts. No names, health card numbers or health information are asked for or stored.
- The patient's plan (which clinics they opened and what they reported) lives in `sessionStorage` in their browser and is never sent to the server.
- The only patient-side data stored is `daily_counts`: counters by date, postal area and language.
- A full report stores a hash of (secret, date, network address) that changes daily and cannot be reversed. The address itself is never stored or logged. A listing is hidden after 2 separate reports, and the endpoint is limited to 10 reports an hour per token.
- Intake is paste-only. Nothing is scraped.

## Tests

```bash
npm test          # ranking weights, review rule, prompt wording, translation completeness
npm run typecheck
```

## Deploying to DigitalOcean App Platform

The spec is `.do/app.yaml`: one web service, a managed PostgreSQL database, a `PRE_DEPLOY` job that runs migrations and the seed, and two `SCHEDULED` jobs (nightly expiry at 03:15 and waitlist check-ins at 03:45 Toronto time), in the Toronto region, with deploy on push.

**Before the first deploy, check three things in the spec:** the `github.repo` and `branch` (it deploys `main`), the database `cluster_name`, and the two `SCHEDULED` job blocks. The spec was written without access to DigitalOcean's docs or an account, so `doctl apps spec validate .do/app.yaml` should be the first command you run.

This creates paid resources: the web service, the database cluster, and job run time.

```bash
doctl auth init                                   # paste your DigitalOcean token
doctl apps spec validate .do/app.yaml

# 1. The database cluster (paid). The spec attaches to it by name.
doctl databases create doctor-finder-db --engine pg --version 16 --region tor1 --size db-s-1vcpu-1gb --num-nodes 1

# 2. The app. DigitalOcean must already have access to the GitHub repo.
doctl apps create --spec .do/app.yaml

# 3. Secrets: in the console, open the app → Settings → App-Level Environment Variables,
#    set LLM_API_KEY, ADMIN_PASSWORD and TOKEN_SECRET, tick Encrypt, and save. That triggers a deploy.
```

### Redeploying

- Push to `main`. Deploy on push rebuilds the web service and jobs, and the pre-deploy job runs migrations and the seed (the seed only adds sample data that is missing).
- After editing `.do/app.yaml`: `doctl apps update <app-id> --spec .do/app.yaml`. Find the id with `doctl apps list`. Updating from the committed spec can clear secrets that were set in the console, so re-enter them afterwards or update from a local copy that includes them.
- To force a rebuild: `doctl apps create-deployment <app-id> --force-rebuild`.
- Schema changes: edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <what-changed>` locally, commit the new folder under `prisma/migrations`.

## What is not done

- The eval set has 3 of 20 announcements, and has not been run against a real model.
- Translations for the new screens are drafts. See `docs/translations-to-review.md`.
- The rate limiter is in memory, which is fine for one web instance and not for several.
- Postal areas cover the 25 Toronto areas from the demo. Other codes fall back to downtown with a notice.
- The waitlist concept has no reply simulation for the 30-day check-in (keep waiting, switch area, leave); the message is shown in the outbox only.

`reference/demo.html` is the original single-file clickable demo the screens and wording were ported from.
