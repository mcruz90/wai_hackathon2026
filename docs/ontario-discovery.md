# Ontario discovery and monitoring

The directory supports 527 distinct Ontario postal areas across K, L, M, N and P districts. Approximate representative points are credited to GeoNames in [data/SOURCES.md](../data/SOURCES.md). The source snapshot has 530 Ontario rows; repeated rows for one FSA were grouped. This is not an authoritative address directory. Newly introduced or unlisted codes need a data update. An unknown location never becomes Toronto: the patient sees a location notice instead of fabricated distances. Patient results use a configurable 75 km radius around the known postal-area point.

## Workflow

1. Web search discovers public clinic announcements throughout Ontario. English/French queries rotate across eastern, central, southwestern and northern regions.
2. Search results and links found on approved pages enter **Discover clinics → Source review**. They are not scraped, trusted or published on discovery alone.
3. A reviewer classifies each source as a clinic page or directory and authorizes monitoring. Verifying a dedicated clinic website host for batch review is a separate, optional decision. Directories never confer batch trust. Social links remain leads; add the clinic's linked public website instead.
4. The collector checks robots.txt, fetches approved public HTML pages, records a source excerpt and hash, and follows relevant links into source review. Directories generate links only, preventing a list of several clinics from becoming one misleading listing.
5. A changed clinic announcement goes through the existing intake tool-use pipeline. It proposes a pending listing, an existing-listing update, or no listing. Duplicate matching includes pending listings and separates sample from real data.
6. Humans publish eligible batches or investigate exceptions. The agents have no publication tool.

Retrieval time and the page's declared publication date are separate evidence fields. Merely fetching a page again never re-confirms availability or extends expiry. Unchanged evidence and previously seen content hashes do not make more LLM calls or duplicate proposals. Changed availability can propose marking a clinic full; it cannot make that status change itself.

## Starting without a search API

Use **Add Ontario starter sources** in `/admin/discovery`, or run:

```bash
npm run db:seed:discovery
```

This adds ten public starting URLs from Toronto, Ottawa, Thunder Bay, Barrie, Hamilton and the Thames Valley. They are explicitly unverified leads. The command makes no external requests, checks no current availability, and preserves existing approvals, pauses and rejections. Review each relevant page, classify directories correctly, and approve monitoring. This is enough to monitor known pages without a search provider. Manual intake remains available as a fallback.

## Enable automated discovery

Apply the migration and seed postal areas first:

```bash
npm run db:migrate
npm run db:seed
```

Set server-side environment variables:

```dotenv
DISCOVERY_ENABLED=true
DISCOVERY_SEARCH_PROVIDER=brave
BRAVE_SEARCH_API_KEY=<set securely in environment settings>
SEARCH_RADIUS_KM=75
```

The API key belongs in your local git-ignored `.env` or encrypted DigitalOcean environment settings. Never commit it or paste it into chat. `DISCOVERY_SEARCH_PROVIDER=off` disables web search while retaining approved-page monitoring.

`.do/app.yaml` includes an hourly discovery job at ten past the hour. Scheduled collection defaults disabled until `DISCOVERY_ENABLED=true`; the explicit staff “Search and monitor now” action can run approved monitoring independently. Search has a shared database budget of at most three queries every 24 hours, including manual runs, with a one-hour retry window after failure. A run checks at most 20 due sources; each source is normally revisited after 24 hours. The staff action checks at most three sources to keep manual runs smaller. A source lease prevents concurrent workers from processing it twice. Increase capacity deliberately as the reviewed source set grows.

Allow outbound HTTPS to `api.search.brave.com` and approved source hosts in restricted environments. The collector preserves configured proxy and CA settings. On DigitalOcean, source pages must be publicly reachable. Live provider and clinic requests need operational validation in the deployment environment; the offline demo does not establish live search coverage or website compatibility.

## Collection boundaries

- Public HTTPS HTML only, without credentials or custom ports. No login, CAPTCHA, private groups, browser automation, form submission, or direct social-platform crawling.
- Private, loopback, link-local, reserved and metadata-service addresses are blocked. Direct connections use validated DNS answers; configured proxies enforce their own destination routing. Cross-host redirects return to source review. Redirected paths must also satisfy robots.txt.
- robots.txt is checked before page collection. Errors defer collection; a missing robots file permits it. Crawl delays up to ten seconds are observed; larger requested delays defer to manual review. Time, redirect, response-size, page-count and search budgets bound each run.
- Scripts, navigation, forms and common hidden elements are removed. Evidence excerpts are limited to 6,000 characters. JavaScript-rendered pages, PDFs and some social content will not be collected by this version.
- Source content is untrusted data in the intake prompt. Literal support, model confidence and a known host do not independently establish truth; humans review evidence and uncertain dates.
- Network failures appear on the source and retry after an hour. A failed intake retains its evidence and error; the same hash is not blindly re-submitted to the model. Review the evidence and use manual intake if necessary. Source collection history is retained when monitoring is paused or rejected.

## Offline Ontario walkthrough

In `/admin/discovery`:

1. Click **Run offline Ontario demo** to add an invented Ottawa source.
2. Classify it as a clinic and authorize monitoring. Sample sources cannot confer batch trust.
3. Run the offline demo again. It processes a fixture page without any network or LLM calls, even when the production provider is Anthropic.
4. Follow the collected evidence to its pending Ottawa listing in `/admin`. The mock reader's uncertainty note keeps it in individual review.
5. Review the sample fields, publish individually, and search `K1S` in the patient view. Toronto sample clinics are outside the local search radius.
6. Run the demo again: unchanged evidence creates no new candidate and does not refresh availability.

All demo data is flagged Sample and uses a non-resolving `.example` URL. Real starter sources and real monitored clinics remain separate.

## Validation

```bash
npm test
npm run typecheck
REVIEW_TEST_DATABASE_URL=postgresql://user:password@localhost:5432/doctorfinder npm test
```

Database tests use a fresh temporary schema and the real offline intake pipeline. They exercise source review, daily search budgets, provenance, Ontario extraction, unchanged content, changed availability, duplicate and concurrent work, directory/social handling, errors, pausing and the sample-only demo. Unit checks cover Ontario coordinates, URL/IP rules, robots behavior, HTML parsing, hashing and regional query rotation.
