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
        <section className="app-card auth-card">
          <div className="auth-hero">
            <div className="logo-mark auth-logo">DB</div>
            <h1 className="auth-title">DecisionBridge</h1>
            <p className="auth-subtitle">AI-powered decision intelligence for engineering teams</p>
          </div>

          <div className="auth-body">
            <p className="auth-prompt">Choose a demo role to explore the platform</p>
            <div className="auth-roles">
              <button type="button" className="role-card role-admin" onClick={() => quickPick("admin")}>
                <div className="role-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div className="role-text">
                  <strong>Admin</strong>
                  <span>Manage team members and review all decisions</span>
                </div>
                <div className="role-arrow">→</div>
              </button>

              <button type="button" className="role-card role-expert" onClick={() => quickPick("expert")}>
                <div className="role-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <div className="role-text">
                  <strong>Expert</strong>
                  <span>Contribute knowledge and review evidence</span>
                </div>
                <div className="role-arrow">→</div>
              </button>

              <button type="button" className="role-card role-pm" onClick={() => quickPick("pm")}>
                <div className="role-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div className="role-text">
                  <strong>Project Manager</strong>
                  <span>Ask decisions and track outcomes</span>
                </div>
                <div className="role-arrow">→</div>
              </button>
            </div>
            <p className="auth-footnote">
              This is a demo — your role is stored locally in your browser. No real authentication required.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
