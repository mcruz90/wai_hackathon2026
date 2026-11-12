# New to Ontario Doctor Finder

A working prototype that helps a newcomer in Ontario find a family doctor or nurse practitioner who is taking new patients, and leave with a plan for who to call.

**WAI Hackathon Canada 2026, Team 14.** Theme 4: Social Impact (Health), under Agentic AI for Good. UN Sustainable Development Goals 3 (Good Health and Well-being) and 10 (Reduced Inequalities).

**Every clinic, phone number, count and waitlist entry that ships with this repo is invented sample data.** Sample rows are flagged `is_sample` and the screens that show them carry a "Sample data" banner.

## The problem

More than 2.5 million Ontarians do not have a family doctor, according to the Ontario Medical Association. Finding a family doctor in Ontario is hard, and it is harder for newcomers. Notices that a clinic is "accepting new patients" are spread across clinic websites, regional lists and community posts. They are often out of date, and most do not say which languages are spoken: 11 of the 15 real notices in our eval set name no language. A newcomer ends up calling clinics that filled up weeks ago, or that cannot see them in a language they are comfortable with. Ontario's official route, Health Care Connect, has a nurse look for a provider, but it can take time.

## Our approach

New to Ontario Doctor Finder brings those notices together in one place and puts them in the patient's language:

1. **Patients search in their own language.** They pick one of six languages and enter the first three characters of their postal code. Results rank clinics by whether the doctor speaks their language, how recently the listing was confirmed, and how close it is.
2. **Each listing shows how fresh it is.** It says when it was last confirmed and when it expires. After calling, patients can report "still taking patients" or "they are full", which keeps the list current for the next person.
3. **Agents do the legwork, and people authorize publication.** Two agents keep the directory current:
   - The **intake agent** reads a pasted public announcement into structured fields, each with a confidence level. It checks whether the clinic is already listed, then proposes a new listing, a re-confirmation of an existing one, marking one full, or not listing it at all.
   - The **freshness agent** runs every night. It finds listings that are about to expire or that a patient reported full, and asks a reviewer to phone the clinic, with a call script ready.

   Neither agent can publish or change a listing. Reviewers can explicitly publish eligible new listings as a selected batch; uncertain listings, updates and clinic checks stay in individual review.
4. **Languages are found out, not assumed.** Most notices do not say which languages are spoken, so a listing without them shows "Languages not listed. Ask when you call." and ranks above a clinic known not to speak the patient's language. The language is then filled in by the people already in the loop: the call script asks the clinic, a reviewer records what the clinic says on a re-check call, and after calling, patients can report "someone spoke my language", "they offered an interpreter" or "neither". A reported language shows, labelled as a patient report, once 2 separate patients agree.
5. **Patients bring the right questions.** A fixed guide of practical questions for the appointment (an interpreter, IFHP coverage, longer medication renewals, records, after-hours care) is shown in English with the patient's language underneath, so they can show it to clinic staff. It is written in advance, not generated, and it says to ask for a professional interpreter for the health conversation itself.
6. **Partners see where the gaps are.** Community health partners get anonymous counts of searches by area and language, plus a list of places where people searched in a language no nearby clinic offers. Each gap says whether nearby listings simply do not list languages yet, or whether it is a known gap.

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

| 6. Results in Arabic, right to left | 7. A listing and call script in Punjabi |
| --- | --- |
| ![Results near M4H in Arabic, laid out right to left, with an Arabic-speaking sample clinic first](docs/screenshots/16-results-ar.png) | ![Sample listing in Punjabi with the call script in English and Gurmukhi](docs/screenshots/17-listing-pa.png) |

| 8. What is known about language | 9. After calling: was your language spoken? | 10. Questions for the appointment |
| --- | --- | --- |
| ![Arabic results: a patient-reported Arabic speaker, a listed one, an interpreter reported by patients, and a clinic whose languages are not listed](docs/screenshots/18-results-ar-languages.png) | ![Arabic listing with the call script, a link to the appointment questions, and buttons to report whether the clinic spoke Arabic, offered an interpreter, or neither](docs/screenshots/20-listing-ar-report.png) | ![Appointment questions in English with Arabic underneath, grouped from calling the clinic to after the visit](docs/screenshots/21-guide-ar.png) |

### For reviewers and partners

**Intake.** A reviewer pastes a public announcement and its link. Agents still prepare proposals; people authorize publication.

![Updated intake form with mock-mode notice, announcement text, source link and source type](docs/screenshots/06-intake.png)

**Batch review.** Eligible new listings appear together with source links, evidence dates and expandable announcements. The reviewer selects the batch, excludes any listing that needs investigation, and explicitly authorizes publication. Changing the selection resets authorization. This example publishes one selected sample listing and leaves the other pending.

![Batch review showing two sample candidates, one selected, supporting evidence and an explicit publish authorization](docs/screenshots/11-batch-review.png)

**Needs investigation.** Missing dates, uncertain fields, unconfigured sources, possible duplicates and conflicts stay in individual review. This invented sample has no evidence date, so it cannot enter a batch.

![Individual review of an invented clinic announcement with a missing date and the reasons it needs investigation](docs/screenshots/07-review-queue.png)

**Needs clinic confirmation.** Freshness proposals stay separate from batch publishing. A reviewer checks with the clinic and records whether it is still accepting patients or is full; the agent does not contact the clinic.

![Clinic confirmation queue with a sample re-check, priority, call script and individual outcome buttons](docs/screenshots/10-agent-proposals.png)

**Publication history.** The human-approved versions, evidence snapshots, original dates and publication outcome are saved together. The current shared login is recorded as `shared_admin`, rather than claiming to identify an individual reviewer.

![Publication history displaying a batch decision and the original sample listing and evidence snapshot](docs/screenshots/12-publication-history.png)

These screenshots show the running application with invented review fixtures from `npm run db:seed:review-demo`. The fixtures deliberately exercise eligible and uncertain paths; their confidence badges are not an evaluation of model accuracy. The `.example` source links are placeholders. See [the local preview guide](docs/local-preview.md) to try the same workflow.

**Partner view.** Anonymous counts by postal area and language, and a ranked list of unmet demand. Counts under 5 are hidden.

![Partner view with unmet demand list and a table of searches by area and language](docs/screenshots/08-partner.png)

**Waitlist concept.** A simulation of how a partner's own waitlist could offer open spots fairly: people within 8 km of the clinic, earliest joined first, 3 at a time, with 72 hours to reply. It uses sample patients only and sends no messages.

![Waitlist concept admin screen with a Simulate an opening button per clinic](docs/screenshots/09-waitlist.png)

## Responsible AI

- **People authorize publication.** The agents' tools can read the directory and write proposals, nothing else. Reviewers explicitly authorize selected batches of eligible new listings and review exceptions individually. Re-confirming and marking a listing full remain individual decisions. Automatic expiry and report-based hiding still apply. Low-confidence fields are flagged, and the prompt tells the model to leave a field empty rather than guess.
- **Every agent step is visible.** Each proposal shows the tools the agent called, what it passed, and what came back.
- **Announcements are treated as data, not instructions.** The prompt tells the model to ignore anything in a post that reads like an instruction, and the app re-checks every field it returns.
- **No patient accounts or health information requested.** Patient search needs no account. A patient's plan stays in their own browser, and the server only keeps daily counts by area and language. Counts under 5 are hidden in the partner view.
- **Navigation only.** The tool does not choose a doctor for anyone and gives no medical advice.
- **Honest about what is real.** Sample data is labelled on every screen that shows it. The extraction eval uses real public announcements and reports every mistake.
- **Translations need review.** The patient screens were translated without a native speaker, and every new string is listed in `docs/translations-to-review.md` for review before a pilot.

## Design choices

- **Freshness is visible.** Every listing shows when it was last confirmed and expires after 30 days. Patient reports update it, and two "they are full" reports hide it.
- **Language comes first.** Language match is the biggest factor in ranking (45%, then freshness 30% and distance 25%). Within the language part, a listed or patient-reported match scores 1, a reported interpreter 0.6, languages not listed 0.4 and a known mismatch 0, so nobody is hidden for missing data. Ranking is never a filter: a nearby clinic that does not speak the language still shows. The screens come in English, French, Mandarin, Arabic, Punjabi and Tagalog. Arabic screens read right to left.
- **Languages follow newcomer data.** Besides English and French, the four languages are the non-official languages that recent immigrants (arrived 2016 to 2021) in the Toronto area speak most often at home in the 2021 Census: Mandarin, Arabic, Punjabi and Tagalog ([Statistics Canada, Focus on Geography Series, Toronto CMA](https://www12.statcan.gc.ca/census-recensement/2021/as-sa/fogs-spg/page.cfm?dguid=2021S0503535&lang=E&topic=9)). Spanish was in the first prototype and was replaced by Arabic and Punjabi. A pilot should confirm the languages with its partner area.

## Built with

Next.js 15, React 19, TypeScript and PostgreSQL with Prisma. Announcements are read by Cohere Command A+ (`command-a-plus-05-2026`) through the Cohere v2 Chat API with a JSON schema. The reading step also works with the Anthropic API (Claude) and OpenAI. The agent loop lets the model choose its own tool calls only with `LLM_PROVIDER=anthropic`. With Cohere, a scripted planner calls the same tools in a fixed order, and every run is still stored as a trace for the reviewer. It is set up to deploy to DigitalOcean App Platform.

Planned: Cohere's open Aya models for translating listings and call scripts into more languages. The prototype uses hand-written translations for now.

## Limits and next steps

- **Sample listings.** The clinics in the app are invented. A pilot would start from real public announcements, entered through the review queue.
- **A small eval.** On 15 real public announcements, Cohere Command A+ scored 100% on location, languages and date and 73% on provider type, in one run. All 4 misses were "unknown" at low confidence, so those listings go to individual review. The target is 20 or more announcements and repeated runs.
- **Draft translations.** They need native-speaker review before a pilot.
- **Ontario coverage.** Search supports 527 Ontario postal areas from a credited GeoNames snapshot. Representative points and straight-line distances are approximate; newer areas need a data update.
- **Next step: a pilot** with a settlement agency and a regional partner.

---

## What it does

| Who | Where | What |
| --- | --- | --- |
| Patient | `/` → `/results` → `/listing/[id]` → `/plan` | Pick a language and postal area, see listings ranked by language (45%), freshness (30%) and distance (25%), get a call script, report "still taking patients" or "they are full", and leave with a call plan. Six languages: English, French, Mandarin, Arabic (right to left), Punjabi (Gurmukhi script), Tagalog. |
| Reviewer | `/admin` | Paste an announcement and its link. The intake agent reads it and proposes a new listing, an update to an existing one, or not listing it. The freshness agent proposes re-checks. New listings can be explicitly approved individually or in eligible batches. Proposals remain individually reviewed. |
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

## Click through a local preview

You can run the whole app on your own computer before deploying. See [the local preview guide](docs/local-preview.md) for a Docker PostgreSQL setup, mock extraction without API quota, sample batch-review fixtures, and a walkthrough. The patient view runs at `http://localhost:3000`; staff review is at `/admin`.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | none | PostgreSQL connection string. |
| `ADMIN_PASSWORD` | none | Password for the review queue, partner view and waitlist admin. If unset, nobody can sign in. |
| `TOKEN_SECRET` | falls back to `ADMIN_PASSWORD` | Secret for hashing the anonymous daily token used by full reports and rate limits. |
| `LLM_PROVIDER` | `anthropic` | `anthropic`, `openai`, `cohere` or `mock`. |
| `LLM_MODEL` | `claude-opus-5-5` for anthropic, `command-r7b-12-2024` for cohere | Model id for the chosen provider. Required for `openai`. |
| `LLM_API_KEY` | none | API key for the chosen provider. Server-side only. |
| `EXPIRY_DAYS` | `30` | Days a listing stays live after it was last confirmed. |
| `WAITLIST_RADIUS_KM` | `8` | Concept: how far from the clinic an entry can be to get an offer. |
| `OFFER_BATCH_SIZE` | `3` | Concept: how many entries are offered a spot at once. |
| `OFFER_WINDOW_HOURS` | `72` | Concept: hours to reply before the offer moves on. |

Secrets never go in the repo. `.env` is git-ignored.

## The agents

The agents are in `lib/agent/`:

- `runtime.ts` is a small tool-use loop. With `LLM_PROVIDER=anthropic`, Claude chooses which tool to call next, up to 8 turns. It uses strict tool schemas and the API's server-side refusal fallback. With any other provider, a scripted planner calls the same tools in a fixed order, so the pipeline works offline and in tests. Every run is stored as a trace and shown to the reviewer.
- `intake.ts` has the tools `read_announcement` (the extraction module below), `find_matching_listings`, and three tools that end the run: `submit_new_listing`, `propose_update` (re-confirm or mark full) and `no_listing`. Each of those three only writes a pending listing or a proposal.
- `freshness.ts` has the tools `find_listings_needing_attention` (live listings expiring within 10 days, or with a "full" report), `propose_recheck` (with a priority and a call script) and `finish`.

Proposals are stored in the `agent_proposals` table. The only code that acts on them is `decideProposal` in `app/admin/actions.ts`, behind the reviewer's buttons.

The rules that need no judgement stay plain code: the expiry job hides listings past their date, and two separate "full" reports hide a listing straight away.

## Proactive discovery across Ontario

Listings can now originate from scheduled monitoring rather than waiting for someone to submit an announcement. `/admin/discovery` manages web-search leads, source approval, monitoring and collected evidence. English/French searches rotate across Ontario regions; approved clinic pages feed changed announcements into the existing intake agent. Directories discover links only, and social posts remain leads to a clinic's public site. Unchanged content creates no duplicate proposal and never refreshes availability.

Use **Add Ontario starter sources** to queue ten unverified starting URLs, or **Run offline Ontario demo** to try an invented Ottawa announcement without any network or LLM calls. Human approval is required before monitoring a new source and before publishing a listing. Monitoring permission and clinic-host verification for batch review are separate decisions.

See [Ontario discovery setup and limits](docs/ontario-discovery.md) for Tavily search configuration, hourly monitoring, the shared daily search budget, source review, network controls and the offline walkthrough. Live search is disabled until configured; monitoring can also run without a search API. Patient results use the configured nearby radius rather than mixing clinics from across the province. Postal-area data and starter URLs are credited in [data/SOURCES.md](data/SOURCES.md).

**Discovery workspace.** Search configuration, source leads and monitoring controls are shown separately from listing publication.

![Ontario discovery workspace showing starter source leads awaiting review and an offline demo](docs/screenshots/13-ontario-discovery.png)

**Collected evidence.** The source excerpt, retrieval time and declared publication date stay attached to the proposal. This screenshot uses the invented Ottawa demo rather than claiming a live search result.

![Collected sample Ottawa evidence with separate retrieval and publication dates and a link to its proposal](docs/screenshots/14-collected-evidence.png)

**Ontario patient search.** After a human publishes the sample Ottawa listing, it appears near `K1S`; Toronto listings fall outside the local search radius.

![Patient results near Ottawa K1S showing a clearly labelled sample clinic and approximate 75 kilometre search radius](docs/screenshots/15-ontario-results.png)

## Human review at scale

`/admin` separates **Ready for batch review**, **Needs investigation**, and **Needs clinic confirmation**. The batch workflow publishes new pending listings only. Existing-listing updates, re-confirmations, full recommendations and freshness checks remain individual decisions. The agents still have no publication tool.

A pilot administrator must verify a dedicated clinic host in Discovery or configure exact hostnames in `CLINIC_SOURCE_HOSTS`, for example `clinic-one.example,clinic-two.example`. Both start unconfigured: no host is implicitly trusted for batch publication. Subdomains must be configured separately. A source type or model confidence label never creates trust. Manual intake does not fetch its pasted link. The optional discovery collector records fetched source evidence separately. Reviewers must still check supporting sources.

A batch candidate must have all of the following:

- An HTTPS link on a configured clinic host, with source type Clinic website.
- Clinic, area, supported postal area, provider type, languages and a ten-digit North American phone number.
- High confidence in every extracted field, no uncertainty notes, and explicit acceptance of new patients.
- Literal support in the pasted text for clinic, area, postal area, provider type, languages, phone, an ISO evidence date, and “accepting new patients”. Negative wording routes it to individual review. These conservative text checks do not establish semantic correctness; alternate wording also goes to individual review.
- A valid evidence date within the last 14 days and within the configured expiry window.
- No full reports, pending proposals, or possible duplicates by normalized clinic name or phone, including other pending rows. Sample and real clinics are compared separately.

Reviewers select up to 100 candidates, inspect evidence, exclude rows as needed, and explicitly authorize the selected set. No rows start selected. A spot check helps assess batch quality; it does not verify every row. The server reloads all selected rows, compares their versions and re-runs eligibility inside a serializable database transaction. A stale or newly ineligible row cancels the whole batch, leaving every selection unpublished. Repeated or concurrent approvals cannot create a second publication decision.

Batch publication uses the original evidence date to calculate expiry, matching individual review so the date also displays correctly in Toronto; approving an old notice never makes it fresh today. Individual re-confirmations also require an explicit valid evidence/confirmation date rather than silently defaulting to today. For a freshness phone check, the reviewer's “still taking patients” response records a clinic confirmation today.

The `review_decisions` table retains the selected versions, original listing/evidence snapshots, publication dates, policy, source-host configuration and approval time. Individual new-listing publications are recorded too. The admin page shows the ten most recent publication decisions. This is application history, not a tamper-proof compliance log. The current shared password records the actor as `shared_admin`; individual reviewer accounts and clinic self-confirmation remain follow-up work.

Deploy the new migration with `npm run db:migrate` before running the updated app. No real source hostnames are enabled by this change.

### Database regression checks

`npm test` runs the policy checks and existing tests. Database tests are opt-in and create/drop a uniquely named schema, leaving existing schemas untouched:

```bash
REVIEW_TEST_DATABASE_URL=postgresql://user:password@localhost:5432/doctorfinder npm test
```

Use a development database where the test user may create schemas. These checks cover publication, excluded rows, original dates, snapshots, stale evidence, new reports, new duplicates, source-policy changes, all-or-nothing rollback, repeated approval and concurrent reviewers.

## The extraction module

The intake agent's `read_announcement` tool is `lib/extract.ts`: one call per announcement, using the provider's structured JSON output with the schema in that file. The prompt says the announcement is data and not instructions, and tells the model to return null rather than guess. `normalize()` re-checks whatever comes back, so an invalid date or postal area becomes null with low confidence.

To add a provider, add a `via…` function there and a branch in `extractListing`. Nothing else in the app knows which provider is in use.

## Running the eval

```bash
npm run eval
```

This reads `eval/announcements.jsonl`, runs each announcement through `lib/extract.ts` with whatever provider your environment points at, scores location, provider type, languages and date, and writes `eval/results.md` with accuracy per field and every mistake.

The file has **15 real public announcements** from Toronto clinic websites, a community news article, and family health teams elsewhere in Ontario. Each text is an exact excerpt of the page, with the `source` URL and the date it was retrieved. Some excerpts join lines from different parts of the same page, such as the notice and the address in the footer. `label_note` explains any label a reviewer might question. The location labels now follow Ontario coverage and the explicit-postal-code extraction rule: no neighbouring FSA is substituted and missing codes stay null. Source text is unchanged. Check labels before publishing results; staff languages versus doctors' languages remains a judgement call.

The 3 original invented examples are in `eval/synthetic.jsonl`. Run them with `npm run eval -- eval/synthetic.jsonl`, which writes `eval/synthetic-results.md`.

To add an example, add one JSON object per line:

```json
{"id":"real-16","source":"https://…","retrieved":"2026-11-11","today":"2026-11-11","text":"…the announcement…","expected":{"fsa":"M4C","provider_type":"family_doctor","languages":["English","Bengali"],"date":"2026-11-02"},"label_note":""}
```

`fsa` is the first 3 postal characters (one of the areas in `lib/fsa.ts`) or null. `date` is null when the text alone does not settle it; returning null there is the correct answer. `today` is the date given to the model for reference.

To run it with Cohere, set these in `.env` (the eval needs no database):

```dotenv
LLM_PROVIDER="cohere"
LLM_MODEL="command-a-plus-05-2026"
LLM_API_KEY="your Cohere key"
```

Set `LLM_MODEL` explicitly. A model name copied from another provider makes every call fail.

### Results

The committed `eval/results.md` is one run of Cohere Command A+ (`command-a-plus-05-2026`) on the 15 real announcements. All 15 were scored and none failed.

| Field | Correct | Accuracy |
| --- | --- | --- |
| location | 15 of 15 | 100% |
| provider type | 11 of 15 | 73% |
| languages | 15 of 15 | 100% |
| date | 15 of 15 | 100% |

All 4 misses (real-01, real-03, real-04, real-06) expected a family doctor and got "unknown" at low confidence, so they would go to individual review rather than batch publication. real-01 and real-06 contain no word such as doctor, physician or Dr., so their labels may be the question rather than the model. The labels have not been changed.

Read these numbers with care:

- 15 announcements is a small set: one mistake moves a field by about 7 points.
- It is a single run. Repeated runs of the smaller model below gave different results.
- The location score is the model plus a plain-code check. `normalize()` drops any postal area that the announcement does not state word for word, with low location confidence. All 7 expected postal areas in the real set appear in the text, so the check breaks none of them. How many of Command A+'s answers it changed was not recorded.

For comparison, Cohere `command-r7b-12-2024` on the same 15, before the postal-area check, scored location 73%, provider type 87%, languages 93% and date 80%. Its typical mistake was filling in a postal area or today's date that the text does not state, often with high confidence. That is why the check exists. With the check it scored location 100%, provider type 93%, languages 100% and date 73%.

On the 3 invented examples (`eval/synthetic-results.md`), Command A+ got provider type, languages and date right and location wrong in all 3. It returned null because those texts give only a neighbourhood, never a postal code. Their location labels predate the "explicitly stated" rule, so the labels, not the model, are out of date.

## Jobs

```bash
npm run job:expire      # marks live listings past EXPIRY_DAYS as expired
npm run job:freshness   # freshness agent: proposes re-checks for listings near expiry or reported full
npm run job:waitlist    # concept: reminders, closed reply windows, 30-day check-ins (sample rows only)
```

All three also have a "run now" button on the admin screens. Patients never see a listing past its expiry date even before the job runs; the job makes the status change permanent.

## Privacy

- No patient accounts. No names, health card numbers or health information are asked for or stored.
- The patient's plan (which clinics they opened and what they reported) lives in `sessionStorage` in their browser and is never sent to the server.
- The only patient-side data stored is `daily_counts`: counters by date, postal area and language.
- A full report or a language report stores a hash of (secret, date, network address) that changes daily and cannot be reversed. A language report keeps only the listing, the language and the answer. The address itself is never stored or logged. A listing is hidden after 2 separate reports, and the endpoint is limited to 10 reports an hour per token.
- Staff can paste announcements. Optional discovery collects approved public HTML pages under robots.txt and network limits; source content and retrieval times are retained as evidence. No private groups or login-only content is collected.

## Tests

```bash
npm test          # ranking weights, review rule, prompt wording, translation completeness
npm run typecheck
```

## Deploying to DigitalOcean App Platform

The spec is `.do/app.yaml`: one web service and a `PRE_DEPLOY` job that runs migrations and the seed, in the Toronto region, with deploy on push. For the demo there are no scheduled jobs: expiry, freshness, waitlist check-ins and discovery run from their buttons on the admin screens (or `npm run job:*`). To schedule them for a pilot, add `SCHEDULED` jobs to the spec that run those same commands. The database is a free [Neon](https://neon.tech) PostgreSQL project, connected through the `DATABASE_URL` secret, so there is no paid DigitalOcean database.

**Before the first deploy, check three things in the spec:** the `github.repo` and `branch` (it deploys `main`). The spec sets `LLM_PROVIDER=cohere` and `LLM_MODEL=command-a-plus-05-2026`, so `LLM_API_KEY` must be a Cohere key. With Cohere the freshness check runs its tools in a fixed order. The spec was written without access to DigitalOcean's docs or an account, so `doctl apps spec validate .do/app.yaml` should be the first command you run.

This creates paid resources on DigitalOcean: the web service and job run time. Neon's free plan covers the database for a demo.

```bash
doctl auth init                                   # paste your DigitalOcean token
doctl apps spec validate .do/app.yaml

# 1. The database: create a free project at neon.tech (any region near Toronto) and copy its
#    direct connection string (connection pooling off; it ends in ?sslmode=require).

# 2. The app. DigitalOcean must already have access to the GitHub repo.
#    The first deploy fails at the migration step until DATABASE_URL is set; that is expected.
doctl apps create --spec .do/app.yaml

# 3. Secrets: in the console, open the app → Settings → App-Level Environment Variables,
#    set DATABASE_URL (the Neon string), LLM_API_KEY (your Cohere key), TAVILY_API_KEY,
#    ADMIN_PASSWORD and TOKEN_SECRET, tick Encrypt, and save. That triggers a deploy that
#    runs the migrations and the sample data.
```

### Redeploying

- Push to `main`. Deploy on push rebuilds the web service and jobs, and the pre-deploy job runs migrations and the seed (the seed only adds sample data that is missing).
- After editing `.do/app.yaml`: `doctl apps update <app-id> --spec .do/app.yaml`. Find the id with `doctl apps list`. Updating from the committed spec can clear secrets that were set in the console, so re-enter them afterwards or update from a local copy that includes them.
- To force a rebuild: `doctl apps create-deployment <app-id> --force-rebuild`.
- Schema changes: edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <what-changed>` locally, commit the new folder under `prisma/migrations`.

## What is not done

- The eval set has 15 of 20 real announcements and one Command A+ run. The 3 synthetic examples still have location labels from before the "explicitly stated" rule.
- Translations for the new screens are drafts. See `docs/translations-to-review.md`.
- The rate limiter is in memory, which is fine for one web instance and not for several.
- Postal-area coordinates are a snapshot, not an authoritative address directory. Unknown areas show a notice and do not fall back to Toronto.
- The waitlist concept has no reply simulation for the 30-day check-in (keep waiting, switch area, leave); the message is shown in the outbox only.

`reference/demo.html` is the original single-file clickable demo the screens and wording were ported from.
