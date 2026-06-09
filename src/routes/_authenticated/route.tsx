import { useEffect, useState } from "react";
import { createFileRoute, Outlet, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { clearRole, getRole } from "@/lib/local-auth";
import { useRole } from "@/lib/use-roles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const navigate = useNavigate();
  const role = useRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getRole()) navigate({ to: "/auth", replace: true });
  }, [navigate]);

  const signOut = () => {
    clearRole();
    router.navigate({ to: "/auth", replace: true });
  };

  if (!mounted) {
    return <div className="db-root" />;
  }

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    expert: "Expert",
    pm: "Project Manager",
  };

  return (
    <div className="db-root">
      <header className="app-nav">
        <strong>DecisionBridge</strong>
        <nav>
          {role === "admin" && <Link to="/admin" activeProps={{ className: "active" }}>Admin</Link>}
          {role === "expert" && <Link to="/expert" activeProps={{ className: "active" }}>Expert workspace</Link>}
          {role === "pm" && <Link to="/pm" activeProps={{ className: "active" }}>Decision chat</Link>}
        </nav>
        <div className="nav-right">
          <span className={`role-badge role-${role}`}>{roleLabel[role ?? ""] ?? role}</span>
          <button onClick={signOut} className="sign-out-btn">Switch role</button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
