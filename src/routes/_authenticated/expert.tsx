import { createFileRoute } from "@tanstack/react-router";
import { ExpertView } from "@/lib/decisionbridge-views";
import { RoleGate } from "@/lib/role-gate";

export const Route = createFileRoute("/_authenticated/expert")({
  head: () => ({ meta: [{ title: "Expert workspace · DecisionBridge" }] }),
  component: () => (
    <RoleGate role="expert">
      <main className="shell">
        <section className="app-card">
          <ExpertView />
        </section>
      </main>
    </RoleGate>
  ),
});
