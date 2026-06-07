import { createFileRoute, redirect } from "@tanstack/react-router";
import { getRole } from "@/lib/local-auth";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    const role = getRole();
    if (!role) throw redirect({ to: "/auth" });
    if (role === "admin") throw redirect({ to: "/admin" });
    if (role === "expert") throw redirect({ to: "/expert" });
    throw redirect({ to: "/pm" });
  },
  component: () => null,
});
