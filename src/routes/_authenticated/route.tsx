import { useEffect, useState } from "react";
import { createFileRoute, Outlet, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { clearRole, getRole } from "@/lib/local-auth";
import { useRole } from "@/lib/use-roles";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const role = useRole();

  const signOut = () => {
    clearRole();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="db-root">
      <header className="app-nav">
        <strong>Collaborative Insight</strong>
        <nav>
          {role === "admin" && <Link to="/admin" activeProps={{ className: "active" }}>Admin</Link>}
          {role === "expert" && <Link to="/expert" activeProps={{ className: "active" }}>Expert workspace</Link>}
          {role === "pm" && <Link to="/pm" activeProps={{ className: "active" }}>Decision chat</Link>}
        </nav>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--t3, #475569)", fontFamily: "var(--fm, monospace)" }}>
          role: <strong style={{ color: "var(--t2, #94a3b8)" }}>{role}</strong>
        </span>
        <button onClick={signOut} className="sign-out-btn">Sign out</button>
      </header>
      <Outlet />
    </div>
  );
}
