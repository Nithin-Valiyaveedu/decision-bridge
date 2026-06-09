import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Series,
} from "remotion";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = "#0a0f1e";
const SURFACE = "#0c1628";
const GREEN = "#009b3a";
const GREEN_BRIGHT = "#00cc4e";
const AMBER = "#f59e0b";
const TEXT = "#eaf2ff";
const MUTED = "#6080a0";
const BORDER = "rgba(255,255,255,0.08)";

const font: React.CSSProperties = { fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" };
const mono: React.CSSProperties = { fontFamily: "'Chakra Petch', 'Courier New', monospace" };

// ─── Animation helpers ────────────────────────────────────────────────────────

// Fade + slide in after `delay` frames; duration ~20 frames to settle
function useFadeSlide(delay: number, direction: "up" | "left" = "up", distance = 22) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { stiffness: 130, damping: 24, mass: 0.7 } });
  const opacity = interpolate(f, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const dx = direction === "left" ? interpolate(s, [0, 1], [-distance, 0]) : 0;
  const dy = direction === "up"   ? interpolate(s, [0, 1], [distance, 0]) : 0;
  return { opacity, transform: `translate(${dx}px, ${dy}px)` };
}

// Pop scale entrance after `delay` frames; settles in ~20 frames
function usePopIn(delay: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { stiffness: 200, damping: 22, mass: 0.5 } });
  const opacity = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return { opacity, transform: `scale(${s})` };
}

// ─── Shared layout pieces ─────────────────────────────────────────────────────

// Ghost step number, top-left — appears at frame 0
function StepLabel({ num }: { num: string }) {
  const { opacity, transform } = useFadeSlide(0, "up", 16);
  return (
    <div style={{ position: "absolute", top: 52, left: 80, opacity, transform }}>
      <span style={{ ...mono, fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", color: GREEN, textTransform: "uppercase" }}>Step</span>
      <div style={{ ...mono, fontSize: 88, fontWeight: 700, color: "rgba(0,155,58,0.12)", lineHeight: 1, marginTop: -8 }}>{num}</div>
    </div>
  );
}

function Heading({ text, delay }: { text: string; delay: number }) {
  const { opacity, transform } = useFadeSlide(delay, "up", 28);
  return (
    <div style={{ opacity, transform, ...mono, fontSize: 36, fontWeight: 700, color: TEXT, letterSpacing: "-0.025em", lineHeight: 1.2 }}>
      {text}
    </div>
  );
}

function Subtitle({ text, delay }: { text: string; delay: number }) {
  const { opacity, transform } = useFadeSlide(delay, "up", 14);
  return (
    <div style={{ opacity, transform, ...font, fontSize: 17, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>
      {text}
    </div>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill style={{
        backgroundImage: "radial-gradient(circle, rgba(0,155,58,0.18) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
        maskImage: "radial-gradient(ellipse 90% 80% at 50% 50%, black 20%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 50%, black 20%, transparent 75%)",
      }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 900px 600px at 30% 40%, rgba(0,155,58,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
}

// Scene fade — fades the whole scene in/out at the boundaries
function SceneFade({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn  = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>{children}</AbsoluteFill>;
}

// ─── Scene 1: Capture ─────────────────────────────────────────────────────────
// Timeline (all delays are local frame numbers):
// 0   step label
// 25  heading
// 52  subtitle
// 75  chip 1  →  92 chip 2  →  109 chip 3  →  126 chip 4
// 136 arrow + knowledge base

const CONNECTORS = [
  { letter: "G", name: "Gmail",  bg: "#ea4335" },
  { letter: "J", name: "Jira",   bg: "#0052cc" },
  { letter: "S", name: "Slack",  bg: "#611f69" },
  { letter: "T", name: "Teams",  bg: "#4f52b2" },
];

function ConnectorChip({ letter, name, bg, delay }: { letter: string; name: string; bg: string; delay: number }) {
  const { opacity, transform } = usePopIn(delay);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 18px 10px 10px",
      background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 40,
      opacity, transform,
    }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", ...mono, flexShrink: 0, boxShadow: `0 0 10px ${bg}66` }}>{letter}</span>
      <span style={{ ...font, fontSize: 15, fontWeight: 500, color: MUTED }}>{name}</span>
    </div>
  );
}

function FlowArrow({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const progress = interpolate(f, [0, 28], [0, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", alignItems: "center", opacity }}>
      <div style={{ height: 2, borderRadius: 1, background: `linear-gradient(to right, ${GREEN}, ${GREEN_BRIGHT})`, width: `${progress * 110}px`, boxShadow: `0 0 8px ${GREEN}` }} />
      <span style={{ opacity: progress > 0.85 ? 1 : 0, color: GREEN_BRIGHT, fontSize: 18, marginLeft: 2, filter: `drop-shadow(0 0 4px ${GREEN})` }}>▶</span>
    </div>
  );
}

function KnowledgeBaseBox({ delay }: { delay: number }) {
  const { opacity, transform } = usePopIn(delay);
  return (
    <div style={{ marginTop: 24, padding: "18px 26px", background: "rgba(0,155,58,0.08)", border: `1.5px solid rgba(0,155,58,0.3)`, borderRadius: 14, opacity, transform, display: "inline-flex", alignItems: "center", gap: 14, maxWidth: 380 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,155,58,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📋</div>
      <div>
        <div style={{ ...mono, fontSize: 15, fontWeight: 700, color: GREEN_BRIGHT }}>Knowledge base</div>
        <div style={{ ...font, fontSize: 12, color: MUTED, marginTop: 2 }}>Structured expert insights — ready for decisions</div>
      </div>
    </div>
  );
}

export function Scene1Capture() {
  return (
    <AbsoluteFill style={{ padding: "0 80px", justifyContent: "center" }}>
      <StepLabel num="01" />
      <div style={{ display: "flex", flexDirection: "column", paddingTop: 40 }}>
        <Heading text="Capture expert knowledge" delay={25} />
        <Subtitle text="AI extracts structured findings from your existing tools" delay={52} />
        <div style={{ display: "flex", gap: 14, marginTop: 40, flexWrap: "wrap", alignItems: "center" }}>
          {CONNECTORS.map((c, i) => (
            <ConnectorChip key={c.name} {...c} delay={75 + i * 17} />
          ))}
          <FlowArrow delay={136} />
        </div>
        <KnowledgeBaseBox delay={136} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 2: Conflict detection ─────────────────────────────────────────────
// Timeline:
// 0   step label
// 25  heading
// 52  subtitle
// 72  expert cards slide in (spring ~25 frames)
// 100 conflict badge pops in
// 118 shake effect
// 128 score impact note

function ScoreImpactNote({ delay }: { delay: number }) {
  const { opacity, transform } = useFadeSlide(delay, "up", 10);
  return (
    <div style={{ marginTop: 22, padding: "10px 18px", background: "rgba(245,158,11,0.07)", border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 10, opacity, transform }}>
      <span style={{ color: AMBER, fontSize: 14 }}>⚠</span>
      <span style={{ ...font, fontSize: 13, color: "#d97706" }}>Agreement score reduced · Readiness score lowered to <strong>72%</strong></span>
    </div>
  );
}

export function Scene2Conflicts() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardF = Math.max(0, frame - 72);
  const cardSpring = spring({ frame: cardF, fps, config: { stiffness: 120, damping: 22, mass: 0.8 } });
  const cardsOpacity = interpolate(cardF, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const leftX  = interpolate(cardSpring, [0, 1], [-280, 0]);
  const rightX = interpolate(cardSpring, [0, 1], [280, 0]);

  const badgeF = Math.max(0, frame - 100);
  const badgeS = spring({ frame: badgeF, fps, config: { stiffness: 260, damping: 18, mass: 0.4 } });
  const badgeOpacity = interpolate(badgeF, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const shakeF = Math.max(0, frame - 118);
  const shake = interpolate(shakeF, [0, 4, 8, 12, 16, 20], [0, -6, 6, -4, 4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "0 80px", justifyContent: "center" }}>
      <StepLabel num="02" />
      <div style={{ display: "flex", flexDirection: "column", paddingTop: 40 }}>
        <Heading text="Detect expert conflicts automatically" delay={25} />
        <Subtitle text="When experts disagree, it surfaces before the PM decides" delay={52} />

        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 40, transform: `translateX(${shake}px)` }}>
          {/* Approve card */}
          <div style={{ flex: 1, padding: "22px 24px", background: "rgba(0,155,58,0.08)", border: "1.5px solid rgba(0,155,58,0.3)", borderRadius: 14, opacity: cardsOpacity, transform: `translateX(${leftX}px)` }}>
            <div style={{ ...font, fontSize: 11, fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>✓ Supports</div>
            <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: TEXT }}>Dr. Müller</div>
            <div style={{ ...font, fontSize: 13, color: MUTED, marginTop: 4 }}>Reliability Expert</div>
            <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(0,155,58,0.12)", borderRadius: 8, ...font, fontSize: 13, color: GREEN_BRIGHT, fontWeight: 600 }}>Conditional approval — HTOL not a blocker</div>
          </div>

          {/* Conflict badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: badgeOpacity, transform: `scale(${badgeS})`, flexShrink: 0 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(245,158,11,0.15)", border: `2px solid ${AMBER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 0 20px rgba(245,158,11,0.4)` }}>⚠</div>
            <div style={{ ...font, fontSize: 11, fontWeight: 700, color: AMBER, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", lineHeight: 1.4 }}>{"Conflict\ndetected"}</div>
          </div>

          {/* Reject card */}
          <div style={{ flex: 1, padding: "22px 24px", background: "rgba(239,68,68,0.07)", border: "1.5px solid rgba(239,68,68,0.25)", borderRadius: 14, opacity: cardsOpacity, transform: `translateX(${rightX}px)` }}>
            <div style={{ ...font, fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>✗ Against</div>
            <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: TEXT }}>T. Richter</div>
            <div style={{ ...font, fontSize: 13, color: MUTED, marginTop: 4 }}>Quality Expert</div>
            <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8, ...font, fontSize: 13, color: "#f87171", fontWeight: 600 }}>HTOL outstanding — Hold production ramp</div>
          </div>
        </div>

        <ScoreImpactNote delay={128} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 3: Decision Brief ──────────────────────────────────────────────────
// Timeline:
// 0   step label
// 25  heading
// 52  subtitle
// 72  score ring card pops in
// 88  arc animates 0→72 (over 45 frames, done at 133)
// 95  row 1
// 113 row 2
// 131 row 3
// 142 conflict note

function ScoreRow({ label, val, dot, delay }: { label: string; val: string; dot: string; delay: number }) {
  const { opacity, transform } = useFadeSlide(delay, "left", 16);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity, transform }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0, boxShadow: `0 0 6px ${dot}` }} />
      <span style={{ ...font, fontSize: 14, color: MUTED, flex: 1 }}>{label}</span>
      <span style={{ ...mono, fontSize: 14, fontWeight: 600, color: "rgba(160,176,200,0.9)" }}>{val}</span>
    </div>
  );
}

function ConflictNote({ delay }: { delay: number }) {
  const { opacity, transform } = useFadeSlide(delay, "up", 8);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(245,158,11,0.07)", border: `1px solid rgba(245,158,11,0.18)`, borderRadius: 8, marginTop: 4, opacity, transform }}>
      <span style={{ fontSize: 13, color: AMBER }}>⚠</span>
      <span style={{ ...font, fontSize: 12, color: "#d97706" }}>Conflict detected — agreement score reduced</span>
    </div>
  );
}

export function Scene3Brief() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardF = Math.max(0, frame - 72);
  const cardS = spring({ frame: cardF, fps, config: { stiffness: 120, damping: 24, mass: 0.8 } });
  const cardOpacity = interpolate(cardF, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const scoreVal = Math.round(interpolate(frame, [88, 133], [0, 72], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const r = 72;
  const circ = 2 * Math.PI * r;
  const arcProgress = interpolate(frame, [88, 133], [0, 0.72], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dashOffset = circ * (1 - arcProgress);

  return (
    <AbsoluteFill style={{ padding: "0 80px", justifyContent: "center" }}>
      <StepLabel num="03" />
      <div style={{ display: "flex", gap: 48, alignItems: "center", paddingTop: 30 }}>

        {/* Left: text + rows */}
        <div style={{ flex: 1 }}>
          <Heading text="Generate a structured decision brief" delay={25} />
          <Subtitle text="Readiness score, evidence table, risk assessment — all in one place" delay={52} />

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
            <ScoreRow label="Evidence depth"    val="24 / 30" dot={GREEN} delay={95}  />
            <ScoreRow label="Expert agreement"  val="18 / 40" dot={AMBER} delay={113} />
            <ScoreRow label="Knowledge recency" val="30 / 30" dot={GREEN} delay={131} />
            <ConflictNote delay={142} />
          </div>
        </div>

        {/* Right: animated score ring */}
        <div style={{ width: 260, flexShrink: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "28px 24px", opacity: cardOpacity, transform: `scale(${cardS})`, boxShadow: `0 0 60px rgba(0,0,0,0.5)` }}>
          <svg viewBox="0 0 200 200" width={200} height={200} style={{ display: "block", margin: "0 auto" }}>
            <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
            <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(0,180,68,0.2)" strokeWidth="22" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset} transform="rotate(-90 100 100)" style={{ filter: "blur(6px)" }} />
            <circle cx="100" cy="100" r={r} fill="none" stroke={GREEN} strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset} transform="rotate(-90 100 100)" />
            <text x="100" y="96" textAnchor="middle" style={{ ...mono, fontSize: 36, fontWeight: 700, fill: GREEN_BRIGHT } as React.CSSProperties}>{scoreVal}%</text>
            <text x="100" y="116" textAnchor="middle" style={{ fontSize: 10, fill: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "DM Sans, sans-serif" } as React.CSSProperties}>Readiness</text>
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 4: PM Verdict ──────────────────────────────────────────────────────
// Timeline:
// 0   step label
// 25  heading
// 52  subtitle
// 72  buttons slide up
// 98  click pulse + glow
// 114 approved badge
// 128 timeline dot 1 → 136 dot 2 → 144 dot 3

function TimelineDot({ color, label, delay }: { color: string; label: string; delay: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const opacity = interpolate(f, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const x = interpolate(f, [0, 14], [-14, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, opacity, transform: `translateX(${x}px)` }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
      <span style={{ ...font, fontSize: 13, color: MUTED }}>{label}</span>
    </div>
  );
}

export function Scene4Verdict() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const btnF = Math.max(0, frame - 72);
  const btnOpacity = interpolate(btnF, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const btnY = interpolate(spring({ frame: btnF, fps, config: { stiffness: 140, damping: 24 } }), [0, 1], [30, 0]);

  const clickF = Math.max(0, frame - 98);
  const clickPulse = spring({ frame: clickF, fps, config: { stiffness: 400, damping: 14, mass: 0.3 } });
  const clickScale = interpolate(clickPulse, [0, 0.4, 1], [1, 0.92, 1], { extrapolateRight: "clamp" });
  const approvedGlow = interpolate(clickF, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  const badgeF = Math.max(0, frame - 114);
  const badgeS = spring({ frame: badgeF, fps, config: { stiffness: 220, damping: 20, mass: 0.5 } });
  const badgeOpacity = interpolate(badgeF, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "0 80px", justifyContent: "center" }}>
      <StepLabel num="04" />
      <div style={{ display: "flex", flexDirection: "column", paddingTop: 40 }}>
        <Heading text="PM approves or rejects" delay={25} />
        <Subtitle text="Decision logged with full audit trail, experts notified" delay={52} />

        <div style={{ display: "flex", gap: 16, marginTop: 40, opacity: btnOpacity, transform: `translateY(${btnY}px)` }}>
          <button style={{ flex: 1, padding: "18px 0", background: `rgba(0,155,58,${0.15 + approvedGlow * 0.35})`, border: `2px solid rgba(0,155,58,${0.4 + approvedGlow * 0.4})`, borderRadius: 14, ...mono, fontSize: 17, fontWeight: 700, color: GREEN_BRIGHT, cursor: "pointer", transform: `scale(${clickScale})`, boxShadow: approvedGlow > 0.1 ? `0 0 ${approvedGlow * 32}px rgba(0,155,58,0.5)` : "none" }}>✓ Agree — Proceed</button>
          <button style={{ flex: 1, padding: "18px 0", background: "rgba(239,68,68,0.07)", border: "2px solid rgba(239,68,68,0.2)", borderRadius: 14, ...mono, fontSize: 17, fontWeight: 700, color: "#f87171", cursor: "pointer" }}>✗ Disagree — Hold</button>
        </div>

        <div style={{ marginTop: 20, opacity: badgeOpacity, transform: `scale(${badgeS})`, display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "rgba(0,155,58,0.1)", border: "1.5px solid rgba(0,155,58,0.3)", borderRadius: 12, alignSelf: "flex-start" }}>
          <span style={{ ...mono, fontSize: 15, fontWeight: 700, color: GREEN_BRIGHT }}>✓ Decision approved</span>
          <span style={{ ...font, fontSize: 13, color: MUTED }}>3 experts notified</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
          <TimelineDot color={GREEN} label="Knowledge captured"  delay={128} />
          <TimelineDot color={AMBER}  label="⚠ Conflict detected" delay={136} />
          <TimelineDot color={GREEN} label="✓ PM approved"        delay={144} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Outro (90 frames) ───────────────────────────────────────────────────────
export function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: Math.max(0, frame - 10), fps, config: { stiffness: 100, damping: 22, mass: 0.8 } });
  const opacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const pulse = interpolate(frame % 50, [0, 25, 50], [1, 1.06, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse 600px 400px at 50% 50%, rgba(0,155,58,${opacity * 0.14}) 0%, transparent 65%)` }} />
      <div style={{ opacity, transform: `scale(${s})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 24, fontWeight: 800, color: "#fff", transform: `scale(${pulse})`, boxShadow: `0 0 40px rgba(0,155,58,0.6)` }}>DB</div>
        <div style={{ ...mono, fontSize: 40, fontWeight: 700, color: TEXT, letterSpacing: "-0.025em" }}>DecisionBridge</div>
        <div style={{ ...font, fontSize: 18, color: MUTED, textAlign: "center", lineHeight: 1.55 }}>AI-powered decision templates made easy<br />with connectors from your own workspaces</div>
        <span style={{ ...font, fontSize: 12, fontWeight: 600, color: GREEN, textTransform: "uppercase", letterSpacing: "0.14em", background: "rgba(0,155,58,0.1)", border: "1px solid rgba(0,155,58,0.25)", borderRadius: 20, padding: "5px 16px", marginTop: 8 }}>Built for Infineon · Hackathon 2025</span>
      </div>
    </AbsoluteFill>
  );
}

// ─── Main composition (930 frames = 31s @ 30fps) ─────────────────────────────
// Each main scene: 210 frames (7s) — 150 animation + 60 hold before fade-out
// Outro: 120 frames (4s)
export function HowItWorks() {
  return (
    <AbsoluteFill>
      <Background />
      <Series>
        <Series.Sequence durationInFrames={210}><SceneFade><Scene1Capture /></SceneFade></Series.Sequence>
        <Series.Sequence durationInFrames={210}><SceneFade><Scene2Conflicts /></SceneFade></Series.Sequence>
        <Series.Sequence durationInFrames={210}><SceneFade><Scene3Brief /></SceneFade></Series.Sequence>
        <Series.Sequence durationInFrames={210}><SceneFade><Scene4Verdict /></SceneFade></Series.Sequence>
        <Series.Sequence durationInFrames={120}><SceneFade><Outro /></SceneFade></Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
}
