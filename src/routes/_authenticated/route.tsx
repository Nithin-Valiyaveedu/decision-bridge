import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { clearRole, getRole } from "@/lib/local-auth";
import { useRole } from "@/lib/use-roles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (!getRole()) throw redirect({ to: "/auth" });
  },
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
        <strong>DecisionBridge</strong>
        <nav>
          {role === "admin" && <Link to="/admin" activeProps={{ className: "active" }}>Admin setup</Link>}
          {role === "expert" && <Link to="/expert" activeProps={{ className: "active" }}>Expert workspace</Link>}
          {role === "pm" && <Link to="/pm" activeProps={{ className: "active" }}>PM decision chat</Link>}
        </nav>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#666" }}>
          Signed in as <strong>{role}</strong>
        </span>
        <button onClick={signOut} className="sign-out-btn">Sign out</button>
      </header>
      <Outlet />
    </div>
  );
}
