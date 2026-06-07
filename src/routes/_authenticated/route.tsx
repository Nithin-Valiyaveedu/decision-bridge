import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setRoles((rows ?? []).map((r) => r.role));
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="db-root">
      <header className="app-nav">
        <strong>DecisionBridge</strong>
        <nav>
          {roles.includes("admin") && <Link to="/admin" activeProps={{ className: "active" }}>Admin setup</Link>}
          {roles.includes("expert") && <Link to="/expert" activeProps={{ className: "active" }}>Expert workspace</Link>}
          {roles.includes("pm") && <Link to="/pm" activeProps={{ className: "active" }}>PM decision chat</Link>}
        </nav>
        <button onClick={signOut} className="sign-out-btn">Sign out</button>
      </header>
      <Outlet />
    </div>
  );
}
