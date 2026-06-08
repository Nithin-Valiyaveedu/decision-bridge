import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Collaborative Insight — Infineon" },
      { name: "description", content: "Turn siloed expert knowledge into structured, auditable decisions. Built for Infineon's engineering teams." },
      { name: "author", content: "Infineon Technologies" },
      { property: "og:site_name", content: "Collaborative Insight" },
      { property: "og:title", content: "Collaborative Insight — Infineon" },
      { property: "og:description", content: "Expert knowledge → structured decisions. Capture, translate, and act on engineering expertise at scale." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://decision-bridge.vercel.app" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Collaborative Insight" },
      { name: "twitter:description", content: "Expert knowledge → structured decisions." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>404</div>
        <p style={{ color: "#64748b", margin: "12px 0 24px", fontSize: 15 }}>Page not found.</p>
        <a href="/" style={{ color: "#009b3a", fontWeight: 600, fontSize: 14 }}>← Go home</a>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    console.error(error);
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Something went wrong</div>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>{error?.message ?? "An unexpected error occurred."}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{ padding: "8px 18px", borderRadius: 8, background: "#009b3a", color: "#fff", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: "8px 18px", borderRadius: 8, background: "#fff", color: "#334155", border: "1px solid #e2e8f0", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  },
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
