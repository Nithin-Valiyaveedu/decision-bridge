import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./use-roles";

export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const [state, setState] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setState("denied");
        return;
      }
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", role);
      setState(rows && rows.length > 0 ? "allowed" : "denied");
    })();
  }, [role]);

  if (state === "loading") {
    return (
      <main className="shell">
        <section className="app-card" style={{ padding: 40, textAlign: "center" }}>Checking access…</section>
      </main>
    );
  }
  if (state === "denied") {
    return (
      <main className="shell">
        <section className="app-card" style={{ padding: 40 }}>
          <h2>Access denied</h2>
          <p>You don't have the <strong>{role}</strong> role required to view this page.</p>
          <p>Ask an administrator to grant you access. <Link to="/">Go back</Link>.</p>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}
