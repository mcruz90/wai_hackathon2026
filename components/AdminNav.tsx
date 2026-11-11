import { logout } from "@/app/admin/actions";

export default function AdminNav() {
  return (
    <nav className="nav">
      <a href="/admin">Intake and review</a>
      <a href="/partner">Partner view</a>
      <a href="/admin/waitlist">Waitlist concept</a>
      <a href="/">Patient view</a>
      <form action={logout}><button className="btn link" type="submit">Sign out</button></form>
    </nav>
  );
}
