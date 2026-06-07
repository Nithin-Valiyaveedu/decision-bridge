import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Home,
});

function Home() {
  const [msg, setMsg] = useState("Loading your workspace…");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        window.location.replace("/auth");
        return;
      }
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      const roles = (rows ?? []).map((r) => r.role);
      const target = roles.includes("admin")
        ? "/admin"
        : roles.includes("expert")
          ? "/expert"
          : roles.includes("pm")
            ? "/pm"
            : null;
      if (target) window.location.replace(target);
      else setMsg("No roles assigned. Contact an administrator.");
    })();
  }, []);

  return (
    <div className="db-root">
      <main className="shell">
        <section className="app-card" style={{ padding: 40, textAlign: "center" }}>
          {msg}
        </section>
      </main>
    </div>
  );
}
