import { createFileRoute, redirect } from "@tanstack/react-router";
import { getRole } from "@/lib/local-auth";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    const role = getRole();
    if (role === "admin") throw redirect({ to: "/admin" });
    if (role === "expert") throw redirect({ to: "/expert" });
    if (role === "pm") throw redirect({ to: "/pm" });
    // No role → show landing page
  },
  component: LandingPage,
});

// ─── Score arc ──────────────────────────────────────────────────────────────

function ScoreMeter({ score }: { score: number }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg viewBox="0 0 200 200" className="lp-score-svg" aria-label={`${score}% readiness`}>
      {/* Track */}
      <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
      {/* Filled arc */}
      <circle
        cx="100" cy="100" r={r}
        fill="none"
        stroke="#009b3a"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 100 100)"
        style={{ transition: "stroke-dashoffset 30ms linear" }}
      />
      {/* Glow arc (wider, blurred via filter) */}
      <circle
        cx="100" cy="100" r={r}
        fill="none"
        stroke="rgba(0,180,68,0.25)"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 100 100)"
        style={{ filter: "blur(6px)", transition: "stroke-dashoffset 30ms linear" }}
      />
      <text x="100" y="95" textAnchor="middle" className="lp-score-num">{score}%</text>
      <text x="100" y="114" textAnchor="middle" className="lp-score-sub-text">READINESS</text>
    </svg>
  );
}

// ─── Connector data ──────────────────────────────────────────────────────────

const CONNECTORS = [
  { name: "Gmail",   bg: "#ea4335", letter: "G" },
  { name: "Jira",    bg: "#0052cc", letter: "J" },
  { name: "Slack",   bg: "#611f69", letter: "S" },
  { name: "Teams",   bg: "#4f52b2", letter: "T" },
  { name: "Notion",  bg: "#191919", letter: "N" },
  { name: "GitHub",  bg: "#24292e", letter: "⌥" },
  { name: "Zoom",    bg: "#2d8cff", letter: "Z" },
  { name: "Meet",    bg: "#00897b", letter: "M" },
];

// ─── Hero words ──────────────────────────────────────────────────────────────

const HERO_LINE1 = [
  { text: "Expert", d: 0.05 },
  { text: "knowledge.", d: 0.18 },
];
const HERO_LINE2 = [
  { text: "Structured", d: 0.35 },
  { text: "decisions.", d: 0.48 },
];
const HERO_LINE3 = [
  { text: "Easy", d: 0.65 },
  { text: "translation.", d: 0.78 },
];

// ─── Flow animation (pure React/CSS, cycles through 4 steps) ─────────────────

const FLOW_SCENES = [
  {
    step: "01", heading: "Capture expert knowledge",
    sub: "AI extracts structured findings from your existing tools",
    content: (
      <div className="fa-chips">
        {[{l:"G",bg:"#ea4335",n:"Gmail"},{l:"J",bg:"#0052cc",n:"Jira"},{l:"S",bg:"#611f69",n:"Slack"},{l:"T",bg:"#4f52b2",n:"Teams"}].map((c,i)=>(
          <div key={c.n} className="fa-chip" style={{animationDelay:`${i*0.15}s`}}>
            <span className="fa-chip-icon" style={{background:c.bg}}>{c.l}</span>
            <span className="fa-chip-name">{c.n}</span>
          </div>
        ))}
        <div className="fa-arrow">→</div>
        <div className="fa-kb">📋 Knowledge base</div>
      </div>
    ),
  },
  {
    step: "02", heading: "Detect expert conflicts automatically",
    sub: "Surfaces disagreements before the PM decides",
    content: (
      <div className="fa-conflict">
        <div className="fa-expert fa-approve">
          <div className="fa-expert-tag green">✓ Supports</div>
          <div className="fa-expert-name">Dr. Müller</div>
          <div className="fa-expert-note green">Conditional approval</div>
        </div>
        <div className="fa-badge">
          <div className="fa-badge-icon">⚠</div>
          <div className="fa-badge-label">CONFLICT</div>
        </div>
        <div className="fa-expert fa-reject">
          <div className="fa-expert-tag red">✗ Against</div>
          <div className="fa-expert-name">T. Richter</div>
          <div className="fa-expert-note red">Hold — HTOL outstanding</div>
        </div>
      </div>
    ),
  },
  {
    step: "03", heading: "Generate a structured decision brief",
    sub: "Readiness score, evidence table, risk assessment",
    content: (
      <div className="fa-brief">
        <div className="fa-ring">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#009b3a" strokeWidth="8"
              strokeLinecap="round" strokeDasharray="301.59" strokeDashoffset="84.45"
              transform="rotate(-90 60 60)" className="fa-arc"/>
            <text x="60" y="56" textAnchor="middle" style={{fontSize:22,fontWeight:700,fill:"#00cc4e",fontFamily:"Chakra Petch,monospace"}}>72%</text>
            <text x="60" y="70" textAnchor="middle" style={{fontSize:8,fill:"#6080a0",fontFamily:"DM Sans,sans-serif",textTransform:"uppercase",letterSpacing:"0.08em"}}>READINESS</text>
          </svg>
        </div>
        <div className="fa-rows">
          {[{d:"Evidence depth","v":"24/30",c:"green"},{d:"Expert agreement","v":"18/40",c:"amber"},{d:"Knowledge recency","v":"30/30",c:"green"}].map((r,i)=>(
            <div key={r.d} className="fa-row" style={{animationDelay:`${0.2+i*0.15}s`}}>
              <span className={`fa-dot ${r.c}`}/>
              <span className="fa-row-label">{r.d}</span>
              <span className="fa-row-val">{r.v}</span>
            </div>
          ))}
          <div className="fa-conflict-note" style={{animationDelay:"0.65s"}}>⚠ Conflict detected — agreement score reduced</div>
        </div>
      </div>
    ),
  },
  {
    step: "04", heading: "PM approves or rejects",
    sub: "Decision logged with full audit trail, experts notified",
    content: (
      <div className="fa-verdict">
        <div className="fa-btns">
          <div className="fa-agree">✓ Agree — Proceed</div>
          <div className="fa-disagree">✗ Disagree — Hold</div>
        </div>
        <div className="fa-approved">✓ Decision approved · 3 experts notified</div>
        <div className="fa-timeline">
          {[{c:"green",l:"Knowledge captured"},{c:"amber",l:"⚠ Conflict detected"},{c:"green",l:"✓ PM approved"}].map((d,i)=>(
            <div key={d.l} className="fa-tl-row" style={{animationDelay:`${0.3+i*0.15}s`}}>
              <span className={`fa-dot ${d.c}`}/>{d.l}
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

function FlowAnimation() {
  const [scene, setScene] = useState(0);
  const [exiting, setExiting] = useState(false);
  const sceneRef = useRef(0);

  const goTo = (next: number) => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      sceneRef.current = next;
      setScene(next);
      setExiting(false);
    }, 150);
  };

  useEffect(() => {
    const iv = setInterval(() => goTo((sceneRef.current + 1) % 4), 1500);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const s = FLOW_SCENES[scene];
  return (
    <div className="fa-root">
      <div className="fa-bg" />
      <div className="fa-step-ghost">{s.step}</div>
      <div className={`fa-inner${exiting ? " fa-exiting" : ""}`} key={scene}>
        <div className="fa-step-label">Step {s.step}</div>
        <div className="fa-heading">{s.heading}</div>
        <div className="fa-sub">{s.sub}</div>
        <div className="fa-content">{s.content}</div>
      </div>
      <div className="fa-dots">
        {FLOW_SCENES.map((_, i) => (
          <button key={i} className={`fa-dot-btn${i === scene ? " active" : ""}`} onClick={() => goTo(i)} />
        ))}
      </div>
    </div>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

function LandingPage() {
  const [score, setScore] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let n = 0;
      const iv = setInterval(() => {
        n += 1;
        setScore(n);
        if (n >= 72) clearInterval(iv);
      }, 22);
      return () => clearInterval(iv);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="lp">

        {/* ── Navbar ──────────────────────────────────────────────── */}
        <nav className="lp-nav">
          <a href="/" className="lp-logo">
            <span className="lp-logo-mark">DB</span>
            <span className="lp-logo-name">DecisionBridge</span>
          </a>
          <a href="/pitch" className="lp-nav-link" style={{marginRight:8}}>Pitch deck</a>
          <a href="/auth" className="lp-nav-link">Sign in →</a>
        </nav>

        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-dot-grid" aria-hidden="true" />
          <div className="lp-hero-glow" aria-hidden="true" />

          <div className="lp-hero-split">

            {/* Left: headline + CTA */}
            <div className="lp-hero-left">
              <span className="lp-eyebrow">
                <span className="lp-eyebrow-dot" />
                Built for Infineon · Hackathon 2025
              </span>

              <h1 className="lp-h1">
                <span className="lp-h1-line">
                  {HERO_LINE1.map((w, i) => (
                    <span key={i} className="lp-word" style={{ animationDelay: `${w.d}s` }}>{w.text} </span>
                  ))}
                </span>
                <span className="lp-h1-line">
                  {HERO_LINE2.map((w, i) => (
                    <span key={i} className="lp-word" style={{ animationDelay: `${w.d}s` }}>{w.text} </span>
                  ))}
                </span>
                <span className="lp-h1-line lp-h1-accent">
                  {HERO_LINE3.map((w, i) => (
                    <span key={i} className="lp-word lp-word-accent" style={{ animationDelay: `${w.d}s` }}>{w.text} </span>
                  ))}
                </span>
              </h1>

              <p className="lp-tagline" style={{ animationDelay: "1s" }}>
                AI-powered decision templates made easy with connectors
                from Gmail, Jira, Slack, Teams and your own workspaces.
              </p>

              <div className="lp-cta-row" style={{ animationDelay: "1.15s" }}>
                <a href="/auth" className="lp-btn-primary">
                  Try now
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
                <a href="#features" className="lp-btn-ghost">See how it works</a>
              </div>

              <div className="lp-hero-stats" style={{ animationDelay: "1.3s" }}>
                <div className="lp-hs"><span className="lp-hs-n">5</span><span className="lp-hs-l">expert roles</span></div>
                <div className="lp-hs-div" />
                <div className="lp-hs"><span className="lp-hs-n">6</span><span className="lp-hs-l">workspace connectors</span></div>
                <div className="lp-hs-div" />
                <div className="lp-hs"><span className="lp-hs-n">100%</span><span className="lp-hs-l">auditable</span></div>
              </div>
            </div>

            {/* Right: animated flow player */}
            <div className="lp-hero-right">
              <div className="lp-hero-player">
                <FlowAnimation />
              </div>
            </div>

          </div>
        </section>

        {/* ── Connector strip ─────────────────────────────────────── */}
        <div className="lp-strip">
          <div className="lp-strip-fade lp-strip-fade-l" aria-hidden="true" />
          <div className="lp-strip-fade lp-strip-fade-r" aria-hidden="true" />
          <div className="lp-strip-track">
            {[...CONNECTORS, ...CONNECTORS, ...CONNECTORS].map((c, i) => (
              <div key={i} className="lp-chip">
                <span className="lp-chip-icon" style={{ background: c.bg }}>{c.letter}</span>
                <span className="lp-chip-name">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Features ────────────────────────────────────────────── */}
        <section className="lp-features" id="features">
          <p className="lp-section-label">How it works</p>
          <h2 className="lp-h2">From raw workspace data<br />to confident decisions</h2>

          <div className="lp-cards">

            {/* Card 1 — Capture */}
            <div className="lp-card">
              <div className="lp-card-accent" style={{ background: "rgba(0,155,58,0.18)" }} />
              <div className="lp-card-icon" style={{ background: "rgba(0,155,58,0.1)", color: "#00b844" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 className="lp-card-title">Capture from your tools</h3>
              <p className="lp-card-desc">Pull expert knowledge directly from Gmail, Jira tickets, Slack threads, and meeting transcripts. AI extracts structured findings in seconds.</p>
              <div className="lp-tag-row">
                {["Gmail", "Jira", "Slack", "Teams"].map((s) => (
                  <span key={s} className="lp-tag">{s}</span>
                ))}
              </div>
            </div>

            {/* Card 2 — Conflicts (featured) */}
            <div className="lp-card lp-card-featured">
              <div className="lp-card-accent" style={{ background: "rgba(245,158,11,0.15)" }} />
              <div className="lp-card-badge">Key differentiator</div>
              <div className="lp-card-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="lp-card-title">Detect expert conflicts</h3>
              <p className="lp-card-desc">When experts disagree, the system surfaces it before the PM decides — not after. Conflicts automatically reduce the readiness score.</p>
              <div className="lp-conflict-demo">
                <div className="lp-cd approve">✓ Dr. Müller — Approve</div>
                <span className="lp-cd-vs">vs</span>
                <div className="lp-cd reject">✗ T. Richter — Hold</div>
              </div>
            </div>

            {/* Card 3 — Brief */}
            <div className="lp-card">
              <div className="lp-card-accent" style={{ background: "rgba(99,102,241,0.15)" }} />
              <div className="lp-card-icon" style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h3 className="lp-card-title">Structured decision briefs</h3>
              <p className="lp-card-desc">Every question produces a PM-ready brief with readiness score, risk, missing info, evidence table, and PM approve/reject verdict. Full audit trail.</p>
              <div className="lp-tag-row">
                <span className="lp-tag lp-tag-green">Readiness score</span>
                <span className="lp-tag lp-tag-blue">Evidence table</span>
                <span className="lp-tag lp-tag-purple">PDF export</span>
              </div>
            </div>

          </div>
        </section>


        {/* ── Score section ────────────────────────────────────────── */}
        <section className="lp-score-section">
          <div className="lp-score-left">
            <p className="lp-section-label">Decision Readiness Score</p>
            <h2 className="lp-h2 lp-h2-left">Know when you're<br />ready to decide.</h2>
            <p className="lp-body-text">
              The score combines evidence depth, expert agreement, and recency. Conflicts reduce it. New expert answers raise it. It's an honest signal — not a rubber stamp.
            </p>
            <div className="lp-score-checklist">
              <div className="lp-check"><span className="lp-check-dot green" />Evidence depth from all connectors</div>
              <div className="lp-check"><span className="lp-check-dot amber" />Expert agreement — conflicts penalised</div>
              <div className="lp-check"><span className="lp-check-dot green" />Knowledge recency — stale data flagged</div>
            </div>
            <a href="/auth" className="lp-btn-primary lp-btn-md">See it in action →</a>
          </div>

          <div className="lp-score-right">
            <div className="lp-score-card">
              <ScoreMeter score={score} />
              <div className="lp-score-divider" />
              <div className="lp-score-rows">
                <div className="lp-score-row">
                  <span className="lp-score-dot green" />
                  <span className="lp-score-row-label">Evidence depth</span>
                  <span className="lp-score-row-val">24 / 30</span>
                </div>
                <div className="lp-score-row">
                  <span className="lp-score-dot amber" />
                  <span className="lp-score-row-label">Expert agreement</span>
                  <span className="lp-score-row-val">18 / 40</span>
                </div>
                <div className="lp-score-row">
                  <span className="lp-score-dot green" />
                  <span className="lp-score-row-label">Knowledge recency</span>
                  <span className="lp-score-row-val">30 / 30</span>
                </div>
              </div>
              <div className="lp-score-conflict">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Conflict detected — agreement score reduced
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────── */}
        <section className="lp-final-cta">
          <div className="lp-final-glow" aria-hidden="true" />
          <div className="lp-final-grid" aria-hidden="true" />
          <p className="lp-section-label" style={{ position: "relative" }}>No login required</p>
          <h2 className="lp-final-h2">Ready to try it?</h2>
          <p className="lp-final-sub">Pick a demo role and explore the full flow in under 60 seconds.</p>
          <a href="/auth" className="lp-btn-primary lp-btn-xl">
            Get started
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="lp-footer">
          <span className="lp-footer-brand">DecisionBridge</span>
          <span className="lp-footer-sep">·</span>
          <span>Built for Infineon Hackathon 2025</span>
        </footer>

      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .lp {
    min-height: 100vh;
    background: #0a0f1e;
    color: #d8e4f0;
    font-family: 'DM Sans', sans-serif;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Navbar ─────────────────────────────────────────── */
  .lp-nav {
    position: sticky; top: 0; z-index: 200;
    display: flex; align-items: center; justify-content: space-between;
    height: 60px; padding: 0 40px;
    background: rgba(10,15,30,0.88);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .lp-logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; color: inherit;
  }

  .lp-logo-mark {
    width: 32px; height: 32px; border-radius: 8px;
    background: #009b3a;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Chakra Petch', sans-serif;
    font-weight: 700; font-size: 12px; color: #fff; letter-spacing: 0.02em;
    box-shadow: 0 0 14px rgba(0,155,58,0.45);
  }

  .lp-logo-name {
    font-family: 'Chakra Petch', sans-serif;
    font-weight: 600; font-size: 15px;
    color: #c8d8ee; letter-spacing: -0.01em;
  }

  .lp-nav-link {
    font-size: 13.5px; font-weight: 500;
    color: #009b3a; text-decoration: none;
    transition: color 0.15s;
  }
  .lp-nav-link:hover { color: #00d44f; }

  /* ── Hero ───────────────────────────────────────────── */
  .lp-hero {
    position: relative;
    min-height: calc(100vh - 60px);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }

  .lp-dot-grid {
    position: absolute; inset: 0;
    background-image:
      radial-gradient(circle, rgba(0,155,58,0.22) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: radial-gradient(ellipse 85% 75% at 50% 45%, black 20%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse 85% 75% at 50% 45%, black 20%, transparent 75%);
    animation: lp-grid-in 2s ease both;
  }

  @keyframes lp-grid-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .lp-hero-glow {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 800px 600px at 25% 35%, rgba(0,155,58,0.09) 0%, transparent 60%),
      radial-gradient(ellipse 600px 500px at 75% 65%, rgba(0,155,58,0.06) 0%, transparent 55%);
  }

  /* ── Hero split layout ─────────────────────────────────── */
  .lp-hero-split {
    position: relative; z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: center;
    max-width: 1200px;
    width: 100%;
    padding: 60px 40px;
  }

  .lp-hero-left {
    text-align: left;
  }

  .lp-hero-right {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lp-hero-player {
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    background: #060b18;
    border: 1px solid rgba(0,155,58,0.2);
    box-shadow: 0 0 60px rgba(0,155,58,0.1), 0 24px 60px rgba(0,0,0,0.6);
    aspect-ratio: 16 / 9;
  }

  .lp-hero-inner {
    position: relative; z-index: 1;
    text-align: center;
    max-width: 860px;
    padding: 80px 28px 100px;
  }

  .lp-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.15em;
    color: #009b3a;
    background: rgba(0,155,58,0.08);
    border: 1px solid rgba(0,155,58,0.22);
    border-radius: 20px; padding: 5px 14px;
    margin-bottom: 36px;
    animation: lp-up 0.6s ease both;
  }

  .lp-eyebrow-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #009b3a;
    animation: lp-pulse 2s ease infinite;
  }

  @keyframes lp-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,155,58,0.5); }
    50%       { opacity: 0.7; box-shadow: 0 0 0 5px rgba(0,155,58,0); }
  }

  .lp-h1 {
    font-family: 'Chakra Petch', sans-serif;
    font-size: clamp(36px, 4vw, 58px);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.03em;
    color: #eaf2ff;
    margin: 0 0 24px;
  }

  .lp-h1-line { display: block; }

  .lp-h1-accent .lp-word-accent { color: #009b3a; }

  .lp-word {
    display: inline-block;
    opacity: 0;
    margin-right: 0.22em;
    animation: lp-word-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes lp-word-in {
    from { opacity: 0; transform: translateY(22px) scale(0.97); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0);   }
  }

  .lp-tagline {
    font-size: clamp(15px, 2vw, 18px);
    line-height: 1.72;
    color: #6080a0;
    margin: 0 0 44px;
    opacity: 0;
    animation: lp-up 0.6s ease forwards;
  }

  .lp-br { display: none; }
  @media (min-width: 640px) { .lp-br { display: inline; } }

  .lp-cta-row {
    display: flex; gap: 12px; justify-content: center;
    flex-wrap: wrap; margin-bottom: 60px;
    opacity: 0;
    animation: lp-up 0.6s ease forwards;
  }

  @keyframes lp-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  .lp-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 26px;
    background: #009b3a; color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 14.5px; font-weight: 600;
    border-radius: 10px; text-decoration: none;
    transition: background 0.14s, transform 0.12s, box-shadow 0.15s;
    box-shadow: 0 0 24px rgba(0,155,58,0.4), 0 2px 8px rgba(0,0,0,0.3);
  }
  .lp-btn-primary:hover {
    background: #00b844;
    transform: translateY(-2px);
    box-shadow: 0 0 36px rgba(0,180,68,0.55), 0 4px 16px rgba(0,0,0,0.4);
  }
  .lp-btn-primary:active { transform: translateY(0); }

  .lp-btn-ghost {
    display: inline-flex; align-items: center;
    padding: 13px 22px;
    background: transparent; color: #6080a0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14.5px; font-weight: 500;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; text-decoration: none;
    transition: color 0.14s, border-color 0.14s;
  }
  .lp-btn-ghost:hover { color: #d8e4f0; border-color: rgba(255,255,255,0.22); }

  .lp-btn-md  { padding: 12px 24px; font-size: 14px; }
  .lp-btn-xl  { padding: 17px 44px; font-size: 17px; border-radius: 12px; }

  .lp-hero-stats {
    display: flex; align-items: center; justify-content: flex-start;
    opacity: 0;
    animation: lp-up 0.6s ease forwards;
  }

  .lp-hs { display: flex; flex-direction: column; align-items: center; padding: 0 28px; }
  .lp-hs-n {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 30px; font-weight: 700;
    color: #009b3a; line-height: 1;
  }
  .lp-hs-l {
    font-size: 11px; color: #3a5470;
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-top: 5px;
  }
  .lp-hs-div { width: 1px; height: 36px; background: rgba(255,255,255,0.08); }

  /* ── Connector strip ────────────────────────────────── */
  .lp-strip {
    position: relative; overflow: hidden;
    padding: 18px 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    background: rgba(12,18,36,0.9);
  }

  .lp-strip-fade {
    position: absolute; top: 0; bottom: 0; width: 120px; z-index: 2; pointer-events: none;
  }
  .lp-strip-fade-l { left: 0; background: linear-gradient(to right, #0a0f1e, transparent); }
  .lp-strip-fade-r { right: 0; background: linear-gradient(to left, #0a0f1e, transparent); }

  .lp-strip-track {
    display: flex;
    width: max-content;
    animation: lp-scroll 28s linear infinite;
  }
  .lp-strip-track:hover { animation-play-state: paused; }

  @keyframes lp-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-33.333%); }
  }

  .lp-chip {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 14px 7px 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 40px;
    flex-shrink: 0;
    margin-right: 16px;
    transition: border-color 0.15s;
  }
  .lp-chip:hover { border-color: rgba(0,155,58,0.3); }

  .lp-chip-icon {
    width: 26px; height: 26px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #fff;
    font-family: 'Chakra Petch', sans-serif;
    flex-shrink: 0;
  }

  .lp-chip-name { font-size: 12.5px; font-weight: 500; color: #6080a0; white-space: nowrap; }

  /* ── Features ───────────────────────────────────────── */
  .lp-features {
    max-width: 1140px; margin: 0 auto;
    padding: 96px 40px;
    text-align: center;
  }

  .lp-section-label {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.16em;
    color: #009b3a; margin-bottom: 14px;
  }

  .lp-h2 {
    font-family: 'Chakra Petch', sans-serif;
    font-size: clamp(30px, 4.5vw, 46px);
    font-weight: 700; letter-spacing: -0.025em;
    color: #eaf2ff; line-height: 1.12;
    margin: 0 0 60px;
  }

  .lp-h2-left { text-align: left; margin-bottom: 20px; }

  .lp-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }

  .lp-card {
    position: relative;
    background: #0c1628;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    padding: 30px 26px;
    text-align: left;
    overflow: hidden;
    transition: transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s ease, border-color 0.2s;
    transform-style: preserve-3d;
    cursor: default;
  }
  .lp-card:hover {
    transform: translateY(-8px) rotateX(-2.5deg);
    box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,155,58,0.2);
    border-color: rgba(0,155,58,0.22);
  }

  .lp-card-featured {
    border-color: rgba(245,158,11,0.18);
    background: linear-gradient(155deg, rgba(245,158,11,0.05) 0%, #0c1628 45%);
  }
  .lp-card-featured:hover {
    box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.3);
    border-color: rgba(245,158,11,0.3);
  }

  .lp-card-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 18px 18px 0 0;
  }

  .lp-card-badge {
    display: inline-block;
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: #d97706;
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 20px; padding: 3px 10px;
    margin-bottom: 16px;
  }

  .lp-card-icon {
    width: 48px; height: 48px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 18px;
  }

  .lp-card-title {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 17px; font-weight: 600;
    color: #d8e8f8; letter-spacing: -0.01em;
    margin: 0 0 10px;
  }

  .lp-card-desc {
    font-size: 13.5px; line-height: 1.65;
    color: #4a6070; margin: 0 0 18px;
  }

  .lp-tag-row { display: flex; gap: 6px; flex-wrap: wrap; }

  .lp-tag {
    font-size: 11px; font-weight: 500;
    padding: 3px 9px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px; color: #5a7090;
  }
  .lp-tag-green { background: rgba(0,155,58,0.08); border-color: rgba(0,155,58,0.2); color: #009b3a; }
  .lp-tag-blue  { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); color: #60a5fa; }
  .lp-tag-purple { background: rgba(168,85,247,0.08); border-color: rgba(168,85,247,0.2); color: #c084fc; }

  .lp-conflict-demo {
    display: flex; align-items: center; gap: 7px;
  }
  .lp-cd {
    flex: 1; padding: 7px 10px; border-radius: 8px;
    font-size: 11.5px; font-weight: 600;
  }
  .lp-cd.approve { background: rgba(0,155,58,0.1); color: #00b844; border: 1px solid rgba(0,155,58,0.2); }
  .lp-cd.reject  { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
  .lp-cd-vs { font-size: 9.5px; font-weight: 700; color: #3a5060; text-transform: uppercase; letter-spacing: 0.1em; }

  /* ── Score section ──────────────────────────────────── */
  .lp-score-section {
    max-width: 1100px; margin: 0 auto;
    padding: 80px 40px 100px;
    display: grid; grid-template-columns: 1fr auto;
    gap: 72px; align-items: center;
  }

  .lp-body-text {
    font-size: 15px; line-height: 1.78; color: #4a6070;
    margin: 0 0 28px;
  }

  .lp-score-checklist {
    display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px;
  }
  .lp-check {
    display: flex; align-items: center; gap: 10px;
    font-size: 13.5px; color: #5a7090;
  }
  .lp-check-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .lp-check-dot.green { background: #009b3a; }
  .lp-check-dot.amber { background: #f59e0b; }

  .lp-score-right { display: flex; justify-content: center; }

  .lp-score-card {
    background: #0c1628;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px; padding: 36px 32px;
    width: 100%; max-width: 400px;
    box-shadow: 0 0 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,155,58,0.06);
  }

  .lp-score-svg {
    width: 152px; height: 152px;
    display: block; margin: 0 auto 8px;
  }

  .lp-score-num {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 38px; font-weight: 700;
    fill: #009b3a;
  }

  .lp-score-sub-text {
    font-size: 10px; fill: #3a5470;
    font-family: 'DM Sans', sans-serif;
    text-transform: uppercase; letter-spacing: 0.1em;
  }

  .lp-score-divider {
    height: 1px; background: rgba(255,255,255,0.06);
    margin: 20px 0;
  }

  .lp-score-rows { display: flex; flex-direction: column; gap: 13px; margin-bottom: 18px; }
  .lp-score-row {
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: #6080a0;
  }
  .lp-score-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .lp-score-dot.green { background: #009b3a; box-shadow: 0 0 6px rgba(0,155,58,0.6); }
  .lp-score-dot.amber { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.6); }
  .lp-score-row-label { flex: 1; }
  .lp-score-row-val { font-weight: 600; color: #8090a8; white-space: nowrap; }

  .lp-score-conflict {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: 12px; color: #d97706;
    background: rgba(245,158,11,0.06);
    border: 1px solid rgba(245,158,11,0.16);
    border-radius: 10px; padding: 10px 14px;
    line-height: 1.45;
  }

  /* ── Final CTA ──────────────────────────────────────── */
  .lp-final-cta {
    position: relative; overflow: hidden;
    text-align: center; padding: 110px 40px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .lp-final-glow {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 700px; height: 500px; pointer-events: none;
    background: radial-gradient(ellipse, rgba(0,155,58,0.13) 0%, transparent 65%);
  }

  .lp-final-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(circle, rgba(0,155,58,0.1) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent);
    -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent);
  }

  .lp-final-h2 {
    font-family: 'Chakra Petch', sans-serif;
    font-size: clamp(36px, 6vw, 64px);
    font-weight: 700; letter-spacing: -0.03em;
    color: #eaf2ff; line-height: 1.06;
    margin: 0 0 16px;
    position: relative;
  }

  .lp-final-sub {
    font-size: 16px; color: #4a6070;
    margin: 0 0 44px; position: relative;
  }

  /* ── Footer ─────────────────────────────────────────── */
  .lp-footer {
    display: flex; align-items: center; justify-content: center;
    gap: 12px; padding: 22px 40px;
    border-top: 1px solid rgba(255,255,255,0.05);
    font-size: 12px; color: #2e4460;
  }
  .lp-footer-brand {
    font-family: 'Chakra Petch', sans-serif;
    font-weight: 600; color: #3a5470;
  }
  .lp-footer-sep { color: #1e3450; }

  /* ── Remotion player section ──────────────────────── */
  .lp-remotion-section {
    padding: 80px 40px;
    text-align: center;
    background: linear-gradient(180deg, transparent 0%, rgba(0,155,58,0.03) 50%, transparent 100%);
  }

  .lp-remotion-player {
    max-width: 900px;
    margin: 32px auto 0;
    border-radius: 16px;
    overflow: hidden;
    background: #060b18;
    border: 1px solid rgba(0,155,58,0.18);
    box-shadow: 0 0 60px rgba(0,155,58,0.08), 0 24px 80px rgba(0,0,0,0.6);
    aspect-ratio: 16 / 9;
  }

  /* ── Responsive ─────────────────────────────────────── */
  @media (max-width: 960px) {
    .lp-nav { padding: 0 20px; }
    .lp-hero-split { grid-template-columns: 1fr; gap: 32px; padding: 48px 24px 40px; }
    .lp-hero-left { text-align: center; }
    .lp-hero-stats { justify-content: center; }
    .lp-cta-row { justify-content: center; }
    .lp-eyebrow { margin-left: auto; margin-right: auto; }
    .lp-cards { grid-template-columns: 1fr; max-width: 520px; margin: 0 auto; }
    .lp-score-section { grid-template-columns: 1fr; gap: 40px; text-align: center; padding: 60px 24px 80px; }
    .lp-h2-left { text-align: center; }
    .lp-score-checklist { align-items: center; }
    .lp-score-right { order: -1; }
    .lp-hs { padding: 0 14px; }
    .lp-features { padding: 64px 24px; }
    .fa-conflict { flex-direction: column; gap: 10px; }
    .fa-brief { flex-direction: column; align-items: center; }
    .fa-ring { margin: 0 auto; }
  }

  @media (max-width: 600px) {
    .lp-h1 { font-size: 30px; }
    .lp-hs-div { display: none; }
    .lp-hero-stats { gap: 16px; flex-wrap: wrap; justify-content: center; }
    .fa-chips { gap: 6px; }
    .fa-heading { font-size: 16px; }
    .lp-score-section { padding: 48px 20px 60px; }
    .lp-final-cta { padding: 72px 24px; }
    .lp-features { padding: 48px 20px; }
    .fa-root { padding: 22px 22px 16px; }
  }

  /* ── FlowAnimation ──────────────────────────────────── */
  .fa-root {
    position: relative; width: 100%; height: 100%;
    background: #0a0f1e; border-radius: 14px; overflow: hidden;
    display: flex; flex-direction: column; justify-content: center;
    padding: 28px 32px 20px; min-height: 340px;
  }
  .fa-bg {
    position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(circle, rgba(0,155,58,0.16) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(ellipse 85% 80% at 50% 50%, black 20%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse 85% 80% at 50% 50%, black 20%, transparent 75%);
  }
  .fa-step-ghost {
    position: absolute; top: 12px; left: 24px;
    font-family: 'Chakra Petch', monospace; font-size: 68px; font-weight: 700;
    color: rgba(0,155,58,0.09); line-height: 1; pointer-events: none; user-select: none;
    transition: opacity 0.25s;
  }

  /* Scene enter */
  .fa-inner {
    position: relative; z-index: 1;
    animation: fa-enter 0.2s cubic-bezier(0.22,1,0.36,1) both;
  }
  @keyframes fa-enter {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  /* Scene exit */
  .fa-inner.fa-exiting {
    animation: fa-exit 0.12s ease-in forwards;
  }
  @keyframes fa-exit {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-8px); }
  }

  .fa-step-label {
    font-family: 'Chakra Petch', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: 0.18em; color: #009b3a; text-transform: uppercase; margin-bottom: 8px;
  }
  .fa-heading {
    font-family: 'Chakra Petch', monospace; font-size: 19px; font-weight: 700;
    color: #eaf2ff; letter-spacing: -0.02em; line-height: 1.25; margin-bottom: 5px;
  }
  .fa-sub { font-size: 12.5px; color: #6080a0; margin-bottom: 18px; line-height: 1.5; }
  .fa-content { position: relative; }

  /* -- Scene 1: chips -- */
  .fa-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .fa-chip {
    display: flex; align-items: center; gap: 7px; padding: 5px 11px 5px 5px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 30px;
    animation: fa-pop-up 0.3s cubic-bezier(0.22,1,0.36,1) both;
  }
  .fa-chip-icon {
    width: 24px; height: 24px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800; color: #fff; font-family: 'Chakra Petch', monospace; flex-shrink: 0;
  }
  .fa-chip-name { font-size: 11.5px; font-weight: 500; color: #6080a0; }
  .fa-arrow { font-size: 16px; color: #009b3a; text-shadow: 0 0 8px #009b3a; animation: fa-pop-up 0.3s 0.35s both; }
  .fa-kb {
    padding: 7px 12px; background: rgba(0,155,58,0.08); border: 1px solid rgba(0,155,58,0.25);
    border-radius: 9px; font-size: 11.5px; font-weight: 600; color: #00cc4e;
    font-family: 'Chakra Petch', monospace;
    animation: fa-pop-up 0.3s 0.42s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* -- Scene 2: conflict -- */
  .fa-conflict { display: flex; align-items: center; gap: 12px; }
  .fa-expert { flex: 1; padding: 12px 14px; border-radius: 10px; animation: fa-from-left 0.35s cubic-bezier(0.22,1,0.36,1) both; }
  .fa-approve { background: rgba(0,155,58,0.08); border: 1px solid rgba(0,155,58,0.25); }
  .fa-reject  { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.22); animation-name: fa-from-right; }
  @keyframes fa-from-left  { from { opacity:0; transform:translateX(-24px); } to { opacity:1; transform:none; } }
  @keyframes fa-from-right { from { opacity:0; transform:translateX(24px);  } to { opacity:1; transform:none; } }
  .fa-expert-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .fa-expert-tag.green { color: #009b3a; } .fa-expert-tag.red { color: #f87171; }
  .fa-expert-name { font-family: 'Chakra Petch', monospace; font-size: 14px; font-weight: 700; color: #eaf2ff; margin-bottom: 5px; }
  .fa-expert-note { font-size: 10.5px; font-weight: 600; padding: 3px 7px; border-radius: 5px; }
  .fa-expert-note.green { color: #00cc4e; background: rgba(0,155,58,0.12); }
  .fa-expert-note.red   { color: #f87171; background: rgba(239,68,68,0.1); }
  .fa-badge { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; animation: fa-pop 0.3s 0.28s cubic-bezier(0.22,1,0.36,1) both; }
  .fa-badge-icon {
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(245,158,11,0.15); border: 2px solid #f59e0b;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; box-shadow: 0 0 14px rgba(245,158,11,0.35);
  }
  .fa-badge-label { font-size: 8px; font-weight: 700; color: #f59e0b; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; }

  /* -- Scene 3: brief -- */
  .fa-brief { display: flex; gap: 18px; align-items: flex-start; }
  .fa-ring { flex-shrink: 0; animation: fa-pop 0.35s cubic-bezier(0.22,1,0.36,1) both; }
  .fa-arc { animation: fa-arc-fill 1s 0.1s ease-out both; }
  @keyframes fa-arc-fill { from { stroke-dashoffset: 301.59; } to { stroke-dashoffset: 84.45; } }
  .fa-rows { flex: 1; display: flex; flex-direction: column; gap: 9px; padding-top: 4px; }
  .fa-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #6080a0; animation: fa-from-left 0.3s cubic-bezier(0.22,1,0.36,1) both; }
  .fa-row-label { flex: 1; }
  .fa-row-val { font-weight: 600; color: #8090a8; font-family: 'Chakra Petch', monospace; font-size: 11px; }
  .fa-conflict-note {
    font-size: 10.5px; color: #d97706; padding: 5px 9px;
    background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.18); border-radius: 6px;
    animation: fa-from-left 0.3s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* -- Scene 4: verdict -- */
  .fa-verdict { display: flex; flex-direction: column; gap: 10px; }
  .fa-btns { display: flex; gap: 9px; animation: fa-pop-up 0.3s cubic-bezier(0.22,1,0.36,1) both; }
  .fa-agree, .fa-disagree {
    flex: 1; padding: 11px 0; border-radius: 9px;
    font-family: 'Chakra Petch', monospace; font-size: 12px; font-weight: 700; text-align: center; cursor: default;
  }
  .fa-agree {
    background: rgba(0,155,58,0.18); border: 2px solid rgba(0,155,58,0.5); color: #00cc4e;
    animation: fa-agree-pulse 1.8s 0.4s ease-in-out infinite;
  }
  @keyframes fa-agree-pulse {
    0%,100% { box-shadow: 0 0 10px rgba(0,155,58,0.25); }
    50%      { box-shadow: 0 0 26px rgba(0,155,58,0.55); }
  }
  .fa-disagree { background: rgba(239,68,68,0.07); border: 2px solid rgba(239,68,68,0.2); color: #f87171; }
  .fa-approved {
    padding: 9px 13px; background: rgba(0,155,58,0.1); border: 1.5px solid rgba(0,155,58,0.3); border-radius: 9px;
    font-size: 11.5px; font-weight: 700; color: #00cc4e; font-family: 'Chakra Petch', monospace;
    animation: fa-pop-up 0.3s 0.22s cubic-bezier(0.22,1,0.36,1) both;
  }
  .fa-timeline { display: flex; flex-direction: column; gap: 7px; }
  .fa-tl-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #6080a0; animation: fa-from-left 0.3s cubic-bezier(0.22,1,0.36,1) both; }

  /* Shared keyframes */
  @keyframes fa-pop-up { from { opacity:0; transform:translateY(12px) scale(0.95); } to { opacity:1; transform:none; } }
  @keyframes fa-pop    { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }

  /* Shared dot */
  .fa-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .fa-dot.green { background: #009b3a; box-shadow: 0 0 5px #009b3a; }
  .fa-dot.amber { background: #f59e0b; box-shadow: 0 0 5px #f59e0b; }

  /* Step progress dots */
  .fa-dots { display: flex; gap: 7px; justify-content: center; margin-top: 18px; position: relative; z-index: 1; }
  .fa-dot-btn {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(255,255,255,0.12); border: none; cursor: pointer;
    transition: background 0.2s, transform 0.2s, width 0.25s; padding: 0;
  }
  .fa-dot-btn.active { background: #009b3a; transform: scale(1.5); width: 18px; border-radius: 3px; }
  .fa-dot-btn:hover:not(.active) { background: rgba(0,155,58,0.4); }
`;
