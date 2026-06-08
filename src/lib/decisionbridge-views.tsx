import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { extractKnowledge } from "@/lib/extract-knowledge.functions";
import { translateDecision, type TranslationResult } from "@/lib/translate-decision.functions";
import { classifyQuestion, type ClassifyResult } from "@/lib/classify-question.functions";
import { addKnowledge, useKnowledge, type Knowledge } from "@/lib/knowledge-store";
import { addTicket, answerTicket, useTickets, type Ticket } from "@/lib/ticket-store";
import { addProject, useProjects, type Project } from "@/lib/project-store";
import {
  adminPeople,
  categoryMap,
  classify,
  type Category,
  type Person,
} from "@/lib/decisionbridge-data";

const ALL_AREAS = [
  "Supplier approval",
  "Manufacturing defect",
  "Pilot batch shipment",
  "Material change",
  "New testing process",
] as const;

const EXPERTS = [
  "Dr. Lukas Müller · Reliability Expert",
  "Anna Weber · Supplier Qualification Expert",
  "Markus Klein · Supply Chain Expert",
  "Thomas Richter · Quality Expert",
  "Maria Hoffmann · Manufacturing Expert",
];

type ScoreBreakdown = {
  evidence: { value: number; max: number; note: string };
  agreement: { value: number; max: number; note: string };
  recency: { value: number; max: number; note: string };
};

type Flow = Category & {
  found: boolean;
  key: string;
  score: number;
  breakdown: ScoreBreakdown;
  evidence: [string, string, string, string][];
  businessImpact: string;
  missingInfo: string[];
  actions: string[];
  expertsConsulted: string[];
};

type ChatMsg = { type: "ai" | "user"; node: ReactNode; id: number };

function getCategoryByArea(area: string): Category | undefined {
  return Object.values(categoryMap).find((c) => c.area === area);
}

const businessImpactByArea: Record<string, string> = {
  "Supplier approval": "Approving Supplier B unlocks ~3 weeks of time-to-market and an estimated €120k in tooling savings, but locks production to a single source until backup qualification completes.",
  "Manufacturing defect": "Every additional day of elevated defect rate adds ~€18k in scrap and risks one customer audit finding. Stopping the line costs ~€40k/day in lost output.",
  "Pilot batch shipment": "Shipping on time protects the lead customer milestone (€2.1M follow-on order). A 1-week slip risks contractual penalty and erodes customer trust.",
  "Packaging material change": "New material reduces unit packaging cost by ~8% but may delay certification by 4–6 weeks if reliability tests fail.",
  "New testing process": "Faster test cycle could lift line throughput by ~12% but a quality escape would expose us to warranty claims worth ~€500k.",
};

const missingInfoByArea: Record<string, string[]> = {
  "Supplier approval": ["Final thermal cycling result (Reliability)", "Buffer-stock plan for first 8 weeks (Supply Chain)"],
  "Manufacturing defect": ["Confirmed root-cause statement", "Quality-gate impact assessment"],
  "Pilot batch shipment": ["Signed quality-gate release", "Confirmed shipping window from customer"],
  "Packaging material change": ["PLM change-control approval", "Long-term reliability test results", "Customer notification status"],
  "New testing process": ["Test repeatability study", "PLM formal change approval", "Customer quality acceptance"],
};

function buildFlow(question: string, kb: Knowledge[], aiResult?: ClassifyResult): Flow {
  const key = aiResult?.categoryKey ?? classify(question);
  const base = categoryMap[key];
  const matching = aiResult && aiResult.matchingIds.length > 0
    ? kb.filter((k) => aiResult.matchingIds.includes(k.id))
    : kb.filter((k) => k.area === base.area);
  const found = matching.length > 0;

  // Score breakdown
  const evidenceMax = 40;
  const evidence = Math.min(evidenceMax, matching.length * 18);
  const agreementMax = 30;
  const uniqueExperts = new Set(matching.map((m) => m.expert)).size;
  const agreement = Math.min(agreementMax, uniqueExperts * 18);
  const recencyMax = 30;
  const newest = matching.reduce((a, b) => Math.max(a, b.createdAt), 0);
  const daysOld = newest ? (Date.now() - newest) / 86400000 : 999;
  const recency = newest ? (daysOld < 30 ? 30 : daysOld < 90 ? 20 : 10) : 0;
  const score = found ? evidence + agreement + recency : 36;

  const breakdown: ScoreBreakdown = {
    evidence: {
      value: evidence,
      max: evidenceMax,
      note: matching.length
        ? `${matching.length} approved entr${matching.length === 1 ? "y" : "ies"} in the knowledge base.`
        : "No approved expert knowledge yet.",
    },
    agreement: {
      value: agreement,
      max: agreementMax,
      note: uniqueExperts
        ? `${uniqueExperts} expert${uniqueExperts === 1 ? "" : "s"} contributed.`
        : "No expert has confirmed yet.",
    },
    recency: {
      value: found ? recency : 0,
      max: recencyMax,
      note: newest
        ? daysOld < 30
          ? "Knowledge added in the last 30 days."
          : daysOld < 90
            ? "Knowledge between 30–90 days old."
            : "Knowledge is older than 90 days — consider refreshing."
        : "No recent expert input.",
    },
  };

  const evidenceRows: [string, string, string, string][] = found
    ? matching.map((k) => [
        k.text.slice(0, 140) + (k.text.length > 140 ? "…" : ""),
        k.source,
        k.expert,
        k.confidence.replace(" confidence", ""),
      ])
    : [["No approved expert knowledge found", "DecisionBridge Knowledge Index", "—", "Low"]];

  return {
    ...base,
    found,
    key,
    score: Math.round(score),
    breakdown,
    evidence: evidenceRows,
    businessImpact: businessImpactByArea[base.area] || "Business impact not yet estimated.",
    missingInfo: missingInfoByArea[base.area] || [],
    actions: [base.next, ...(found ? [] : ["Route open questions to recommended experts and create tickets."])],
    expertsConsulted: found ? Array.from(new Set(matching.map((m) => m.expert))) : [],
  };
}

const EXPERT_DOMAINS: Record<string, { areas: string[]; color: string }> = {
  "Dr. Lukas Müller": { areas: ["Reliability", "Thermal cycling", "Lifetime stress"], color: "#1746a2" },
  "Anna Weber": { areas: ["Supplier qualification", "Approval history", "Decision memory"], color: "#087443" },
  "Markus Klein": { areas: ["Supply chain", "Lead time", "Supplier risk"], color: "#a14b00" },
  "Thomas Richter": { areas: ["Quality gates", "Customer risk", "Failure escape"], color: "#6941c6" },
  "Maria Hoffmann": { areas: ["Manufacturing", "Line compatibility", "Cycle time"], color: "#0b63b6" },
  "Sarah Klein": { areas: ["Project management", "Decision ownership", "Stakeholder alignment"], color: "#667085" },
};

export function AdminView() {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [adminNotice, setAdminNotice] = useState("");
  const [projName, setProjName] = useState("Power Module X");
  const [projUnit, setProjUnit] = useState("Automotive Power Semiconductors");
  const [projPm, setProjPm] = useState("Sarah Klein");
  const [projAreas, setProjAreas] = useState<Set<string>>(
    new Set(["Supplier approval", "Manufacturing defect", "Pilot batch shipment"])
  );
  const kb = useKnowledge();
  const tickets = useTickets();
  const projects = useProjects();

  const toggleArea = (area: string) => {
    const next = new Set(projAreas);
    if (next.has(area)) next.delete(area); else next.add(area);
    setProjAreas(next);
  };

  const onboard = () => {
    if (!projName.trim()) { setAdminNotice("Enter a project name first."); return; }
    if (projAreas.size === 0) { setAdminNotice("Select at least one decision area."); return; }
    const members = Array.from(checked).map((i) => adminPeople[i][0]);
    addProject({
      name: projName.trim(),
      businessUnit: projUnit.trim(),
      pm: projPm.trim(),
      members,
      areas: Array.from(projAreas),
    });
    setChecked(new Set());
    setAdminNotice(`Project "${projName}" created with ${members.length} member(s).`);
  };

  const expertStats = adminPeople.map((p) => {
    const name = p[0];
    const contributions = kb.filter((k) => k.expert === name).length;
    const openTickets = tickets.filter((t) => t.assignedTo === name && t.status === "open").length;
    const answered = tickets.filter((t) => t.assignedTo === name && t.status === "answered").length;
    return { person: p, name, contributions, openTickets, answered };
  });

  return (
    <section className="view">
      <div className="single-layout">
        <div className="panel">
          <h2>Onboard a project</h2>
          <div className="form-grid">
            <div>
              <label>Project name</label>
              <input value={projName} onChange={(e) => setProjName(e.target.value)} />
            </div>
            <div>
              <label>Business unit</label>
              <input value={projUnit} onChange={(e) => setProjUnit(e.target.value)} />
            </div>
            <div>
              <label>Project manager</label>
              <input value={projPm} onChange={(e) => setProjPm(e.target.value)} />
            </div>
          </div>

          <h3>Decision areas for this project</h3>
          <div className="area-check-list">
            {ALL_AREAS.map((area) => (
              <label key={area} className="area-check">
                <input
                  type="checkbox"
                  checked={projAreas.has(area)}
                  onChange={() => toggleArea(area)}
                />
                {area}
              </label>
            ))}
          </div>

          <h3>Select employees to onboard</h3>
          <div className="people-list">
            {adminPeople.map((p, i) => (
              <label key={i} className="person-card check-person">
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={(e) => {
                    const next = new Set(checked);
                    if (e.target.checked) next.add(i); else next.delete(i);
                    setChecked(next);
                  }}
                />
                <div>
                  <strong>{p[0]} · {p[1]}</strong>
                  <span>{p[2]}</span>
                </div>
              </label>
            ))}
          </div>
          <button onClick={onboard}>Create project</button>
          {adminNotice && <div className="notice">{adminNotice}</div>}

          <h3>Active projects</h3>
          {projects.length === 0 ? (
            <div className="empty-box">No projects created yet. Fill in the form above and click Create project.</div>
          ) : (
            <div className="project-list">
              {projects.map((proj) => {
                const kbCount = kb.filter((k) => k.projectId === proj.id).length;
                const ticketCount = tickets.filter((t) => t.projectId === proj.id).length;
                return (
                  <div key={proj.id} className="project-card">
                    <div className="project-card-head">
                      <strong>{proj.name}</strong>
                      <span className="project-unit">{proj.businessUnit}</span>
                    </div>
                    <div className="project-card-meta">
                      <span>PM: {proj.pm}</span>
                      <span>{proj.members.length} member{proj.members.length !== 1 ? "s" : ""}</span>
                      <span>{kbCount} knowledge entr{kbCount !== 1 ? "ies" : "y"}</span>
                      <span>{ticketCount} ticket{ticketCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="project-areas">
                      {proj.areas.map((a) => <span key={a} className="expertise-tag">{a}</span>)}
                    </div>
                    {proj.members.length > 0 && (
                      <div className="project-members">
                        {proj.members.map((m) => (
                          <span key={m} className="member-chip">{m.split(" ").slice(0, 2).join(" ")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <h3>Expertise coverage map</h3>
          <p className="muted">Live overview of who covers what — and how active each expert is in the knowledge base.</p>
          <div className="expertise-grid">
            {expertStats.map(({ person, name, contributions, openTickets, answered }, i) => {
              const domains = EXPERT_DOMAINS[name];
              const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("");
              const color = domains?.color ?? "#667085";
              return (
                <div key={i} className="expertise-card">
                  <div className="expert-initials-badge" style={{ background: color }}>{initials}</div>
                  <div className="expertise-info">
                    <strong>{name}</strong>
                    <span className="expertise-role">{person[1]}</span>
                    <div className="expertise-tags">
                      {(domains?.areas ?? [person[2]]).slice(0, 3).map((a, j) => (
                        <span key={j} className="expertise-tag">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div className="expertise-stats">
                    <div className="expertise-stat">
                      <span className="stat-num">{contributions}</span>
                      <span className="stat-label">contributions</span>
                    </div>
                    <div className="expertise-stat">
                      <span className="stat-num" style={{ color: openTickets > 0 ? "#a14b00" : "#667085" }}>{openTickets}</span>
                      <span className="stat-label">open tickets</span>
                    </div>
                    <div className="expertise-stat">
                      <span className="stat-num" style={{ color: answered > 0 ? "#087443" : "#667085" }}>{answered}</span>
                      <span className="stat-label">answered</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ExpertView() {
  const [expertName, setExpertName] = useState(EXPERTS[0]);
  const [tab, setTab] = useState<"capture" | "tickets" | "sources">("capture");
  const tickets = useTickets();
  const myName = expertName.split(" · ")[0];
  const myOpen = tickets.filter((t) => t.assignedTo === myName && t.status === "open").length;

  return (
    <section className="view">
      <div className="expert-toolbar">
        <div className="expert-id">
          <label>Signed in as</label>
          <select value={expertName} onChange={(e) => setExpertName(e.target.value)}>
            {EXPERTS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="expert-tabs">
          <button className={`expert-tab ${tab === "capture" ? "active" : ""}`} onClick={() => setTab("capture")}>
            Capture knowledge
          </button>
          <button className={`expert-tab ${tab === "tickets" ? "active" : ""}`} onClick={() => setTab("tickets")}>
            My tickets{myOpen > 0 && <span className="tab-badge">{myOpen}</span>}
          </button>
          <button className={`expert-tab ${tab === "sources" ? "active" : ""}`} onClick={() => setTab("sources")}>
            Connected sources
          </button>
        </div>
      </div>
      {tab === "capture" && <ExpertCapturePanel expertName={expertName} />}
      {tab === "tickets" && <ExpertTicketsPanel expertName={expertName} myName={myName} />}
      {tab === "sources" && <ExpertSourcesPanel expertName={expertName} />}
    </section>
  );
}

function ExpertCapturePanel({ expertName }: { expertName: string }) {
  const kb = useKnowledge();
  const projects = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const ps = projects;
    return ps.length > 0 ? ps[0].id : "";
  });
  const activeProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const availableAreas = activeProject ? activeProject.areas : [...ALL_AREAS];
  const [knowledgeArea, setKnowledgeArea] = useState(availableAreas[0] ?? "Supplier approval");
  const [transcript, setTranscript] = useState("");
  const [additionalInsights, setAdditionalInsights] = useState("");
  const [confidence, setConfidence] = useState("High confidence");
  const [expertNotice, setExpertNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<null | {
    summary: string;
    keyPoints: string[];
    recommendedConfidence: string;
    sourceLabel: string;
  }>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!availableAreas.includes(knowledgeArea)) {
      setKnowledgeArea(availableAreas[0] ?? "Supplier approval");
    }
  }, [selectedProjectId]);

  const runExtract = useServerFn(extractKnowledge);

  const generate = async () => {
    setError("");
    if (!transcript.trim() && !additionalInsights.trim()) {
      setError("Paste a meeting transcript or add expert insights first.");
      return;
    }
    setIsGenerating(true);
    setDraft(null);
    try {
      const result = await runExtract({
        data: { knowledgeArea, expertName, transcript, additionalInsights },
      });
      setDraft(result);
      setConfidence(result.recommendedConfidence);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate knowledge.");
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptDraft = () => {
    if (!draft) return;
    const body =
      draft.summary +
      (draft.keyPoints.length ? "\n\nKey points:\n- " + draft.keyPoints.join("\n- ") : "") +
      (additionalInsights.trim() ? "\n\nExpert insights:\n" + additionalInsights.trim() : "");

    addKnowledge({
      area: knowledgeArea,
      expert: expertName.split(" · ")[0],
      text: body,
      source: transcript.trim() ? "Pasted transcript" : (draft.sourceLabel || "Expert manual entry"),
      confidence,
      projectId: selectedProjectId || undefined,
    });
    setDraft(null);
    setTranscript("");
    setAdditionalInsights("");
    setExpertNotice("Knowledge added. PM decision chat can now reuse this knowledge.");
  };

  return (
    <div className="split-layout">
      <div className="panel">
        <h2>Capture expert knowledge from meetings</h2>
        <p className="muted">
          Paste a meeting transcript or type your insights directly. AI drafts a knowledge entry for you to review and approve — available to Project Managers instantly.
        </p>
        <div className="form-grid">
          <div>
            <label>Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">— No project selected —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Knowledge area</label>
            <select value={knowledgeArea} onChange={(e) => setKnowledgeArea(e.target.value)}>
              {availableAreas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label>Confidence</label>
            <select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              <option>High confidence</option>
              <option>Medium confidence</option>
              <option>Low confidence</option>
            </select>
          </div>
        </div>

        <label>Meeting transcript</label>
        <textarea
          className="large-text"
          placeholder="Paste meeting transcript here…"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />

        <label>Additional expert insights (optional)</label>
        <textarea
          className="large-text"
          placeholder="Add anything the transcript misses — context, caveats, decisions…"
          value={additionalInsights}
          onChange={(e) => setAdditionalInsights(e.target.value)}
        />

        <div className="action-row">
          <button onClick={generate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate knowledge with AI"}
          </button>
        </div>

        {error && <div className="notice" style={{ background: "#fdecec", color: "#a02020" }}>{error}</div>}

        {draft && (
          <div className="block draft-block">
            <h3>AI-drafted knowledge entry</h3>
            <p><strong>Summary:</strong> {draft.summary}</p>
            {draft.keyPoints.length > 0 && (
              <>
                <p><strong>Key points:</strong></p>
                <ul>{draft.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </>
            )}
            <p className="muted">Suggested source: {draft.sourceLabel} · Suggested confidence: {draft.recommendedConfidence}</p>
            <div className="action-row">
              <button onClick={acceptDraft}>Add to knowledge base</button>
              <button className="action-btn secondary" onClick={() => setDraft(null)}>Discard draft</button>
            </div>
          </div>
        )}

        {expertNotice && <div className="notice">{expertNotice}</div>}
      </div>
      <aside className="side-info">
        <h3>Knowledge currently available</h3>
        <p className="muted">
          {activeProject ? `Project: ${activeProject.name}` : "All projects"}
        </p>
        {(() => {
          const filtered = activeProject
            ? kb.filter((k) => k.projectId === activeProject.id)
            : kb;
          return filtered.length === 0 ? (
            <div className="empty-box">
              {activeProject
                ? `No knowledge for "${activeProject.name}" yet.`
                : "No expert knowledge added yet."}
            </div>
          ) : (
            <div className="knowledge-feed">
              {filtered.map((k) => {
                const proj = projects.find((p) => p.id === k.projectId);
                return (
                  <div key={k.id} className="knowledge-row">
                    <div className="knowledge-row-head">
                      <strong>{k.area}</strong>
                      {proj && <span className="proj-badge">{proj.name}</span>}
                    </div>
                    <span style={{ whiteSpace: "pre-wrap" }}>{k.expert}: {k.text}</span>
                    <span>Source: {k.source} · {k.confidence}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </aside>
    </div>
  );
}

const CONNECTORS = [
  {
    id: "jira",
    name: "Jira",
    icon: "J",
    color: "#0052CC",
    status: "connected" as const,
    detail: "Power Module X · auto-syncing tickets",
    sampleContent: `TICKET PMX-2847: Supplier B Qualification Status Update
Reporter: Dr. Lukas Müller | Project: Power Module X

Thermal cycling tests for Supplier B completed. 94% pass rate across 1000 cycles — within acceptable threshold. Lifetime stress tests within spec. No degradation anomalies detected. HTOL test still outstanding — expected completion end of month.

Recommendation: Conditional approval for pilot volumes. Full production release should wait for final HTOL confirmation.`,
    sampleArea: "Supplier approval",
    sampleSource: "Auto: Jira · PMX-2847",
  },
  {
    id: "slack",
    name: "Slack",
    icon: "S",
    color: "#4A154B",
    status: "connected" as const,
    detail: "#engineering-decisions · live",
    sampleContent: `Thread: Power Module X — Supplier B Decision
@anna.weber: Supplier qualification audit passed April. OTD rate 96% over 12 months. Quality management system approved. Recommending approval for pilot volumes.
@markus.klein: Lead time is 6 weeks. Current buffer stock covers 8 weeks. Single-source risk until Supplier C qualifies in Q4. Pilot approval now prevents production gaps.
@dr.mueller: Reliability nearly complete. HTOL still running — won't block pilot but should gate full production ramp.`,
    sampleArea: "Supplier approval",
    sampleSource: "Auto: Slack · #engineering-decisions",
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: "G",
    color: "#EA4335",
    status: "configure" as const,
    detail: "Not connected",
    sampleContent: "",
    sampleArea: "",
    sampleSource: "",
  },
  {
    id: "teams",
    name: "Teams",
    icon: "T",
    color: "#6264A7",
    status: "configure" as const,
    detail: "Not connected",
    sampleContent: "",
    sampleArea: "",
    sampleSource: "",
  },
];

function ExpertSourcesPanel({ expertName }: { expertName: string }) {
  const projects = useProjects();
  const kb = useKnowledge();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () => projects[0]?.id ?? ""
  );
  const [simulating, setSimulating] = useState<string | null>(null);
  const [draft, setDraft] = useState<null | {
    summary: string; keyPoints: string[]; recommendedConfidence: string; sourceLabel: string;
    connectorId: string; area: string; source: string;
  }>(null);
  const [notice, setNotice] = useState("");
  const runExtract = useServerFn(extractKnowledge);

  const autoCaptured = kb.filter((k) => k.source.startsWith("Auto:"));

  const simulate = async (connector: typeof CONNECTORS[0]) => {
    if (!connector.sampleContent) return;
    setSimulating(connector.id);
    setDraft(null);
    setNotice("");
    try {
      const result = await runExtract({
        data: {
          knowledgeArea: connector.sampleArea,
          expertName,
          transcript: connector.sampleContent,
          additionalInsights: "",
        },
      });
      setDraft({
        ...result,
        connectorId: connector.id,
        area: connector.sampleArea,
        source: connector.sampleSource,
      });
    } catch {
      setNotice("Could not process incoming content. Check your connection.");
    } finally {
      setSimulating(null);
    }
  };

  const save = () => {
    if (!draft) return;
    const body = draft.summary +
      (draft.keyPoints.length ? "\n\nKey points:\n- " + draft.keyPoints.join("\n- ") : "");
    addKnowledge({
      area: draft.area,
      expert: expertName.split(" · ")[0],
      text: body,
      source: draft.source,
      confidence: draft.recommendedConfidence,
      projectId: selectedProjectId || undefined,
    });
    setDraft(null);
    setNotice("Knowledge captured automatically and added to the base.");
  };

  return (
    <div className="single-layout">
      <div className="panel">
        <h2>Connected sources</h2>
        <p className="muted">
          Knowledge flows in automatically from the tools your team already uses — no manual upload needed.
          Connect once, and every relevant update is extracted and available to decision makers instantly.
        </p>

        {projects.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label>Capture to project</label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
              <option value="">— No project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="connector-grid">
          {CONNECTORS.map((c) => (
            <div key={c.id} className={`connector-card ${c.status}`}>
              <div className="connector-head">
                <div className="connector-icon" style={{ background: c.color }}>{c.icon}</div>
                <div className="connector-info">
                  <strong>{c.name}</strong>
                  <span>{c.detail}</span>
                </div>
                <div className={`connector-dot ${c.status}`} />
              </div>
              {c.status === "connected" ? (
                <button
                  className="action-btn secondary"
                  style={{ width: "100%", marginTop: 12 }}
                  onClick={() => simulate(c)}
                  disabled={simulating === c.id}
                >
                  {simulating === c.id ? "Receiving…" : "Simulate incoming →"}
                </button>
              ) : (
                <button className="action-btn secondary" style={{ width: "100%", marginTop: 12, opacity: .5 }} disabled>
                  Configure
                </button>
              )}
            </div>
          ))}
        </div>

        {draft && (
          <div className="block draft-block" style={{ marginTop: 20 }}>
            <div className="auto-capture-badge">
              Auto-captured from {CONNECTORS.find((c) => c.id === draft.connectorId)?.name}
            </div>
            <h3>Extracted knowledge</h3>
            <p><strong>Summary:</strong> {draft.summary}</p>
            {draft.keyPoints.length > 0 && (
              <>
                <p><strong>Key points:</strong></p>
                <ul>{draft.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </>
            )}
            <p className="muted">Area: {draft.area} · Confidence: {draft.recommendedConfidence}</p>
            <div className="action-row">
              <button onClick={save}>Add to knowledge base</button>
              <button className="action-btn secondary" onClick={() => setDraft(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {notice && <div className="notice">{notice}</div>}

        <h3>Auto-captured entries</h3>
        {autoCaptured.length === 0 ? (
          <div className="empty-box">No auto-captured entries yet. Click "Simulate incoming" on a connected source above.</div>
        ) : (
          <div className="knowledge-feed">
            {autoCaptured.map((k) => (
              <div key={k.id} className="knowledge-row">
                <div className="knowledge-row-head">
                  <strong>{k.area}</strong>
                  <span className="auto-source-badge">{k.source}</span>
                </div>
                <span style={{ whiteSpace: "pre-wrap" }}>{k.expert}: {k.text}</span>
                <span>{k.confidence}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExpertTicketsPanel({ expertName, myName }: { expertName: string; myName: string }) {
  const tickets = useTickets();
  const mine = tickets.filter((t) => t.assignedTo === myName);
  const open = mine.filter((t) => t.status === "open");
  const answered = mine.filter((t) => t.status === "answered");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const send = (t: Ticket) => {
    const answer = (drafts[t.id] || "").trim();
    if (!answer) { setNotice("Write an answer first."); return; }
    answerTicket(t.id, answer);
    addKnowledge({
      area: t.area,
      expert: myName,
      text: `Response to PM question "${t.sourceQuestion}":\n\n${answer}`,
      source: `Expert ticket reply · ${t.title}`,
      confidence: "High confidence",
      projectId: t.projectId,
    });
    setDrafts((d) => ({ ...d, [t.id]: "" }));
    setNotice(`Sent. PMs asking about "${t.area}" now see your answer in the knowledge base.`);
  };

  return (
    <div className="single-layout">
      <div className="panel">
        <h2>My tickets</h2>
        <p className="muted">
          PMs route questions here when no expert knowledge exists yet. Your answer is delivered back to the PM and saved to the knowledge base for the next decision.
        </p>
        {notice && <div className="notice">{notice}</div>}

        <h3>Open · {open.length}</h3>
        {open.length === 0 ? (
          <div className="empty-box">No open tickets for {expertName.split(" · ")[0]}. Switch personas above to see other inboxes.</div>
        ) : (
          <div className="ticket-list">
            {open.map((t) => {
              const cat = getCategoryByArea(t.area);
              const teamTickets = tickets.filter(
                (t2) => t2.area === t.area && t2.id !== t.id && t2.status === "open",
              );
              return (
                <div key={t.id} className="ticket-card">
                  <div className="ticket-head">
                    <div>
                      <span className="ticket-pill open">Open</span>
                      <strong>{t.title}</strong>
                    </div>
                    <span className="ticket-meta">{new Date(t.createdAt).toLocaleString()}</span>
                  </div>

                  {cat && (
                    <div className="ticket-context">
                      <div className="context-label">Why your input matters</div>
                      <p className="muted">{cat.business}</p>
                      {businessImpactByArea[t.area] && (
                        <div className="context-impact">{businessImpactByArea[t.area]}</div>
                      )}
                      {teamTickets.length > 0 && (
                        <p className="muted context-team">
                          Also contributing:{" "}
                          {teamTickets.map((t2) => t2.assignedTo).join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="ticket-q"><strong>PM asked:</strong> "{t.sourceQuestion}"</p>
                  <p className="muted">{t.question}</p>
                  <textarea
                    className="large-text"
                    placeholder="Type your expert answer — your response will be translated to business language and used directly in the PM's decision brief."
                    value={drafts[t.id] || ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                  />
                  <div className="action-row">
                    <button onClick={() => send(t)}>Send answer & save to knowledge base</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h3>Answered · {answered.length}</h3>
        {answered.length === 0 ? (
          <div className="empty-box">No answered tickets yet.</div>
        ) : (
          <div className="ticket-list">
            {answered.map((t) => (
              <div key={t.id} className="ticket-card answered">
                <div className="ticket-head">
                  <div>
                    <span className="ticket-pill done">Answered</span>
                    <strong>{t.title}</strong>
                  </div>
                  <span className="ticket-meta">{t.answeredAt ? new Date(t.answeredAt).toLocaleString() : ""}</span>
                </div>
                <p className="ticket-q"><strong>PM asked:</strong> "{t.sourceQuestion}"</p>
                <p style={{ whiteSpace: "pre-wrap" }}><strong>Your answer:</strong> {t.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBreakdownPanel({ f }: { f: Flow }) {
  const rows = [
    { label: "Evidence depth", ...f.breakdown.evidence },
    { label: "Expert agreement", ...f.breakdown.agreement },
    { label: "Knowledge recency", ...f.breakdown.recency },
  ];
  const gap = 100 - f.score;
  return (
    <div className="score-breakdown">
      <h4>Why this score?</h4>
      <p className="muted">The Decision Readiness Score combines three signals. Here's how today's question scored:</p>
      <table className="breakdown-table">
        <tbody>
          {rows.map((r) => {
            const pct = Math.round((r.value / r.max) * 100);
            const status = pct >= 80 ? "ok" : pct >= 40 ? "warn" : "low";
            return (
              <tr key={r.label}>
                <td><strong>{r.label}</strong><div className="muted breakdown-note">{r.note}</div></td>
                <td className="breakdown-bar-cell">
                  <div className="breakdown-bar"><div className={`breakdown-bar-fill ${status}`} style={{ width: `${pct}%` }} /></div>
                </td>
                <td className="breakdown-val">{r.value}/{r.max}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {gap > 0 && (
        <p className="muted">
          <strong>To raise the score:</strong>{" "}
          {!f.found
            ? "ask an expert in this area to capture their knowledge — even one approved entry will move the score significantly."
            : f.breakdown.agreement.value < f.breakdown.agreement.max
              ? "get a second expert to confirm the existing knowledge."
              : "refresh the knowledge — newer expert input increases recency confidence."}
        </p>
      )}
    </div>
  );
}

function DecisionStoryGraph({ f }: { f: Flow }) {
  const experts = (f.expertsConsulted.length ? f.expertsConsulted : f.experts.slice(0, 2).map((e) => e[0])).slice(0, 3);
  return (
    <div className="story-graph">
      <h4>Decision story</h4>
      <p className="muted">From expert input to final recommendation — every step traceable.</p>
      <div className="story-cols">
        <div className="story-col">
          <div className="story-col-title">Experts</div>
          {experts.map((e, i) => (
            <div key={i} className="story-node node-expert"><strong>{e}</strong></div>
          ))}
        </div>
        <div className="story-arrow">→</div>
        <div className="story-col">
          <div className="story-col-title">Technical finding</div>
          <div className="story-node node-finding">{f.technical}</div>
        </div>
        <div className="story-arrow">→</div>
        <div className="story-col">
          <div className="story-col-title">Business impact</div>
          <div className="story-node node-impact">{f.businessImpact}</div>
        </div>
        <div className="story-arrow">→</div>
        <div className="story-col">
          <div className="story-col-title">Action</div>
          <div className="story-node node-action">{f.next}</div>
        </div>
        <div className="story-arrow">→</div>
        <div className="story-col">
          <div className="story-col-title">Recommendation</div>
          <div className="story-node node-reco"><strong>{f.recommendation}</strong></div>
        </div>
      </div>
    </div>
  );
}

function AiTranslationCard({
  f,
  question,
  onViewBrief,
}: {
  f: Flow;
  question: string;
  onViewBrief: () => void;
}) {
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [failed, setFailed] = useState(false);
  const runTranslate = useServerFn(translateDecision);

  useEffect(() => {
    const findings = f.evidence
      .filter((e) => e[2] !== "—")
      .map((e) => e[0].slice(0, 200));
    runTranslate({
      data: { question, area: f.area, technicalFindings: findings, projectName: f.project },
    })
      .then((r) => setResult(r))
      .catch(() => setFailed(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <>
        <p className="muted">AI translation unavailable — showing knowledge base summary.</p>
        <div className="action-row">
          <button className="action-btn" onClick={onViewBrief}>View decision brief</button>
        </div>
      </>
    );
  }

  if (!result) {
    return (
      <div className="translating-state">
        <div className="translating-spinner" />
        <div>
          <strong>AI is translating technical findings to business language…</strong>
          <p className="muted">Turning expert knowledge into a decision you can act on.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="translation-banner">
        <span className="ai-badge">AI Translation Layer</span>
        <h4>What this means for the business</h4>
        <p className="muted">Technical findings translated to plain business language — no engineering background required.</p>
      </div>
      <div className="translation-grid">
        <div className="translation-card translation-impact">
          <span className="translation-label">Business Impact</span>
          <p>{result.businessImpact}</p>
        </div>
        <div className="translation-card translation-timeline">
          <span className="translation-label">Timeline Risk</span>
          <p>{result.timelineRisk}</p>
        </div>
        <div className="translation-card translation-financial">
          <span className="translation-label">Financial Signal</span>
          <p>{result.financialSignal}</p>
        </div>
        <div className="translation-card translation-action">
          <span className="translation-label">Recommended Action</span>
          <p><strong>{result.recommendedAction}</strong></p>
        </div>
      </div>
      {result.stakeholders.length > 0 && (
        <p className="muted" style={{ marginTop: 10 }}>
          <strong>Also inform:</strong> {result.stakeholders.join(" · ")}
        </p>
      )}
      <div className="action-row">
        <button className="action-btn" onClick={onViewBrief}>View full decision brief →</button>
      </div>
    </>
  );
}

const STARTER_QUESTIONS = [
  "Can we approve Supplier B for Power Module X?",
  "What caused the defect increase on Line 3?",
  "Should we ship the pilot batch this week?",
  "Can we change the packaging material on Product X?",
];

export function PmChatView() {
  const kb = useKnowledge();
  const kbRef = useRef(kb);
  kbRef.current = kb;
  const tickets = useTickets();
  const projects = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const activeProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const scopedKb = (allKb: Knowledge[]) =>
    activeProject
      ? allKb.filter((k) => k.projectId === activeProject.id || !k.projectId)
      : allKb;

  const openTickets = tickets.filter(
    (t) => t.status === "open" && (!activeProject || t.projectId === activeProject.id || !t.projectId),
  );
  const answeredTickets = tickets.filter(
    (t) => t.status === "answered" && (!activeProject || t.projectId === activeProject.id || !t.projectId),
  );

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 0,
      type: "ai",
      node: (
        <>
          <p><strong>Ask your decision question in plain language.</strong></p>
          <p>I search the expert knowledge base, translate technical findings into business terms, and give you a decision brief you can act on. If knowledge is missing, I identify the right experts and route questions directly to their inboxes.</p>
          <p className="muted" style={{ fontSize: 12 }}>Your organization's expertise — structured, translated, and ready for decisions.</p>
        </>
      ),
    },
  ]);
  const [projectName, setProjectName] = useState("Power Module X");
  const [question, setQuestion] = useState("");
  const [pmFiles, setPmFiles] = useState<string[]>([]);
  const msgIdRef = useRef(1);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef<string>("");
  const runClassify = useServerFn(classifyQuestion);

  const scrollChat = () => {
    requestAnimationFrame(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    });
  };

  const appendMsg = (type: "ai" | "user", node: ReactNode) => {
    setMessages((m) => [...m, { id: msgIdRef.current++, type, node }]);
    scrollChat();
  };

  const showKnowledge = (f: Flow) => {
    appendMsg(
      "ai",
      <>
        <p><strong>Knowledge search completed.</strong></p>
        <p>{f.found ? "I found approved expert knowledge for this decision." : "I did not find approved expert knowledge. Expert input is needed."}</p>
        <table className="evidence-table">
          <thead><tr><th>Finding</th><th>Source</th><th>Expert</th><th title="How sure are we? High = multiple recent expert confirmations.">Confidence ⓘ</th></tr></thead>
          <tbody>{f.evidence.map((e, i) => (
            <tr key={i}><td><strong>{e[0]}</strong></td><td>{e[1]}</td><td>{e[2]}</td><td>{e[3]}</td></tr>
          ))}</tbody>
        </table>
        <div className="action-row">
          <button className="action-btn" onClick={() => showReadiness(f)}>Calculate readiness</button>
        </div>
      </>
    );
  };

  const showReadiness = (f: Flow) => {
    const deg = Math.round((f.score / 100) * 360);
    const msg = f.found
      ? "Decision is possible with conditions. Existing expert knowledge supports the recommendation."
      : "Decision is not ready yet. Collect expert input before deciding.";
    appendMsg(
      "ai",
      <>
        <div className="score-wrap">
          <div className="score-circle" style={{ background: `conic-gradient(#1746a2 0deg,#1746a2 ${deg}deg,#e7eefb ${deg}deg)` }}>
            <strong>{f.score}%</strong>
          </div>
          <div>
            <p><strong>Decision Readiness Score</strong></p>
            <p>{msg}</p>
          </div>
        </div>
        <ScoreBreakdownPanel f={f} />
        <div className="action-row">
          {f.found ? (
            <button className="action-btn" onClick={() => showAiTranslation(f)}>Translate findings to business language →</button>
          ) : (
            <button className="action-btn" onClick={() => showExperts(f)}>Show experts and prepare tickets</button>
          )}
        </div>
      </>
    );
  };

  const showAiTranslation = (f: Flow) => {
    appendMsg(
      "ai",
      <AiTranslationCard
        f={f}
        question={lastQuestionRef.current}
        onViewBrief={() => showDecisionBrief(f)}
      />,
    );
  };

  const showDecisionBrief = (f: Flow) => {
    appendMsg(
      "ai",
      <>
        <p><strong>Decision Brief</strong></p>
        <DecisionStoryGraph f={f} />
        <div className="brief-grid">
          <div className="brief-card brief-reco">
            <span className="brief-tag">Final recommendation</span>
            <p><strong>{f.recommendation}</strong></p>
            <p className="muted">{f.reason}</p>
          </div>
          <div className="brief-card">
            <span className="brief-tag">Business impact</span>
            <p>{f.businessImpact}</p>
          </div>
          <div className="brief-card brief-risk">
            <span className="brief-tag">Risk</span>
            <p>{f.risk}</p>
          </div>
          <div className="brief-card brief-missing">
            <span className="brief-tag">Missing information</span>
            {f.missingInfo.length ? (
              <ul className="brief-list">{f.missingInfo.map((m, i) => <li key={i}>{m}</li>)}</ul>
            ) : <p className="muted">No critical gaps identified.</p>}
          </div>
          <div className="brief-card brief-actions">
            <span className="brief-tag">Recommended actions</span>
            <ul className="brief-list">{f.actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
          <div className="brief-card">
            <span className="brief-tag">Experts consulted</span>
            {f.expertsConsulted.length ? (
              <div className="expert-avatars">
                {f.expertsConsulted.map((e, i) => (
                  <div key={i} className="expert-avatar"><span>{e.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span><small>{e}</small></div>
                ))}
              </div>
            ) : <p className="muted">No experts have contributed yet for this decision.</p>}
          </div>
        </div>
        <div className="block">
          <h4>Evidence traceability</h4>
          <table className="evidence-table">
            <thead><tr><th>Evidence</th><th>Source</th><th>Expert / Owner</th><th>Confidence</th></tr></thead>
            <tbody>{f.evidence.map((e, i) => (
              <tr key={i}><td>{e[0]}</td><td>{e[1]}</td><td>{e[2]}</td><td>{e[3]}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="action-row">
          <button className="action-btn secondary" onClick={() => exportBrief(f)}>Export brief</button>
          <button className="action-btn" onClick={() => showExperts(f)}>Show experts to contact</button>
        </div>
      </>
    );
  };

  const showExperts = (f: Flow) => {
    appendMsg(
      "ai",
      <ExpertSelector
        f={f}
        sourceQuestion={lastQuestionRef.current}
        projectId={activeProject?.id}
        onCreated={(persisted) => {
          appendMsg(
            "ai",
            <>
              <div className="ticket-created">
                {persisted.length} expert ticket(s) created and delivered to their inboxes. Switch to the Expert view to answer them.
              </div>
              <div className="block">
                <div className="two-col">
                  {persisted.map((t) => (
                    <div key={t.id} className="item">
                      <span>Ticket · sent</span>
                      <p><strong>{t.title}</strong></p>
                      <p>Assigned to: {t.assignedTo}</p>
                      <p>{t.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>,
          );
        }}
      />,
    );
  };


  const exportBrief = (f: Flow) => {
    const text = `DecisionBridge — Decision Brief

Project: ${projectName}
Decision type: ${f.foundTitle}
Final recommendation: ${f.recommendation}
Readiness Score: ${f.score}%

Reason:
${f.reason}

Business impact:
${f.businessImpact}

Risk:
${f.risk}

Missing information:
${f.missingInfo.map((m) => `- ${m}`).join("\n") || "- None identified"}

Recommended actions:
${f.actions.map((a) => `- ${a}`).join("\n")}

Experts consulted:
${f.expertsConsulted.map((e) => `- ${e}`).join("\n") || "- (none yet)"}

Evidence:
${f.evidence.map((e) => `- ${e[0]} | Source: ${e[1]} | Owner: ${e[2]} | Confidence: ${e[3]}`).join("\n")}`;
    const blob = new Blob([text.trim()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DecisionBridge_Brief.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ask = async (q: string) => {
    lastQuestionRef.current = q;
    appendMsg("user", <p>{q}</p>);
    setQuestion("");

    // Show spinner while Gemini classifies
    const thinkingId = msgIdRef.current;
    appendMsg("ai", (
      <div className="translating-state">
        <div className="translating-spinner" />
        <span>Searching knowledge base…</span>
      </div>
    ));

    let flow: Flow;
    try {
      const aiResult = await runClassify({
        data: {
          question: q,
          knowledgeEntries: scopedKb(kbRef.current).map((k) => ({
            id: k.id,
            area: k.area,
            expert: k.expert,
            text: k.text.slice(0, 400),
            confidence: k.confidence,
          })),
        },
      });
      flow = buildFlow(q, scopedKb(kbRef.current), aiResult);
    } catch {
      flow = buildFlow(q, scopedKb(kbRef.current));
    }

    setProjectName(activeProject ? activeProject.name : flow.project);

    const chip = flow.found
      ? <span className="result-chip found">Existing expert knowledge found</span>
      : <span className="result-chip missing">Knowledge gap found</span>;

    // Replace the spinner message with the Language Bridge result
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== thinkingId),
      {
        id: msgIdRef.current++,
        type: "ai" as const,
        node: (
          <>
            {chip}
            <p>I understood this as a <strong>{flow.foundTitle}</strong> decision.</p>
            <div className="block">
              <h4>Language Bridge</h4>
              <div className="two-col">
                <div className="item"><span>PM / business view</span><p>{flow.business}</p></div>
                <div className="item"><span>Technical expert view</span><p>{flow.technical}</p></div>
              </div>
            </div>
            <div className="action-row">
              <button className="action-btn" onClick={() => showKnowledge(flow)}>Check expert knowledge base</button>
            </div>
          </>
        ),
      },
    ]);
    scrollChat();
  };

  const sendQuestion = () => {
    const q = question.trim();
    if (!q) {
      alert("Please type a decision question.");
      return;
    }
    ask(q);
  };

  const fileText = useMemo(
    () => (pmFiles.length ? "Attached: " + pmFiles.join(", ") : "No files attached. DecisionBridge will use the expert knowledge base."),
    [pmFiles]
  );

  const showStarters = messages.length === 1;

  return (
    <section className="view pm-view">
      <section className="chat-area" ref={chatRef}>
        {(openTickets.length > 0 || answeredTickets.length > 0) && (
          <div className="ticket-banner">
            <div>
              <strong>Expert ticket status</strong>
              <span className="ticket-banner-sub">
                {answeredTickets.length} of {openTickets.length + answeredTickets.length} response{openTickets.length + answeredTickets.length === 1 ? "" : "s"} received
                {openTickets.length > 0 && ` · ${openTickets.length} pending`}
              </span>
            </div>
            {answeredTickets.length > 0 && lastQuestionRef.current && (
              <button className="action-btn" onClick={() => ask(lastQuestionRef.current)}>
                Re-run readiness with new answers
              </button>
            )}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.type}`}>
            <div className="avatar">{m.type === "ai" ? "AI" : "PM"}</div>
            <div className="bubble">{m.node}</div>
          </div>
        ))}
        {showStarters && (
          <div className="starter-chips">
            <div className="starter-label">Try a starter question:</div>
            <div className="starter-row">
              {STARTER_QUESTIONS.map((q) => (
                <button key={q} className="starter-chip" onClick={() => ask(q)}>{q}</button>
              ))}
            </div>
            <div className="kb-status">
              {(() => {
                const scoped = scopedKb(kb);
                return scoped.length > 0
                  ? `${scoped.length} approved expert knowledge entr${scoped.length === 1 ? "y" : "ies"} available${activeProject ? ` for ${activeProject.name}` : ""}.`
                  : "No expert knowledge captured yet — ask anyway and I'll route you to the right experts.";
              })()}
            </div>
          </div>
        )}
      </section>
      <section className="composer">
        <div className="meta-row">
          {projects.length > 0 ? (
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                const p = projects.find((p) => p.id === e.target.value);
                if (p) setProjectName(p.name);
              }}
              className="project-select"
            >
              <option value="">— All projects —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : (
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project / product" />
          )}
          <select>
            <option>High impact</option>
            <option>Medium impact</option>
            <option>Low impact</option>
          </select>
          <label className="attach-btn" htmlFor="fileUpload">Attach file</label>
          <input id="fileUpload" type="file" multiple className="hidden-input"
            onChange={(e) => setPmFiles(Array.from(e.target.files ?? []).map((f) => f.name))}
          />
        </div>
        <div className="file-text">{fileText}</div>
        <div className="input-row">
          <textarea className="question-input" placeholder="Type your decision question here..."
            value={question} onChange={(e) => setQuestion(e.target.value)}
          />
          <button onClick={sendQuestion}>Send</button>
        </div>
      </section>
    </section>
  );
}

function ExpertSelector({
  f,
  sourceQuestion,
  projectId,
  onCreated,
}: {
  f: Flow;
  sourceQuestion: string;
  projectId?: string;
  onCreated: (persisted: Ticket[]) => void;
}) {
  const defaultSelected = f.tickets.length > 0
    ? new Set<string>(f.tickets.map((t) => t[1]))
    : new Set<string>(f.experts.map((e) => e[0]));
  const [selected, setSelected] = useState<Set<string>>(defaultSelected);
  const [questions, setQuestions] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const e of f.experts) {
      const match = f.tickets.find((t) => t[1] === e[0]);
      map[e[0]] = match
        ? match[2]
        : `Re: "${sourceQuestion}" — please share your perspective from your ${e[1]} expertise.`;
    }
    return map;
  });
  const [sent, setSent] = useState(false);

  const toggle = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelected(next);
  };

  const submit = () => {
    if (selected.size === 0 || sent) return;
    const persisted: Ticket[] = [];
    for (const e of f.experts) {
      if (!selected.has(e[0])) continue;
      const match = f.tickets.find((t) => t[1] === e[0]);
      persisted.push(
        addTicket({
          title: match ? match[0] : `Input needed: ${f.area}`,
          assignedTo: e[0],
          question: questions[e[0]],
          area: f.area,
          sourceQuestion,
          projectId,
        }),
      );
    }
    setSent(true);
    onCreated(persisted);
  };

  return (
    <>
      <p>
        <strong>Recommended experts</strong>{" "}
        <span className="muted" style={{ fontSize: 13 }}>— click a row to select or deselect</span>
      </p>
      <div className="expert-list">
        {f.experts.map((e, i) => {
          const isSel = selected.has(e[0]);
          const color = EXPERT_DOMAINS[e[0]]?.color ?? "#667085";
          const initials = e[0].split(" ").map((s) => s[0]).slice(0, 2).join("");
          return (
            <div key={i} className={`expert-row${isSel ? " selected" : ""}${sent ? " sent" : ""}`}>
              <div className="expert-row-main" onClick={() => !sent && toggle(e[0])} role="button" aria-pressed={isSel}>
                <div className={`expert-check-box${isSel ? " checked" : ""}`}>
                  {isSel && <span>✓</span>}
                </div>
                <div className="expert-avatar-sm" style={{ background: color }}>{initials}</div>
                <div className="expert-row-info">
                  <div className="expert-row-name">{e[0]}</div>
                  <div className="expert-row-role">{e[1]} · {e[2]}</div>
                </div>
                <div className="expert-row-tags">
                  <span className="tag green">{e[3]}</span>
                  <span className="tag orange">{e[4]}</span>
                </div>
              </div>
              {isSel && (
                <div className="expert-row-question">
                  <label>Question for {e[0].split(" ")[0]}</label>
                  <textarea
                    className="expert-question"
                    value={questions[e[0]]}
                    disabled={sent}
                    onChange={(ev) => setQuestions({ ...questions, [e[0]]: ev.target.value })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="expert-send-bar">
        <span className="muted" style={{ fontSize: 13 }}>
          {selected.size} of {f.experts.length} expert{f.experts.length === 1 ? "" : "s"} selected
        </span>
        <button
          className="action-btn"
          onClick={submit}
          disabled={selected.size === 0 || sent}
        >
          {sent
            ? "✓ Tickets sent"
            : selected.size === 0
              ? "Select at least one expert"
              : `Send tickets to ${selected.size} expert${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </>
  );
}
