import { createFileRoute } from "@tanstack/react-router";
import { PmChatView } from "@/lib/decisionbridge-views";
import { RoleGate } from "@/lib/role-gate";

export const Route = createFileRoute("/_authenticated/pm")({
  head: () => ({ meta: [{ title: "PM decision chat · DecisionBridge" }] }),
  component: () => (
    <RoleGate role="pm">
      <main className="shell">
        <section className="app-card">
          <PmChatView />
        </section>
      </main>
    </RoleGate>
  ),
});
