# Try the app locally before deployment

Use Node 22 and Docker Desktop (or Docker Engine with Compose). This runs a development app and local PostgreSQL database on your computer. DigitalOcean is not involved.

```bash
git clone https://github.com/mcruz90/wai_hackathon2026.git
cd wai_hackathon2026
git switch codex/ontario-discovery  # use main after this change is merged
cp .env.example .env
```

Edit `.env` before continuing:

```dotenv
DATABASE_URL="postgresql://doctor:doctor@localhost:5432/doctorfinder"
ADMIN_PASSWORD="choose-a-local-review-password"
TOKEN_SECRET="choose-a-long-random-local-secret"
LLM_PROVIDER="mock"
CLINIC_SOURCE_HOSTS="demo-clinic.example"
```

`mock` makes no LLM calls, uses no API quota, and needs no API key. It is an offline keyword reader, so extraction quality is not representative of Claude. The `.example` host above is an invented demo source and must be removed when configuring real pilot sources. Restart the app after changing environment variables.

```bash
docker compose up -d --wait db
npm ci
npm run db:migrate
npm run db:seed
npm run db:seed:review-demo
npm run dev
```

Open **http://localhost:3000** for the patient journey and **http://localhost:3000/admin** for staff review. Sign in with `ADMIN_PASSWORD` from your own `.env`. The partner and waitlist views use that password too.

Prisma downloads its official database engines during installation and migration. If your computer has a restricted network, allow `binaries.prisma.sh` as well as the npm registry. The temporary cloud preview may use Prisma's JavaScript driver when that engine host is unavailable; these local instructions use the repository's normal setup.

## What to try

1. In the patient view, search near `M1P`, change language, open a listing, and build a call plan.
2. In `/admin`, check the three review queue counts. The review demo adds two batch candidates, one listing with no evidence date, and a clinic confirmation task.
3. Open the supporting announcement for a batch candidate. These are explicitly invented fixtures with placeholder source links, prepared to exercise the interface; their confidence badges do not demonstrate model accuracy.
4. Select both candidates, then exclude one. The publication count should change and authorization should reset whenever the selection changes.
5. Authorize and publish the selected listing. Check that it appears in patient results with yesterday's evidence date, while the excluded listing remains pending.
6. Open the recent publication decision to inspect the approved version and evidence snapshot.
7. In individual review, verify the undated listing requires a date before it can be published. You can still reject it without filling the form.
8. In clinic confirmation, record the sample outcome or dismiss the task. No clinic is contacted automatically.
9. Paste an announcement into intake to exercise the mock reader and individual-review path. The mock reader is deliberately cautious, so it will usually produce an exception rather than a batch candidate.
10. Visit `/admin/discovery` and use the [offline Ontario discovery walkthrough](ontario-discovery.md#offline-ontario-walkthrough). It adds a sample Ottawa source, asks for source approval, and prepares a pending Ontario listing without network or LLM calls. You can publish it individually and search `K1S`.
11. Try a narrow browser window or your browser's mobile device mode.

All seeded clinics, numbers, patients and announcements are invented. No messages are sent. The app's real expiry and publication logic still runs against this local database.

## Resetting and stopping

To restore just the three review fixtures and sample clinic check:

```bash
npm run db:seed:review-demo
```

That command refuses to replace a non-sample listing, does not change real listings, and preserves publication history. `npm run db:seed -- --refresh` separately refreshes the main sample directory dates.

Stop the app with Ctrl+C. Stop the development database with `docker compose stop db`; your data stays in the Docker volume. Restart it with `docker compose up -d --wait db`. The database port is bound to `127.0.0.1`, so it is local to your computer. If port 5432 is already in use, change the Compose port mapping and the matching port in `DATABASE_URL`.

## Checks before deployment

```bash
npm test
npm run typecheck
npm run build
REVIEW_TEST_DATABASE_URL="postgresql://doctor:doctor@localhost:5432/doctorfinder" npm test
```

The last command creates and drops a uniquely named test schema. It does not clear the app's existing schemas. Before a real pilot, replace the mock provider and demo source host with reviewed production configuration and run the extraction evaluation against a real model.
