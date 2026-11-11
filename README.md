# New to Ontario Doctor Finder

A working prototype that helps a newcomer in Toronto find a family doctor or nurse practitioner who is taking new patients, and leave with a plan for who to call.

**WAI Hackathon Canada 2026, Team 14.** Theme 4: Social Impact (Health), under Agentic AI for Good. UN Sustainable Development Goals 3 (Good Health and Well-being) and 10 (Reduced Inequalities).

**Every clinic, phone number, count and waitlist entry that ships with this repo is invented sample data.** Sample rows are flagged `is_sample` and the screens that show them carry a "Sample data" banner.

## The problem

More than 2.5 million Ontarians do not have a family doctor, according to the Ontario Medical Association. Finding a family doctor in Ontario is hard, and it is harder for newcomers. Notices that a clinic is "accepting new patients" are spread across clinic websites, regional lists and community posts. They are usually in English, often out of date, and say nothing about which languages the doctor speaks. A newcomer ends up calling clinics that filled up weeks ago, or that cannot see them in a language they are comfortable with. Many also do not know that Ontario's official route, Health Care Connect, exists.

## Our approach

New to Ontario Doctor Finder brings those notices together in one place and puts them in the patient's language:

1. **Patients search in their own language.** They pick one of five languages and enter the first three characters of their postal code. Results rank clinics by whether the doctor speaks their language, how recently the listing was confirmed, and how close it is.
2. **Each listing shows how fresh it is.** It says when it was last confirmed and when it expires. After calling, patients can report "still taking patients" or "they are full", which keeps the list current for the next person.
3. **AI reads the notices and a person checks them.** A reviewer pastes a public announcement, and one AI call turns it into structured fields, each with a confidence level. Nothing is published until a person approves it.
4. **Partners see where the gaps are.** Community health partners get anonymous counts of searches by area and language, plus a list of places where people searched in a language no nearby clinic offers.

It asks for no accounts, names or health information. It does not replace Health Care Connect: the patient's plan tells them, in their language, to register there as well.

**How it reaches people.** The tool is meant to sit inside settlement agencies' welcome guides, not to be one more app a newcomer has to find. A regional partner funds a pilot and then pays per successful attachment, so it stays free for patients, with no advertising and no paid placement.

## Screenshots

### For patients

| 1. Choose a language and area | 2. Ranked results | 3. Call script and report |
| --- | --- | --- |
| ![Start screen with language choices, postal area and provider type](docs/screenshots/01-start.png) | ![Results near M5T, ranked best match first, each with freshness and distance](docs/screenshots/02-results.png) | ![Listing page with languages spoken, a phone script and buttons to report what the clinic said](docs/screenshots/03-listing.png) |

| 4. A plan for who to call next | 5. The same results in Mandarin |
| --- | --- |
| ![My plan: clinics opened so far and who to call next](docs/screenshots/04-plan.png) | ![Results screen in Simplified Chinese, with clinics that speak Mandarin highlighted](docs/screenshots/05-results-zh.png) |

### For reviewers and partners

**Intake.** A reviewer pastes a public announcement and its link.

![Intake form with a pasted announcement and a Read announcement button](docs/screenshots/06-intake.png)

**Review queue.** The announcement is turned into fields, each marked high, medium or low confidence, and anything uncertain is held for a person to check. In this screenshot the offline stand-in reader produced the fields (`LLM_PROVIDER=mock`). With an API key, a Claude model does this step.

![Review queue item held for human review, with extracted fields and confidence badges](docs/screenshots/07-review-queue.png)

**Partner view.** Anonymous counts by postal area and language, and a ranked list of unmet demand. Counts under 5 are hidden.

![Partner view with unmet demand list and a table of searches by area and language](docs/screenshots/08-partner.png)

**Waitlist concept.** A simulation of how a partner's own waitlist could offer open spots fairly: people within 8 km of the clinic, earliest joined first, 3 at a time, with 72 hours to reply. It uses sample patients only and sends no messages.

![Waitlist concept admin screen with a Simulate an opening button per clinic](docs/screenshots/09-waitlist.png)

## Responsible AI

- **A person approves everything the AI reads.** The AI fills in a form and a reviewer publishes it. Low-confidence fields are flagged, and the prompt tells the model to leave a field empty rather than guess.
- **Announcements are treated as data, not instructions.** The prompt tells the model to ignore anything in a post that reads like an instruction, and the app re-checks every field it returns.
- **No personal or health information.** There are no accounts. A patient's plan stays in their own browser, and the server only keeps daily counts by area and language. Counts under 5 are hidden in the partner view.
- **Navigation only.** The tool does not choose a doctor for anyone and gives no medical advice.
- **Honest about what is real.** Sample data is labelled on every screen that shows it. The extraction eval uses real public announcements and reports every mistake.
- **Translations need review.** The patient screens were translated without a native speaker, and every new string is listed in `docs/translations-to-review.md` for review before a pilot.

## Design choices

- **Freshness is visible.** Every listing shows when it was last confirmed and expires after 30 days. Patient reports update it, and two "they are full" reports hide it.
- **Language comes first.** Language match is the biggest factor in ranking (45%, then freshness 30% and distance 25%), and the patient screens come in English, French, Mandarin, Spanish and Tagalog.

## Built with

Next.js 15, React 19, TypeScript, PostgreSQL with Prisma, and the Anthropic API (or OpenAI) for reading announcements. It is set up to deploy to DigitalOcean App Platform.

Planned: Cohere's open Aya models for translating listings and call scripts into more languages. The prototype uses hand-written translations for now.

## Limits and next steps

- **Sample listings.** The clinics in the app are invented. A pilot would start from real public announcements, entered through the review queue.
- **A small eval.** The extraction eval has 15 real public announcements; the target is 20.
- **Draft translations.** They need native-speaker review before a pilot.
- **Toronto only.** Postal areas cover 25 Toronto areas.
- **Next step: a pilot** with a settlement agency and a regional partner.

---

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

The file has **15 real public announcements** from Toronto clinic websites, a community news article, and three family health teams outside Toronto (for the "not in Toronto" case). Each text is an exact excerpt of the page, with the `source` URL and the date it was retrieved. Some excerpts join lines from different parts of the same page, such as the notice and the address in the footer. `label_note` explains any label a reviewer might question. Check the labels before you publish results; a few are judgement calls (for example, staff languages versus doctors' languages, or an address whose postal area is not in the app's list of 25).

The 3 original invented examples are in `eval/synthetic.jsonl`. Run them with `npm run eval -- eval/synthetic.jsonl`, which writes `eval/synthetic-results.md`.

To add an example, add one JSON object per line:

```json
{"id":"real-16","source":"https://…","retrieved":"2026-11-11","today":"2026-11-11","text":"…the announcement…","expected":{"fsa":"M4C","provider_type":"family_doctor","languages":["English","Bengali"],"date":"2026-11-02"},"label_note":""}
```

`fsa` is the first 3 postal characters (one of the areas in `lib/fsa.ts`) or null. `date` is null when the text alone does not settle it; returning null there is the correct answer. `today` is the date given to the model for reference.

The committed `eval/results.md` was produced with `LLM_PROVIDER=mock`, the offline keyword reader, so it shows that the script works, not how well a model reads. Re-run it with a real key. The keyword reader scored well on the 3 invented examples it was written alongside and badly on the real ones, which is why the real set matters.

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

- The eval set has 15 of 20 real announcements, and has not been run against a real model yet.
- Translations for the new screens are drafts. See `docs/translations-to-review.md`.
- The rate limiter is in memory, which is fine for one web instance and not for several.
- Postal areas cover the 25 Toronto areas from the demo. Other codes fall back to downtown with a notice.
- The waitlist concept has no reply simulation for the 30-day check-in (keep waiting, switch area, leave); the message is shown in the outbox only.

`reference/demo.html` is the original single-file clickable demo the screens and wording were ported from.
