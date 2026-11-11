// Loads .env for scripts run outside Next.js. A missing file is fine (production uses real environment variables).
try { process.loadEnvFile(".env"); } catch {}
