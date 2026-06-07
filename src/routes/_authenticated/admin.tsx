import { createFileRoute } from "@tanstack/react-router";
import { AdminView } from "@/lib/decisionbridge-views";
import { RoleGate } from "@/lib/role-gate";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin setup · DecisionBridge" }] }),
  component: () => (
    <RoleGate role="admin">
      <main className="shell">
        <section className="app-card">
          <AdminView />
        </section>
      </main>
    </RoleGate>
  ),
});
