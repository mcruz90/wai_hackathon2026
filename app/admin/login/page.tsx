import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="wrap">
      <main className="stack">
        <form className="card" action={login}>
          <h1>Staff sign in</h1>
          <p className="muted small">For reviewers and partners. Patients do not need to sign in.</p>
          {sp.error ? <p className="err" role="alert">That password is not right.</p> : null}
          {process.env.ADMIN_PASSWORD ? null : <p className="err">ADMIN_PASSWORD is not set, so nobody can sign in.</p>}
          <input type="hidden" name="next" value={sp.next || "/admin"} />
          <div><label className="lbl" htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" style={{ width: "100%", border: "2px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "var(--surface)" }} /></div>
          <button className="btn" type="submit">Sign in</button>
        </form>
        <a href="/">← Patient view</a>
      </main>
    </div>
  );
}
