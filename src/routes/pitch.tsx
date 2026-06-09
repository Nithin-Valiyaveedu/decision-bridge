import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LOTTIE_CONFUSED  = "https://lottie.host/3a166f08-1ab1-4994-91b0-8c721a31811f/7RVz9nBrrz.lottie";
const LOTTIE_EXPERT1   = "https://lottie.host/f1d085c7-2621-4941-b0e5-42dea8bffaee/YLrqR61UMx.lottie";
const LOTTIE_EXPERT2   = "https://lottie.host/458eef30-abb0-49f7-8751-c01fbbcd9159/CY64K4KlOX.lottie";
const LOTTIE_CELEBRATE = "https://lottie.host/placeholder-celebrate.lottie"; // TODO: replace with celebrating character

function LottieAvatar({ src, initials, gradient, size = 160 }: { src: string; initials: string; gradient: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const isPlaceholder = src.includes("placeholder");
  if (failed || isPlaceholder) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", background: gradient,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.28, fontWeight: 800, color: "#fff",
        fontFamily: "var(--font)", flexShrink: 0, boxShadow: "0 0 40px rgba(0,155,58,0.25)",
      }}>{initials}</div>
    );
  }
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }}>
      <DotLottieReact src={src} autoplay loop style={{ width: "100%", height: "100%" }} onError={() => setFailed(true)} />
    </div>
  );
}

export const Route = createFileRoute("/pitch")({ ssr: false, component: PitchDeck });

const TOTAL = 11;

// ─── Scene 1 — Problem ───────────────────────────────────────────────────────
function Scene1() {
  const problems = [
    { q: "Partner with CATL for our Gen-4 battery platform?", pain: "Battery tech, supply chain, finance — no consensus" },
    { q: "Expand fast-charging to Southeast Asia this quarter?", pain: "Market vs execution risk — unresolved" },
    { q: "Shift from NMC to LFP chemistry for our next model?", pain: "Engineering vs procurement — in conflict" },
  ];
  return (
    <div className="scene scene1">
      <div className="scene-eyebrow">The Problem</div>
      <h1 className="scene-title">Business decisions<br /><span className="accent">keep getting harder</span></h1>
      <div className="s1-cards">
        {problems.map((item, i) => (
          <div key={i} className="s1-card" style={{ animationDelay: `${0.3 + i * 0.18}s` }}>
            <div className="s1-card-num">0{i+1}</div>
            <div className="s1-card-q">{item.q}</div>
            <div className="s1-pain">{item.pain}</div>
          </div>
        ))}
      </div>
      <div className="scene-footnote">Chinese EV OEMs launch in 24 months. Legacy automakers take 48. — McKinsey, 2024</div>
    </div>
  );
}

// ─── Scene 2 — Meet Sarah ────────────────────────────────────────────────────
function Scene2() {
  const tools = [
    { label: "Gmail", color: "#ea4335", badge: "47", letter: "G" },
    { label: "Jira", color: "#0052cc", badge: "200+", letter: "J" },
    { label: "Slack", color: "#611f69", badge: "12", letter: "S" },
    { label: "Teams", color: "#4f52b2", badge: "8", letter: "T" },
  ];
  return (
    <div className="scene scene2">
      <div className="scene-eyebrow">Meet Sarah — The Manager</div>
      <div className="s2-layout">
        <div className="s2-left">
          <LottieAvatar src={LOTTIE_CONFUSED} initials="SK" gradient="linear-gradient(135deg,#1e3a8a,#3b82f6)" size={360} />
          <div className="persona-card" style={{ animationDelay: "0.1s" }}>
            <div className="persona-info">
              <div className="persona-name">Sarah Klein</div>
              <div className="persona-role">Battery Strategy PM, Next-Gen Platform</div>
              <div className="persona-company">EV OEM — Global R&D Division</div>
            </div>
          </div>
        </div>
        <div className="s2-right">
          <div className="s2-bubble" style={{ animationDelay: "0.5s" }}>
            "Should we partner with CATL for<br />our Gen-4 battery? Who has the full picture?"
          </div>
          <div className="s2-tools">
            {tools.map((t, i) => (
              <div key={t.label} className="s2-tool" style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
                <div className="s2-tool-icon" style={{ background: t.color }}>{t.letter}</div>
                <div className="s2-tool-name">{t.label}</div>
                <div className="s2-badge">{t.badge}</div>
              </div>
            ))}
          </div>
          <div className="s2-stat-row" style={{ animationDelay: "1.1s" }}>
            <div className="s2-stat"><span className="s2-stat-n">70%</span><span className="s2-stat-l">rely on manual data collection</span></div>
            <div className="s2-stat"><span className="s2-stat-n">2×</span><span className="s2-stat-l">slower launches with siloed knowledge</span></div>
          </div>
        </div>
      </div>
      <div className="scene-footnote">She knows the decision. She doesn't know the path.</div>
    </div>
  );
}

// ─── Scene 3 — Expert Maze ───────────────────────────────────────────────────
function Scene3() {
  return (
    <div className="scene scene3">
      <div className="scene-eyebrow">Meet the Experts</div>
      <h2 className="scene-title-sm">The experts exist.<br /><span className="accent">But they're invisible to Sarah.</span></h2>
      <div className="s3-experts">
        <div className="s3-expert-card" style={{ animationDelay: "0.15s" }}>
          <div className="s3-expert-avatar-col">
            <LottieAvatar src={LOTTIE_EXPERT1} initials="LM" gradient="linear-gradient(135deg,#1e3a8a,#3b82f6)" size={200} />
          </div>
          <div className="s3-expert-info-col">
            <div className="s3-expert-label">Expert 01</div>
            <div className="s3-expert-name">Dr. L. Müller</div>
            <div className="s3-expert-role">Battery Technology Expert</div>
            <div className="s3-expert-quote">"Same question. 4th time this month."</div>
            <div className="s3-pings-inline">
              {[0,1,2,3].map(i => <div key={i} className="s3-ping-dot" style={{ animationDelay:`${0.6+i*0.25}s` }} />)}
            </div>
          </div>
        </div>

        <div className="s3-vs-divider">
          <div className="s3-vs-line" />
          <div className="s3-vs-badge">No Link</div>
          <div className="s3-vs-line" />
        </div>

        <div className="s3-expert-card" style={{ animationDelay: "0.35s" }}>
          <div className="s3-expert-avatar-col">
            <LottieAvatar src={LOTTIE_EXPERT2} initials="TR" gradient="linear-gradient(135deg,#7c2d12,#ea580c)" size={200} />
          </div>
          <div className="s3-expert-info-col">
            <div className="s3-expert-label">Expert 02</div>
            <div className="s3-expert-name">T. Richter</div>
            <div className="s3-expert-role">Supply Chain &amp; Risk Expert</div>
            <div className="s3-expert-quote">"Nobody told me Sarah needed this."</div>
            <div className="s3-pings-inline">
              {[0,1,2].map(i => <div key={i} className="s3-ping-dot" style={{ animationDelay:`${0.8+i*0.25}s`, background:"rgba(234,88,12,0.7)" }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="scene-footnote">The knowledge exists. It is just not connected.</div>
    </div>
  );
}

// ─── Scene 4 — Hidden Conflict ───────────────────────────────────────────────
function Scene4() {
  return (
    <div className="scene scene4">
      <div className="scene-eyebrow">The Hidden Risk</div>
      <h2 className="scene-title-sm">Worse — they disagree.<br /><span className="accent-amber">And nobody knows.</span></h2>
      <div className="s4-cards-row">
        <div className="s4-expert-card" style={{ animationDelay:"0.15s" }}>
          <div className="s4-avatar-col">
            <LottieAvatar src={LOTTIE_EXPERT1} initials="LM" gradient="linear-gradient(135deg,#1e3a8a,#3b82f6)" size={160} />
          </div>
          <div className="s4-info-col">
            <div className="s3-expert-label">Expert 01</div>
            <div className="s4-expert-name">Dr. L. Müller</div>
            <div className="s4-expert-role">Battery Technology Expert</div>
            <div className="s4-stance-pill green" style={{ animationDelay:"0.4s" }}>✓ CATL LFP is market-ready now</div>
            <div className="s4-team-note" style={{ animationDelay:"0.6s" }}>PM Team A → <strong>Partnership approved ✓</strong></div>
          </div>
        </div>

        <div className="s4-wall">
          <div className="s4-wall-line" />
          <div className="s4-conflict-badge" style={{ animationDelay:"0.8s" }}>
            <div className="s4-conflict-icon">!</div>
            <div className="s4-conflict-title">Conflict</div>
            <div className="s4-conflict-sub">Inconsistent decisions</div>
          </div>
          <div className="s4-wall-line" />
        </div>

        <div className="s4-expert-card" style={{ animationDelay:"0.3s" }}>
          <div className="s4-avatar-col">
            <LottieAvatar src={LOTTIE_EXPERT2} initials="TR" gradient="linear-gradient(135deg,#7c2d12,#ea580c)" size={160} />
          </div>
          <div className="s4-info-col">
            <div className="s3-expert-label">Expert 02</div>
            <div className="s4-expert-name">T. Richter</div>
            <div className="s4-expert-role">Supply Chain &amp; Risk Expert</div>
            <div className="s4-stance-pill red" style={{ animationDelay:"0.55s" }}>✗ Hold — China supply chain risk</div>
            <div className="s4-team-note" style={{ animationDelay:"0.75s" }}>PM Team B → <strong>On Hold ✗</strong></div>
          </div>
        </div>
      </div>
      <div className="scene-footnote">Same question. Opposite answers. Nobody noticed.</div>
    </div>
  );
}

// ─── Scene 5 — Solution ──────────────────────────────────────────────────────
function Scene5() {
  const connectors = [
    { l:"G", bg:"#ea4335", name:"Gmail", delay:"0.6s" },
    { l:"J", bg:"#0052cc", name:"Jira", delay:"0.75s" },
    { l:"S", bg:"#611f69", name:"Slack", delay:"0.9s" },
    { l:"T", bg:"#4f52b2", name:"Teams", delay:"1.05s" },
  ];
  const steps = [
    { n:"01", label:"Capture", desc:"AI scans Gmail, Jira, Slack and Teams for expert knowledge" },
    { n:"02", label:"Detect", desc:"Surfaces conflicts between experts automatically" },
    { n:"03", label:"Translate", desc:"Delivers a scored Decision Brief translated to business language" },
  ];
  return (
    <div className="scene scene5">
      <div className="scene-eyebrow">The Solution</div>
      <div className="s5-header">
        <img src="/teamphotos/brand.png" alt="DecisionBridge" className="s5-logo-img" />
        <div>
          <h1 className="s5-title">DecisionBridge</h1>
          <p className="s5-tagline">AI-powered decision briefs from your team's existing tools</p>
        </div>
      </div>
      <div className="s5-connectors-row">
        {connectors.map(c => (
          <div key={c.name} className="s5-chip" style={{ animationDelay:c.delay }}>
            <span className="s5-chip-icon" style={{ background:c.bg }}>{c.l}</span>
            <span>{c.name}</span>
          </div>
        ))}
        <div className="s5-arrow-inline" style={{ animationDelay:"1.2s" }}>→</div>
        <img src="/teamphotos/brand.png" alt="DB" className="s5-db-node" style={{ animationDelay:"1.3s" } as React.CSSProperties} />
        <div className="s5-arrow-inline" style={{ animationDelay:"1.4s" }}>→</div>
        <div className="s5-brief-chip" style={{ animationDelay:"1.5s" }}>Decision Brief</div>
      </div>
      <div className="s5-steps">
        {steps.map((s, i) => (
          <div key={i} className="s5-step" style={{ animationDelay:`${0.3+i*0.18}s` }}>
            <div className="s5-step-n">{s.n}</div>
            <div className="s5-step-body">
              <div className="s5-step-label">{s.label}</div>
              <div className="s5-step-desc">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scene 6 — USP ───────────────────────────────────────────────────────────
function Scene6() {
  const usps = [
    { num: "01", title: "Zero data entry", line: "Pulls knowledge from your existing tools automatically", grad: "linear-gradient(135deg,#1e40af,#3b82f6)" },
    { num: "02", title: "Conflict detection", line: "Surfaces expert disagreements before the PM decides", grad: "linear-gradient(135deg,#7c3aed,#a78bfa)" },
    { num: "03", title: "Readiness score", line: "Live 0–100 signal — is it safe to decide right now?", grad: "linear-gradient(135deg,#b45309,#d97706)" },
  ];
  return (
    <div className="scene scene6">
      <div className="scene-eyebrow">Why DecisionBridge</div>
      <h2 className="scene-title-sm usp-title">Three things <span className="accent">no competitor does</span></h2>
      <div className="s6-usps">
        {usps.map((u, i) => (
          <div key={i} className="s6-usp-card" style={{ animationDelay:`${0.2+i*0.18}s` }}>
            <div className="s6-usp-orb" style={{ background: u.grad }}>{u.num}</div>
            <div className="s6-usp-title">{u.title}</div>
            <div className="s6-usp-line">{u.line}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scene 7 — Market ────────────────────────────────────────────────────────
function Scene7() {
  const stats = [
    { n: "$565B", l: "EV market 2025, rising to $3.5T by 2034", src: "MarketDataForecast, 2025" },
    { n: "70%", l: "of EV manufacturers rely on manual data collection", src: "LTIMindtree, 2025" },
    { n: "2×", l: "slower launches for OEMs with siloed knowledge", src: "McKinsey, 2024" },
  ];
  const investors = [
    { name: "BMW i Ventures", focus: "$300M Fund III — EV AI & industrial software" },
    { name: "Breakthrough Energy", focus: "$839M Fund III — climate tech & EV supply chain" },
    { name: "Porsche Ventures", focus: "AI & mobility software" },
    { name: "Eclipse Ventures", focus: "EV deep-tech & industrial transformation" },
  ];
  return (
    <div className="scene scene7">
      <div className="scene-eyebrow">Market</div>
      <h2 className="scene-title-sm">Built for every industry</h2>
      <div className="s7-stats">
        {stats.map((s, i) => (
          <div key={i} className="s7-stat-card" style={{ animationDelay:`${0.15+i*0.18}s` }}>
            <div className="s7-stat-n">{s.n}</div>
            <div className="s7-stat-l">{s.l}</div>
            <div className="s7-stat-src">{s.src}</div>
          </div>
        ))}
      </div>
      <div className="s7-investors" style={{ animationDelay:"0.65s" }}>
        <div className="s7-inv-label">Investors already backing this space</div>
        <div className="s7-inv-row">
          {investors.map((inv, i) => (
            <div key={i} className="s7-inv-card" style={{ animationDelay:`${0.7+i*0.12}s` }}>
              <div className="s7-inv-name">{inv.name}</div>
              <div className="s7-inv-focus">{inv.focus}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scene 8 — Competition ───────────────────────────────────────────────────
function Scene8() {
  const comps = [
    { name: "Palantir Foundry", miss: "Data ops, not decision capture",  pos: "top-left" },
    { name: "Atlassian Confluence", miss: "Unstructured, not decision-native",  pos: "top-right" },
    { name: "MS Copilot", miss: "Generic, no conflict detection", pos: "bottom-left" },
    { name: "Bloomfire / Guru", miss: "No readiness score or domain depth", pos: "bottom-right" },
  ];
  return (
    <div className="scene scene8">
      <div className="scene-eyebrow">Competition</div>
      <h2 className="scene-title-sm">Purpose-built where <span className="accent">others are generic</span></h2>
      <div className="orbit-wrap">
        <div className="orbit-ring" />
        {/* Spoke lines */}
        <div className="orbit-spoke orbit-spoke-tl" />
        <div className="orbit-spoke orbit-spoke-tr" />
        <div className="orbit-spoke orbit-spoke-bl" />
        <div className="orbit-spoke orbit-spoke-br" />
        {/* Competitors — one in each quadrant */}
        {comps.map((c, i) => (
          <div key={i} className={`orbit-comp orbit-${c.pos}`} style={{ animationDelay:`${0.4+i*0.15}s` }}>
            <div className="orbit-comp-name">{c.name}</div>
            <div className="orbit-comp-miss">✗ {c.miss}</div>
          </div>
        ))}
        {/* Center */}
        <div className="orbit-center">
          <img src="/teamphotos/brand.png" alt="DecisionBridge" className="orbit-db-logo" />
          <div className="orbit-db-name">DecisionBridge</div>
          <div className="orbit-db-checks">
            <span>✓ Auto-capture</span>
            <span>✓ Conflicts</span>
            <span>✓ Score</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 9 — Business Model ─────────────────────────────────────────────────
function Scene9() {
  const tiers = [
    {
      name: "Starter", price: "Free", sub: "up to 5 decisions/month",
      features: ["3 workspace connectors", "Basic readiness score", "PDF brief export"],
      highlight: false,
    },
    {
      name: "Growth", price: "€20", sub: "/seat/month",
      features: ["All 6 connectors", "Conflict detection", "Unlimited decisions", "Team knowledge base"],
      highlight: true,
    },
    {
      name: "Enterprise", price: "Custom", sub: "volume pricing",
      features: ["SSO & audit log export", "Custom connectors", "SLA + support", "On-premise option"],
      highlight: false,
    },
  ];
  return (
    <div className="scene scene9">
      <div className="scene-eyebrow">Business Model</div>
      <h2 className="scene-title-sm">SaaS — <span className="accent">pay per seat, start for free</span></h2>
      <div className="bm-tiers">
        {tiers.map((t, i) => (
          <div key={i} className={`bm-tier${t.highlight ? " bm-highlight" : ""}`} style={{ animationDelay:`${0.15+i*0.18}s` }}>
            {t.highlight && <div className="bm-badge">Most popular</div>}
            <div className="bm-name">{t.name}</div>
            <div className="bm-price">{t.price}<span className="bm-sub">{t.sub}</span></div>
            <ul className="bm-features">
              {t.features.map((f, j) => <li key={j}>✓ {f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scene 10 — Team ─────────────────────────────────────────────────────────
function Scene10() {
  const team = [
    { photo:"/teamphotos/nithin.jpeg",  name:"Nithin Valiyaveedu", role:"Full-stack & AI Engineering" },
    { photo:"/teamphotos/narmada.jpeg", name:"Narmada Gunasekaran",            role:"Product & Design" },
    { photo:"/teamphotos/sidhi.jpeg",   name:"Siddhi Shivtarkar",  role:"Business & Strategy" },
    { photo:"/teamphotos/rupa.jpeg",    name:"Rupa Poudel",               role:"UX & Research" },
  ];
  return (
    <div className="scene scene10">
      <div className="scene-eyebrow">Team</div>
      <h2 className="scene-title-sm">Built by <span className="accent">engineers who ship</span></h2>
      <div className="team-cards">
        {team.map((m, i) => (
          <div key={i} className="team-card" style={{ animationDelay:`${0.15+i*0.22}s` }}>
            <img src={m.photo} alt={m.name} className="team-photo" />
            <div className="team-name">{m.name}</div>
            <div className="team-role">{m.role}</div>
          </div>
        ))}
      </div>
      <div className="team-built" style={{ animationDelay:"0.65s" }}>
        <div className="team-built-text">Built at <strong>Infineon Hackathon 2025</strong> — idea to working MVP</div>
      </div>
    </div>
  );
}

// ─── Scene 11 — Demo + CTA ───────────────────────────────────────────────────
function Scene11() {
  return (
    <div className="scene scene11">
      <div className="s11-content">
        <h1 className="s11-headline" style={{ animationDelay:"0.15s" }}>
          Stop Translating.<br />Start Deciding.
        </h1>
        <p className="s11-sub" style={{ animationDelay:"0.35s" }}>Let's build the bridge.</p>
        <div className="s11-qr-wrap" style={{ animationDelay:"0.55s" }}>
          <img src="/teamphotos/QR.png" alt="QR code" className="s11-qr" />
          <div className="s11-qr-label">Scan to try it live</div>
        </div>
        <a href="https://web-unfold-react.vercel.app/auth" target="_blank" rel="noopener noreferrer" className="s11-demo-btn" style={{ animationDelay:"0.75s" } as React.CSSProperties} onClick={e => e.stopPropagation()}>
          Launch live demo
        </a>
      </div>
    </div>
  );
}

const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7, Scene8, Scene9, Scene10, Scene11];
const SCENE_LABELS = [
  "Problem", "Meet Sarah", "Expert Maze", "Hidden Conflict",
  "Solution", "USP", "Market", "Competition", "Business Model", "Team", "Demo & CTA",
];

// ─── Print mode ───────────────────────────────────────────────────────────────
function PrintDeck() {
  return (
    <div className="print-root">
      <style>{CSS}</style>
      <style>{`
        @page { size: 1280px 720px; margin: 0; }
        html, body { margin: 0; padding: 0; background: #0a0f1e; }
        .print-root { display: flex; flex-direction: column; align-items: center; gap: 0; }
        /* Screen: scale 1280×720 to fit viewport width */
        .print-outer {
          width: 100vw;
          height: calc(100vw * 720 / 1280);
          position: relative; overflow: hidden;
        }
        .print-slide {
          width: 1280px; height: 720px;
          position: absolute; top: 0; left: 0;
          transform-origin: top left;
          transform: scale(calc(100vw / 1280));
          background: linear-gradient(120deg,#0a2580 0%,#1a4fad 38%,#5a8a45 65%,#c4922a 100%);
          overflow: hidden;
          color: #fff; font-family: 'Outfit', sans-serif;
        }
        .print-slide .scene { width: 1280px; height: 720px; flex-shrink: 0; }
        .print-slide * {
          animation: none !important; opacity: 1 !important;
          transition: none !important;
        }
        /* Only kill transform on non-lottie elements — keep layout transforms */
        .print-slide .pitch-fwd, .print-slide .pitch-back { transform: none !important; }
        .print-slide::before {
          content:''; position:absolute; inset:0;
          background-image: linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px);
          background-size: 60px 60px; pointer-events:none; z-index:0;
        }
        .print-slide-label {
          position: absolute; top: 20px; left: 28px; z-index: 10;
          font-size: 11px; font-weight: 600; letter-spacing:.16em;
          text-transform: uppercase; color: rgba(255,255,255,0.45);
        }
        .print-slide-num {
          position: absolute; top: 20px; right: 28px; z-index: 10;
          font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.45);
        }
        /* Print: remove scaling, each slide is exactly one page */
        @media print {
          html, body { background: white; }
          .print-outer {
            width: 1280px; height: 720px;
            page-break-after: always; break-after: page;
            page-break-inside: avoid; break-inside: avoid;
          }
          .print-slide { transform: none; position: relative; }
          .print-btn { display: none !important; }
        }
        .print-btn {
          position: fixed; bottom: 28px; right: 28px; z-index: 999;
          background: #fff; color: #0a2580;
          border: none; border-radius: 10px; padding: 12px 28px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: 'Outfit', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .print-btn:hover { background: #eef; }
      `}</style>
      <button className="print-btn" onClick={() => window.print()}>
        Save as PDF
      </button>
      {SCENES.map((SceneComp, i) => (
        <div key={i} className="print-outer">
          <div className="print-slide">
            <div className="print-slide-label">{SCENE_LABELS[i]}</div>
            <div className="print-slide-num">{i + 1} / {SCENES.length}</div>
            <SceneComp />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main deck ────────────────────────────────────────────────────────────────
function PitchDeck() {
  const [isPrint, setIsPrint] = useState(false);
  const [scene, setScene] = useState(0);

  useEffect(() => {
    setIsPrint(new URLSearchParams(window.location.search).has('print'));
  }, []);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const sceneRef = useRef(0);

  const go = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(TOTAL - 1, next));
    if (clamped === sceneRef.current) return;
    setDir(clamped > sceneRef.current ? "fwd" : "back");
    sceneRef.current = clamped;
    setScene(clamped);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(sceneRef.current + 1);
      if (e.key === "ArrowLeft") go(sceneRef.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const handleClick = (e: React.MouseEvent) => {
    const half = window.innerWidth / 2;
    go(e.clientX > half ? sceneRef.current + 1 : sceneRef.current - 1);
  };

  if (isPrint) return <PrintDeck />;

  const SceneComponent = SCENES[scene];

  return (
    <div className="pitch-root" onClick={handleClick}>
      <style>{CSS}</style>
      <div className="pitch-counter">{scene + 1} / {TOTAL}</div>
      <div className="pitch-scene-label">{SCENE_LABELS[scene]}</div>
      <div className={`pitch-stage pitch-${dir}`} key={scene}>
        <SceneComponent />
      </div>
      <div className="pitch-progress">
        {SCENES.map((_, i) => (
          <div key={i} className={`pitch-seg${i <= scene ? " active" : ""}`} onClick={e => { e.stopPropagation(); go(i); }} />
        ))}
      </div>
      <div className="pitch-hint-left" onClick={e => { e.stopPropagation(); go(scene - 1); }}>‹</div>
      <div className="pitch-hint-right" onClick={e => { e.stopPropagation(); go(scene + 1); }}>›</div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --card:rgba(255,255,255,0.10);
  --card-strong:rgba(255,255,255,0.16);
  --red:#ff6b6b;--blue:#60a5fa;
  --text:#ffffff;--muted:rgba(255,255,255,0.65);
  --border:rgba(255,255,255,0.22);
  --font:'Outfit',sans-serif;
}
.pitch-root{position:fixed;inset:0;background:linear-gradient(120deg,#0a2580 0%,#1a4fad 38%,#5a8a45 65%,#c4922a 100%);font-family:var(--font);color:var(--text);overflow:hidden;cursor:pointer;user-select:none;}
.pitch-root::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;}
.pitch-counter{position:fixed;top:24px;right:32px;font-size:14px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:.08em;z-index:100;}
.pitch-scene-label{position:fixed;top:24px;left:32px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:.14em;z-index:100;}
.pitch-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
.pitch-fwd{animation:slide-in-fwd 0.38s cubic-bezier(0.22,1,0.36,1) both;}
.pitch-back{animation:slide-in-back 0.38s cubic-bezier(0.22,1,0.36,1) both;}
@keyframes slide-in-fwd{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
@keyframes slide-in-back{from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}
.pitch-progress{position:fixed;bottom:0;left:0;right:0;display:flex;height:4px;z-index:100;}
.pitch-seg{flex:1;background:rgba(255,255,255,0.12);cursor:pointer;transition:background 0.3s;}
.pitch-seg+.pitch-seg{margin-left:2px;}
.pitch-seg.active{background:rgba(255,255,255,0.9);}
.pitch-hint-left,.pitch-hint-right{position:fixed;top:50%;transform:translateY(-50%);font-size:32px;color:rgba(255,255,255,0.2);transition:color 0.2s;z-index:100;padding:16px;cursor:pointer;line-height:1;}
.pitch-hint-left{left:8px;}.pitch-hint-right{right:8px;}
.pitch-hint-left:hover,.pitch-hint-right:hover{color:rgba(255,255,255,0.6);}

/* ── Common ── */
.scene{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 56px 36px;gap:20px;position:relative;}
.scene>*{position:relative;z-index:1;}

.scene-eyebrow{font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,0.52);animation:fade-up 0.4s 0.05s both;font-family:var(--font);}
.scene-title{font-size:clamp(3.2rem,6.5vw,5.5rem);font-weight:800;line-height:1.05;text-align:center;animation:fade-up 0.4s 0.1s both;text-shadow:0 4px 32px rgba(0,0,0,0.25);letter-spacing:-.02em;}
.scene-title-sm{font-size:clamp(2.4rem,4.5vw,3.8rem);font-weight:800;line-height:1.1;text-align:center;animation:fade-up 0.4s 0.1s both;text-shadow:0 3px 24px rgba(0,0,0,0.22);letter-spacing:-.02em;}
.scene-sub{font-size:clamp(1rem,1.8vw,1.25rem);color:var(--muted);text-align:center;max-width:680px;line-height:1.7;animation:fade-up 0.4s 0.2s both;font-family:var(--font);}
.scene-footnote{font-size:clamp(0.75rem,1.2vw,0.9rem);color:rgba(255,255,255,0.45);text-align:center;border-top:1px solid rgba(255,255,255,0.12);padding-top:12px;width:100%;max-width:800px;animation:fade-up 0.4s 0.3s both;font-family:var(--font);}
.accent{color:#fff;}.accent-amber{color:rgba(255,255,255,0.9);}

/* Accent text — slightly brighter/bolder than the base */
.scene-title .accent,.scene-title-sm .accent{
  color:#fff;font-weight:900;
}
.scene-title-sm .accent-amber{
  color:#fff;font-weight:900;
}

@keyframes fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes pop-in{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}60%{transform:translateX(5px)}}
@keyframes ping-fall{from{opacity:1;transform:translateY(-30px)}to{opacity:0;transform:translateY(10px)}}
@keyframes pulse-glow-w{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 28px 6px rgba(255,255,255,0.2)}}
@keyframes count-bar{from{width:0}}

/* ── Glass card base ── */
.glass{background:var(--card);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:16px;}

/* ── Persona card ── */
.persona-card{display:flex;align-items:center;gap:16px;background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:16px;padding:20px 26px;animation:pop-in 0.35s both;}
.persona-name{font-size:24px;font-weight:800;color:#fff;font-family:var(--font);}
.persona-role{font-size:16px;color:var(--muted);margin-top:4px;}
.persona-company{font-size:15px;color:rgba(255,255,255,0.8);margin-top:6px;font-weight:600;}

/* ── Scene 1 ── */
.s1-cards{display:flex;gap:20px;flex-wrap:wrap;justify-content:center;width:100%;max-width:1000px;}
.s1-card{background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:20px;padding:28px 30px;text-align:left;flex:1;min-width:240px;animation:pop-in 0.35s both,float 3.5s ease-in-out infinite;position:relative;}
.s1-card-num{font-size:11px;font-weight:700;letter-spacing:.18em;color:rgba(255,255,255,0.35);text-transform:uppercase;margin-bottom:14px;font-family:var(--font);}
.s1-card-q{font-size:clamp(0.95rem,1.6vw,1.15rem);font-weight:700;color:#fff;line-height:1.45;margin-bottom:12px;font-family:var(--font);}
.s1-pain{font-size:clamp(0.8rem,1.2vw,0.95rem);color:rgba(255,255,255,0.55);font-weight:400;line-height:1.4;}

/* ── Scene 2 ── */
.s2-layout{display:flex;gap:56px;align-items:center;justify-content:center;width:100%;max-width:1140px;}
.s2-left{display:flex;flex-direction:column;align-items:center;gap:16px;}
.s2-right{display:flex;flex-direction:column;gap:20px;flex:1;}
.s2-bubble{background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.28);border-radius:16px 16px 16px 4px;padding:22px 30px;font-size:20px;font-weight:600;color:#fff;max-width:560px;text-align:center;line-height:1.55;animation:pop-in 0.35s both;}
.s2-tools{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;}
.s2-tool{display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--card);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:14px;padding:16px 20px;animation:pop-in 0.35s both,shake 0.6s 1.2s ease-in-out;position:relative;}
.s2-tool-icon{width:46px;height:46px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;}
.s2-tool-name{font-size:14px;color:var(--muted);font-weight:600;}
.s2-badge{position:absolute;top:-8px;right:-8px;background:var(--red);color:#fff;font-size:11px;font-weight:800;border-radius:999px;padding:3px 8px;min-width:24px;text-align:center;animation:pop-in 0.3s 1.0s both;}
.s2-stat-row{display:flex;gap:16px;animation:fade-up 0.35s both;}
.s2-stat{background:var(--card);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:14px;padding:18px 22px;display:flex;flex-direction:column;gap:6px;flex:1;}
.s2-stat-n{font-size:32px;font-weight:800;background:linear-gradient(135deg,#f8c94b,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.s2-stat-l{font-size:15px;color:var(--muted);line-height:1.4;}

/* ── Scene 3 ── */
.s3-experts{display:flex;align-items:center;gap:16px;width:100%;max-width:1160px;justify-content:center;}
.s3-expert-card{flex:1;display:flex;align-items:center;gap:24px;background:rgba(255,255,255,0.13);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1.5px solid rgba(255,255,255,0.32);border-radius:24px;padding:24px 26px;animation:pop-in 0.4s both;box-shadow:0 8px 40px rgba(0,0,0,0.18);}
.s3-expert-avatar-col{flex-shrink:0;}
.s3-expert-info-col{display:flex;flex-direction:column;gap:7px;flex:1;}
.s3-expert-label{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);}
.s3-expert-name{font-size:26px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-.01em;}
.s3-expert-role{font-size:14px;color:rgba(255,255,255,0.7);font-weight:500;}
.s3-expert-quote{font-size:15px;color:rgba(255,255,255,0.85);font-style:italic;background:rgba(255,255,255,0.08);border-left:3px solid rgba(255,255,255,0.4);border-radius:0 8px 8px 0;padding:9px 14px;margin-top:4px;line-height:1.5;}
.s3-pings-inline{display:flex;gap:6px;margin-top:4px;}
.s3-ping-dot{width:8px;height:8px;border-radius:50%;background:rgba(96,165,250,0.7);animation:pop-in 0.25s both;}
.s3-vs-divider{display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 8px;flex-shrink:0;}
.s3-vs-line{width:1px;flex:1;background:rgba(255,255,255,0.18);}
.s3-vs-badge{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,0.35);white-space:nowrap;writing-mode:vertical-rl;text-orientation:mixed;}

/* ── Scene 4 ── */
/* Scene 4 — tighter title, wider cards, natural height */
.scene4{gap:16px;}
.scene4 .scene-title-sm{font-size:clamp(2rem,3.8vw,3rem);margin-bottom:4px;}
.s4-cards-row{display:flex;align-items:center;gap:16px;width:100%;max-width:1160px;justify-content:center;}
.s4-expert-card{flex:1;min-width:0;display:flex;align-items:center;gap:20px;background:rgba(255,255,255,0.13);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1.5px solid rgba(255,255,255,0.32);border-radius:24px;padding:28px 26px;animation:pop-in 0.4s both;box-shadow:0 8px 40px rgba(0,0,0,0.18);}
.s4-avatar-col{flex-shrink:0;}
.s4-info-col{display:flex;flex-direction:column;gap:12px;flex:1;min-width:0;}
.s4-expert-name{font-size:22px;font-weight:800;color:#fff;line-height:1.15;white-space:nowrap;}
.s4-expert-role{font-size:13px;color:rgba(255,255,255,0.7);font-weight:500;}
.s4-stance-pill{font-size:13px;font-weight:700;padding:6px 13px;border-radius:999px;animation:pop-in 0.3s both;display:inline-block;white-space:nowrap;}
.s4-stance-pill.green{background:rgba(255,255,255,0.15);color:#fff;border:1.5px solid rgba(255,255,255,0.4);}
.s4-stance-pill.red{background:rgba(255,107,107,0.15);color:#ffaaaa;border:1.5px solid rgba(255,107,107,0.45);}
.s4-team-note{font-size:12px;color:var(--muted);background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:7px 12px;line-height:1.55;animation:fade-up 0.35s both;}
.s4-team-note strong{color:#fff;}
.s4-wall{display:flex;flex-direction:column;align-items:center;padding:0 8px;gap:0;flex-shrink:0;align-self:stretch;}
.s4-wall-line{width:2px;flex:1;background:linear-gradient(to bottom,transparent,rgba(245,158,11,0.5),transparent);}
.s4-conflict-badge{background:rgba(245,158,11,0.18);border:2px solid rgba(245,158,11,0.7);color:#fff;border-radius:20px;text-align:center;padding:18px 16px;display:flex;flex-direction:column;align-items:center;gap:6px;animation:pop-in 0.35s both;box-shadow:0 0 40px rgba(245,158,11,0.25),inset 0 1px 0 rgba(255,255,255,0.1);min-width:120px;}
.s4-conflict-icon{width:48px;height:48px;border-radius:50%;background:rgba(245,158,11,0.9);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff;line-height:1;box-shadow:0 0 20px rgba(245,158,11,0.5);}
.s4-conflict-title{font-size:18px;font-weight:800;color:#fbbf24;letter-spacing:.02em;}
.s4-conflict-sub{font-size:11px;font-weight:600;color:rgba(255,255,255,0.7);text-align:center;line-height:1.4;white-space:nowrap;}

/* ── Scene 5 — Solution ── */
.s5-header{display:flex;align-items:center;gap:22px;animation:fade-up 0.4s 0.05s both;}
.s5-logo-img{width:64px;height:64px;border-radius:16px;object-fit:cover;animation:pop-in 0.4s both,pulse-glow-w 2.5s 0.5s ease-in-out infinite;flex-shrink:0;box-shadow:0 4px 20px rgba(0,0,0,0.3);}
.s5-title{font-size:clamp(2rem,4vw,3.2rem);font-weight:800;letter-spacing:-.02em;color:#fff;}
.s5-tagline{font-size:15px;color:var(--muted);margin-top:5px;}
.s5-connectors-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;animation:fade-up 0.4s 0.2s both;}
.s5-chip{display:flex;align-items:center;gap:8px;background:var(--card);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:999px;padding:6px 16px 6px 6px;font-size:14px;font-weight:700;color:#fff;animation:pop-in 0.3s both;}
.s5-chip-icon{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;}
.s5-arrow-inline{font-size:22px;color:rgba(255,255,255,0.7);font-weight:700;animation:fade-in 0.3s both;}
.s5-db-node{width:52px;height:52px;border-radius:14px;object-fit:cover;animation:pop-in 0.35s both,pulse-glow-w 2.5s 1s ease-in-out infinite;box-shadow:0 4px 20px rgba(0,0,0,0.3);}
.s5-brief-chip{background:var(--card);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.28);border-radius:12px;padding:10px 18px;font-size:14px;font-weight:700;color:#fff;animation:pop-in 0.35s both;}
.s5-steps{display:flex;gap:16px;width:100%;max-width:820px;}
.s5-step{flex:1;background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:18px;padding:20px 22px;display:flex;flex-direction:column;gap:8px;animation:fade-up 0.35s both;}
.s5-step-n{font-size:30px;font-weight:900;color:rgba(255,255,255,0.75);line-height:1;}
.s5-step-label{font-size:16px;font-weight:800;color:#fff;}
.s5-step-desc{font-size:13px;color:var(--muted);line-height:1.55;}

/* ── Scene 6 — USP ── */
.usp-title{margin-bottom:6px;}
.s6-usps{display:flex;gap:20px;width:100%;max-width:880px;}
.s6-usp-card{flex:1;background:var(--card);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:24px;padding:34px 26px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;animation:pop-in 0.4s both;transition:transform 0.2s,border-color 0.2s;}
.s6-usp-card:hover{transform:translateY(-4px);border-color:rgba(255,255,255,0.35);}
.s6-usp-orb{width:72px;height:72px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.2);font-family:var(--font);}
.s6-usp-title{font-size:22px;font-weight:800;color:#fff;font-family:var(--font);}
.s6-usp-line{font-size:15px;color:var(--muted);line-height:1.6;max-width:220px;}

/* ── Scene 7 — Market ── */
.s7-stats{display:flex;gap:16px;width:100%;max-width:800px;}
.s7-stat-card{flex:1;background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:18px;padding:22px;text-align:center;animation:pop-in 0.35s both;}
.s7-stat-n{font-size:2.8rem;font-weight:800;color:#fff;font-family:var(--font);letter-spacing:-.02em;}
.s7-stat-l{font-size:13px;color:var(--muted);margin-top:7px;line-height:1.45;}
.s7-stat-src{font-size:11px;color:rgba(255,255,255,0.35);margin-top:6px;}
.s7-investors{display:flex;flex-direction:column;gap:10px;width:100%;max-width:860px;}
.s7-inv-label{font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.16em;font-family:var(--font);}
.s7-inv-row{display:flex;gap:10px;flex-wrap:wrap;}
.s7-inv-card{background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:12px;padding:11px 18px;animation:pop-in 0.3s both;flex:1;min-width:180px;}
.s7-inv-name{font-size:14px;font-weight:800;color:#fff;font-family:var(--font);}
.s7-inv-focus{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.4;}

/* ── Scene 8 — Competition orbit ── */
.orbit-wrap{position:relative;width:600px;height:480px;flex-shrink:0;}
.orbit-ring{position:absolute;width:320px;height:320px;border-radius:50%;border:1px dashed rgba(255,255,255,0.18);top:50%;left:50%;transform:translate(-50%,-50%);animation:fade-in 0.6s 0.2s both;}
.orbit-spoke{position:absolute;top:50%;left:50%;width:130px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.2),transparent);transform-origin:left center;}
.orbit-spoke-tl{transform:rotate(-135deg);}.orbit-spoke-tr{transform:rotate(-45deg);}
.orbit-spoke-bl{transform:rotate(135deg);}.orbit-spoke-br{transform:rotate(45deg);}
.orbit-comp{position:absolute;display:flex;flex-direction:column;align-items:center;gap:6px;animation:pop-in 0.4s both;}
.orbit-top-left{top:16px;left:16px;}.orbit-top-right{top:16px;right:16px;}
.orbit-bottom-left{bottom:16px;left:16px;}.orbit-bottom-right{bottom:16px;right:16px;}
.orbit-comp-name{background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;font-size:13px;font-weight:700;color:rgba(255,255,255,0.55);text-align:center;}
.orbit-comp-miss{font-size:11px;color:#ff9f9f;font-weight:700;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.25);border-radius:6px;padding:3px 10px;white-space:nowrap;}
.orbit-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:8px;z-index:2;}
.orbit-db-logo{width:96px;height:96px;border-radius:24px;object-fit:cover;box-shadow:0 0 50px rgba(255,255,255,0.3),0 0 100px rgba(255,255,255,0.1);animation:pulse-glow-w 2s ease-in-out infinite;}
.orbit-db-name{font-size:15px;font-weight:800;color:#fff;white-space:nowrap;}
.orbit-db-checks{display:flex;flex-direction:column;align-items:center;gap:4px;}
.orbit-db-checks span{font-size:12px;font-weight:700;color:#fff;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:999px;padding:3px 13px;white-space:nowrap;}

/* ── Scene 9 — Business Model ── */
.bm-tiers{display:flex;gap:16px;width:100%;max-width:840px;}
.bm-tier{flex:1;background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:20px;padding:26px 22px;display:flex;flex-direction:column;gap:10px;position:relative;animation:pop-in 0.35s both;}
.bm-highlight{border-color:rgba(255,255,255,0.4);box-shadow:0 0 40px rgba(255,255,255,0.08);}
.bm-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.95);color:#0a2580;font-size:11px;font-weight:800;padding:4px 14px;border-radius:999px;white-space:nowrap;}
.bm-name{font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;}
.bm-price{font-size:2.2rem;font-weight:800;color:#fff;line-height:1;font-family:var(--font);}
.bm-sub{font-size:13px;font-weight:400;color:var(--muted);display:block;margin-top:3px;}
.bm-features{list-style:none;display:flex;flex-direction:column;gap:7px;margin-top:4px;}
.bm-features li{font-size:13px;color:var(--muted);}
.bm-highlight .bm-features li{color:#fff;}
.bm-note{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,0.08);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:13px 18px;font-size:14px;color:#fff;max-width:840px;animation:fade-up 0.35s both;}

/* ── Scene 10 — Team ── */
.team-cards{display:flex;gap:32px;flex-wrap:wrap;justify-content:center;}
.team-card{background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:28px;padding:36px 40px;display:flex;flex-direction:column;align-items:center;gap:16px;min-width:280px;animation:pop-in 0.35s both;box-shadow:0 8px 40px rgba(0,0,0,0.2);}
.team-photo{width:140px;height:140px;border-radius:50%;object-fit:cover;object-position:top;border:3px solid rgba(255,255,255,0.35);box-shadow:0 0 40px rgba(255,255,255,0.15);}
.team-name{font-size:22px;font-weight:800;color:#fff;text-align:center;font-family:var(--font);}
.team-role{font-size:15px;color:var(--muted);text-align:center;}
.team-built{background:rgba(255,255,255,0.08);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);border-radius:14px;padding:16px 32px;max-width:620px;animation:fade-up 0.35s both;}
.team-built-text{font-size:16px;color:#fff;text-align:center;line-height:1.6;}

/* ── Scene 11 — CTA ── */
.scene11{padding:0;overflow:hidden;position:relative;}
.s11-content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;padding:48px;}
.s11-headline{font-size:clamp(3rem,6.5vw,5.5rem);font-weight:800;text-align:center;color:#fff;line-height:1.08;animation:fade-up 0.5s both;text-shadow:0 4px 32px rgba(0,0,0,0.3);}
.s11-sub{font-size:clamp(1.1rem,2.5vw,1.9rem);font-weight:400;color:rgba(255,255,255,0.85);text-align:center;animation:fade-up 0.45s both;letter-spacing:0.02em;}
.s11-qr-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;animation:pop-in 0.4s both;}
.s11-qr{width:160px;height:160px;border-radius:12px;padding:8px;background:white;object-fit:contain;}
.s11-qr-label{font-size:12px;font-weight:700;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:.12em;}
.s11-demo-btn{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);border:2px solid rgba(255,255,255,0.5);color:#fff;font-family:var(--font);font-size:17px;font-weight:700;padding:15px 40px;border-radius:50px;text-decoration:none;animation:pop-in 0.35s both;cursor:pointer;transition:transform 0.15s,background 0.15s,box-shadow 0.15s;}
.s11-demo-btn:hover{transform:scale(1.04);background:rgba(255,255,255,0.25);box-shadow:0 0 40px rgba(255,255,255,0.2);}
`;
