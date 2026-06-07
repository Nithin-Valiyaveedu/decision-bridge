import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useRole, type AppRole } from "./use-roles";

export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const current = useRole();
  if (current === null) {
    return (
      <main className="shell">
        <section className="app-card" style={{ padding: 40, textAlign: "center" }}>
          Not signed in. <Link to="/auth">Go to sign in</Link>.
        </section>
      </main>
    );
  }
  if (current !== role) {
    return (
      <main className="shell">
        <section className="app-card" style={{ padding: 40 }}>
          <h2>Access denied</h2>
          <p>This page requires the <strong>{role}</strong> role. You are signed in as <strong>{current}</strong>.</p>
          <p><Link to="/">Go back</Link></p>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}
