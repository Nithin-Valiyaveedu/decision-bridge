import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in · DecisionBridge" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/", replace: true });
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="db-root">
      <main className="shell">
        <section className="app-card" style={{ maxWidth: 480, margin: "60px auto" }}>
          <header className="app-header">
            <div className="brand-row">
              <div className="logo-mark">DB</div>
              <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
            </div>
          </header>
          <section className="view">
            <form onSubmit={submit} className="panel">
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <label>Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <div className="notice" style={{ color: "#b00020" }}>{error}</div>}
              <button disabled={loading} type="submit">
                {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
              </button>
              <p style={{ marginTop: 12, fontSize: 14 }}>
                {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  style={{ background: "none", color: "#1746a2", padding: 0, cursor: "pointer", textDecoration: "underline" }}
                >
                  {mode === "signin" ? "Create account" : "Sign in"}
                </button>
              </p>
              <p style={{ fontSize: 12, color: "#666", marginTop: 16 }}>
                New accounts get the <strong>PM</strong> role by default. Admin/Expert roles must be granted by an administrator in the backend.
              </p>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}
