import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { getRole, setRole, type AppRole } from "@/lib/local-auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in · DecisionBridge" }] }),
  component: AuthPage,
});

const roleHome: Record<AppRole, "/admin" | "/expert" | "/pm"> = {
  admin: "/admin",
  expert: "/expert",
  pm: "/pm",
};

function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    const r = getRole();
    if (r) router.navigate({ to: roleHome[r], replace: true });
  }, [router]);

  const quickPick = (role: AppRole) => {
    setRole(role);
    router.navigate({ to: roleHome[role], replace: true });
  };

  return (
    <div className="db-root">
      <main className="shell">
        <section className="app-card" style={{ maxWidth: 480, margin: "60px auto" }}>
          <header className="app-header">
            <div className="brand-row">
              <div className="logo-mark">DB</div>
              <h1>Demo sign in</h1>
            </div>
          </header>
          <section className="view">
            <div className="panel">
              <p style={{ marginTop: 0, fontWeight: 600 }}>Quick demo access</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => quickPick("admin")}>Enter as Admin</button>
                <button type="button" onClick={() => quickPick("expert")}>Enter as Expert</button>
                <button type="button" onClick={() => quickPick("pm")}>Enter as PM</button>
              </div>
              <p style={{ fontSize: 12, color: "#666", marginTop: 12 }}>
                Demo only — role is stored in your browser's localStorage. No real authentication.
              </p>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
