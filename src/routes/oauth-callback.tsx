import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/oauth-callback")({
  ssr: false,
  component: OAuthCallback,
});

function OAuthCallback() {
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const error = params.get("error");
    if (window.opener) {
      window.opener.postMessage(
        { type: "gmail-oauth", accessToken, error },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#444" }}>
      <p>Connecting…</p>
    </div>
  );
}
