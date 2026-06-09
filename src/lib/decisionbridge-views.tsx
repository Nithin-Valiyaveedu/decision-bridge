import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConnections, setConnection, removeConnection, useLlmConfig, type ConnectionConfig, type LlmProvider, type LlmConfig } from "@/lib/connection-store";
import { useServerFn } from "@tanstack/react-start";
import { extractKnowledge } from "@/lib/extract-knowledge.functions";
import { translateDecision, type TranslationResult } from "@/lib/translate-decision.functions";
import { classifyQuestion, type ClassifyResult } from "@/lib/classify-question.functions";
import { addKnowledge, useKnowledge, type Knowledge } from "@/lib/knowledge-store";
import { addTicket, answerTicket, useTickets, type Ticket } from "@/lib/ticket-store";
import { addPmDecision, markDecisionSeen, usePmDecisions, type PmDecision } from "@/lib/pm-decision-store";
import { addProject, useProjects, type Project } from "@/lib/project-store";
import { usePeople, setDemoEmail, initPeopleStore, resolveEmail } from "@/lib/people-store";
import { searchGmail, buildGmailQuery, type GmailMessage } from "@/lib/search-gmail.functions";
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

type ConflictPair = {
  expertA: string; textA: string; stanceA: "approve" | "reject";
  expertB: string; textB: string; stanceB: "approve" | "reject";
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
  conflicts: ConflictPair[];
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

const APPROVE_KW = ["approve", "approved", "pass", "passed", "clear", "cleared", "recommend", "proceed", "ready", "completed", "complete", "no failure", "zero failure", "successful", "all units", "no issues", "conditional approval"];
const REJECT_KW  = ["reject", "fail", "failed", "outstanding", "not complete", "not ready", "delay", "block", "concern", "risky", "pending", "hold", "not approved", "need more", "requires additional", "unable", "incomplete", "not yet"];

function stanceOf(text: string): "approve" | "reject" | "neutral" {
  const t = text.toLowerCase();
  const a = APPROVE_KW.filter((w) => t.includes(w)).length;
  const r = REJECT_KW.filter((w) => t.includes(w)).length;
  if (a > r) return "approve";
  if (r > a) return "reject";
  return "neutral";
}

function detectConflicts(matching: Knowledge[]): ConflictPair[] {
  const byExpert: Record<string, Knowledge[]> = {};
  for (const k of matching) {
    (byExpert[k.expert] ??= []).push(k);
  }
  const names = Object.keys(byExpert);
  const conflicts: ConflictPair[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const ea = names[i], eb = names[j];
      const sa = stanceOf(byExpert[ea].map((k) => k.text).join(" "));
      const sb = stanceOf(byExpert[eb].map((k) => k.text).join(" "));
      if (sa !== "neutral" && sb !== "neutral" && sa !== sb) {
        conflicts.push({
          expertA: ea, textA: byExpert[ea][0].text.slice(0, 220), stanceA: sa,
          expertB: eb, textB: byExpert[eb][0].text.slice(0, 220), stanceB: sb,
        });
      }
    }
  }
  return conflicts;
}

function buildFlow(question: string, kb: Knowledge[], aiResult?: ClassifyResult): Flow {
  const key = aiResult?.categoryKey ?? classify(question);
  const base = categoryMap[key];
  const matching = aiResult && aiResult.matchingIds.length > 0
    ? kb.filter((k) => aiResult.matchingIds.includes(k.id))
    : kb.filter((k) => k.area === base.area);
  const found = matching.length > 0;

  // Score breakdown
  const evidenceMax = 40;
  const confidencePoints = (c: string) => c.startsWith("High") ? 18 : c.startsWith("Medium") ? 12 : 6;
  const evidence = Math.min(evidenceMax, matching.reduce((sum, k) => sum + confidencePoints(k.confidence), 0));
  const conflicts = detectConflicts(matching);
  const agreementMax = 30;
  const uniqueExperts = new Set(matching.map((m) => m.expert)).size;
  const rawAgreement = Math.min(agreementMax, uniqueExperts * 18);
  const agreement = Math.max(0, rawAgreement - conflicts.length * 12);
  const recencyMax = 30;
  const newest = matching.reduce((a, b) => Math.max(a, b.createdAt), 0);
  const daysOld = newest ? (Date.now() - newest) / 86400000 : 999;
  const recency = newest ? (daysOld < 30 ? 30 : daysOld < 90 ? 20 : 10) : 0;
  const score = evidence + agreement + recency;

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
      note: conflicts.length > 0
        ? `⚠ Conflict detected between ${conflicts.length} expert pair${conflicts.length > 1 ? "s" : ""} — agreement score reduced.`
        : uniqueExperts
          ? `${uniqueExperts} expert${uniqueExperts === 1 ? "" : "s"} contributed, views aligned.`
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
    conflicts,
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
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [demoEmailDraft, setDemoEmailDraft] = useState("");
  const kb = useKnowledge();
  const tickets = useTickets();
  const projects = useProjects();
  const people = usePeople();

  // Seed people store with defaults on first load
  useEffect(() => {
    initPeopleStore(
      adminPeople.map(([name, role, domain, email]) => ({ name, role, domain, email }))
    );
  }, []);

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
            {adminPeople.map((p, i) => {
              const profile = people.find((x) => x.name === p[0]);
              const activeEmail = profile?.demoEmail || p[3];
              const isEditing = editingEmail === p[0];
              return (
                <div key={i} className="check-person-row">
                  <label className="person-check-label">
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={(e) => {
                        const next = new Set(checked);
                        if (e.target.checked) next.add(i); else next.delete(i);
                        setChecked(next);
                      }}
                    />
                    <div className="person-check-info">
                      <strong>{p[0]} · {p[1]}</strong>
                      <span>{p[2]}</span>
                    </div>
                  </label>
                  <div className="person-email-col">
                    {isEditing ? (
                      <div className="person-email-edit">
                        <input
                          type="email"
                          value={demoEmailDraft}
                          onChange={(e) => setDemoEmailDraft(e.target.value)}
                          placeholder={p[3]}
                          autoFocus
                        />
                        <button className="person-email-save" onClick={() => {
                          setDemoEmail(p[0], demoEmailDraft);
                          setEditingEmail(null);
                        }}>Save</button>
                        <button className="person-email-cancel" onClick={() => setEditingEmail(null)}>✕</button>
                      </div>
                    ) : (
                      <button
                        className={`person-email-badge ${profile?.demoEmail ? "demo-override" : ""}`}
                        title="Click to set demo email override"
                        onClick={() => { setEditingEmail(p[0]); setDemoEmailDraft(profile?.demoEmail ?? ""); }}
                      >
                        {profile?.demoEmail ? "⚡ " : ""}{activeEmail}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
  const [tab, setTab] = useState<"capture" | "tickets" | "connections">("capture");
  const tickets = useTickets();
  const allDecisions = usePmDecisions();
  const myName = expertName.split(" · ")[0];
  const myOpen = tickets.filter((t) => t.assignedTo === myName && t.status === "open").length;
  const myUnreadDecisions = allDecisions.filter(
    (d) =>
      !d.seenBy.includes(myName) &&
      (d.expertsConsulted.length === 0 || d.expertsConsulted.some((e) => e.split(" · ")[0] === myName)),
  ).length;
  const connections = useConnections();
  const connectedCount = Object.values(connections).filter((c) => c?.status === "connected").length;

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
            My tickets{(myOpen + myUnreadDecisions) > 0 && <span className="tab-badge">{myOpen + myUnreadDecisions}</span>}
          </button>
          <button className={`expert-tab ${tab === "connections" ? "active" : ""}`} onClick={() => setTab("connections")}>
            Connections{connectedCount > 0 && <span className="tab-badge connected">{connectedCount}</span>}
          </button>
        </div>
      </div>
      {tab === "capture" && <ExpertCapturePanel expertName={expertName} />}
      {tab === "tickets" && <ExpertTicketsPanel expertName={expertName} myName={myName} />}
      {tab === "connections" && <ConnectionsPanel />}
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
  const [confidence, setConfidence] = useState("High confidence");
  const [expertNotice, setExpertNotice] = useState("");
  const [simulating, setSimulating] = useState<string | null>(null);
  const [meetingPlatform, setMeetingPlatform] = useState<MeetingPlatformKey>("teams");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const connections = useConnections();
  const [connectorContents, setConnectorContents] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    CONNECTORS.forEach((c) => { if (c.id !== "meeting") map[c.id] = c.sampleContent; });
    Object.entries(MEETING_PLATFORMS).forEach(([k, v]) => { map[`meeting_${k}`] = v.sampleContent; });
    return map;
  });
  const [draft, setDraft] = useState<null | {
    summary: string;
    keyPoints: string[];
    recommendedConfidence: string;
    sourceLabel: string;
    connectorId?: string;
    connectorSource?: string;
    connectorArea?: string;
  }>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!availableAreas.includes(knowledgeArea)) {
      setKnowledgeArea(availableAreas[0] ?? "Supplier approval");
    }
  }, [selectedProjectId]);

  const runExtract = useServerFn(extractKnowledge);
  const runSearchGmail = useServerFn(searchGmail);
  const people = usePeople();

  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [gmailSearching, setGmailSearching] = useState(false);
  const [gmailError, setGmailError] = useState("");
  const [gmailExtracting, setGmailExtracting] = useState<string | null>(null);

  const expertShortName = expertName.split(" · ")[0];
  const defaultEmail = adminPeople.find((p) => p[0] === expertShortName)?.[3] ?? "";
  const resolvedEmail = resolveEmail(people, expertShortName, defaultEmail);

  const gmailConn = connections["gmail"];
  const gmailToken = gmailConn?.status === "connected" ? (gmailConn as Extract<typeof gmailConn, { id: "gmail"; status: "connected" }>).token : "";

  const fetchGmailMessages = async () => {
    if (!gmailToken) {
      setGmailError("Connect Gmail first — go to the Connections tab and add your OAuth token.");
      return;
    }
    setGmailSearching(true);
    setGmailMessages([]);
    setGmailError("");
    setDraft(null);
    try {
      const query = buildGmailQuery(knowledgeArea, resolvedEmail);
      const msgs = await runSearchGmail({ data: { token: gmailToken, query, maxResults: 5 } });
      setGmailMessages(msgs);
      if (msgs.length === 0) setGmailError("No emails found matching this area. Try a different knowledge area.");
    } catch (e) {
      setGmailError(e instanceof Error ? e.message : String(e));
    } finally {
      setGmailSearching(false);
    }
  };

  const extractFromGmail = async (msg: GmailMessage) => {
    setGmailExtracting(msg.id);
    setDraft(null);
    setError("");
    try {
      const result = await runExtract({
        data: {
          knowledgeArea,
          expertName,
          transcript: `Email from: ${msg.from}\nDate: ${msg.date}\nSubject: ${msg.subject}\n\n${msg.body}`,
          additionalInsights: "",
        },
      });
      setDraft({
        ...result,
        connectorId: "gmail",
        connectorSource: `Gmail · "${msg.subject}" · ${msg.from}`,
        connectorArea: knowledgeArea,
      });
      setGmailMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGmailExtracting(null);
    }
  };

  const simulate = async (connector: typeof CONNECTORS[0] & { sampleArea: string; sampleSource: string; connectLabel: string }) => {
    const contentKey = connector.id === "meeting" ? `meeting_${meetingPlatform}` : connector.id;
    const content = connectorContents[contentKey] ?? connector.sampleContent;
    if (!content?.trim()) return;
    setSimulating(connector.id);
    setDraft(null);
    setError("");
    try {
      const result = await runExtract({
        data: {
          knowledgeArea: connector.sampleArea,
          expertName,
          transcript: content,
          additionalInsights: "",
        },
      });
      setDraft({
        ...result,
        connectorId: connector.id,
        connectorSource: connector.sampleSource,
        connectorArea: connector.sampleArea,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSimulating(null);
    }
  };

  const acceptDraft = () => {
    if (!draft) return;
    const body =
      draft.summary +
      (draft.keyPoints.length ? "\n\nKey points:\n- " + draft.keyPoints.join("\n- ") : "");

    addKnowledge({
      area: draft.connectorArea ?? knowledgeArea,
      expert: expertName.split(" · ")[0],
      text: body,
      source: draft.connectorSource ?? `Auto: ${draft.connectorId ?? "connected"}`,
      confidence,
      projectId: selectedProjectId || undefined,
    });
    setDraft(null);
    setExpertNotice("Knowledge captured and added to the base.");
  };

  const autoCaptured = kb.filter((k) => k.source.startsWith("Auto:"));

  return (
    <div className="split-layout">
      <div className="panel">
        <h2>Capture expert knowledge from meetings</h2>
        <p className="muted">
          Connect your tools and knowledge flows in automatically — no manual uploads needed.
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

        <div className="connector-grid">
          {CONNECTORS.map((c) => {
            if (c.id === "meeting") {
              const mp = MEETING_PLATFORMS[meetingPlatform];
              const meetingConnector = { ...c, ...mp };
              const meetingKey = `meeting_${meetingPlatform}`;
              const isExpanded = expandedCard === "meeting";
              return (
                <div key="meeting" className="connector-card connected">
                  <div className="connector-head">
                    <div className="connector-icon" style={{ background: mp.color }}>{mp.icon}</div>
                    <div className="connector-info">
                      <strong>Meeting transcript</strong>
                      <select
                        value={meetingPlatform}
                        onChange={(e) => setMeetingPlatform(e.target.value as MeetingPlatformKey)}
                        className="meeting-platform-select"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="teams">Microsoft Teams</option>
                        <option value="zoom">Zoom</option>
                        <option value="gmeet">Google Meet</option>
                      </select>
                    </div>
                    <div className="meeting-transcript-status">
                      <span className="meeting-transcript-dot" />
                      <span className="meeting-transcript-label">Transcript ready</span>
                      <button className="connector-edit-btn" onClick={() => setExpandedCard(isExpanded ? null : "meeting")}>
                        {isExpanded ? "hide" : "edit"}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <textarea
                      className="connector-content-edit"
                      value={connectorContents[meetingKey] ?? ""}
                      onChange={(e) => setConnectorContents({ ...connectorContents, [meetingKey]: e.target.value })}
                      placeholder="Transcript content…"
                    />
                  )}
                  <button
                    className="action-btn secondary"
                    style={{ width: "100%", marginTop: 12 }}
                    onClick={() => simulate(meetingConnector)}
                    disabled={!!simulating}
                  >
                    {simulating === "meeting" ? `Receiving from ${mp.name}…` : mp.connectLabel}
                  </button>
                </div>
              );
            }
            if (c.id === "gmail") {
              return (
                <div key="gmail" className="connector-card gmail-card connected">
                  <div className="connector-head">
                    <div className="connector-icon" style={{ background: c.color }}>{c.icon}</div>
                    <div className="connector-info">
                      <strong>{c.name}</strong>
                      {gmailToken
                        ? <span className="gmail-expert-email">● {resolvedEmail || "email not set"}</span>
                        : <span className="gmail-expert-email" style={{ color: "var(--rose)" }}>Not connected — add token in Connections tab</span>
                      }
                    </div>
                    {gmailToken && <div className="connector-dot connected" />}
                  </div>

                  <button
                    className="action-btn secondary"
                    style={{ width: "100%", marginTop: 10 }}
                    onClick={fetchGmailMessages}
                    disabled={gmailSearching || !!gmailExtracting || !gmailToken}
                  >
                    {gmailSearching ? "Searching Gmail…" : `Search emails about "${knowledgeArea}"`}
                  </button>

                  {gmailError && <p className="gmail-error">{gmailError}</p>}

                  {gmailMessages.length > 0 && (
                    <div className="gmail-messages">
                      <p className="gmail-found-label">Found {gmailMessages.length} email{gmailMessages.length !== 1 ? "s" : ""} — select one to extract</p>
                      {gmailMessages.map((msg) => (
                        <div key={msg.id} className="gmail-msg-card">
                          <div className="gmail-msg-meta">
                            <span className="gmail-msg-subject">{msg.subject}</span>
                            <span className="gmail-msg-date">{msg.date}</span>
                          </div>
                          <span className="gmail-msg-from">{msg.from}</span>
                          <p className="gmail-msg-snippet">{msg.snippet}</p>
                          <button
                            className="action-btn"
                            style={{ marginTop: 8, fontSize: 12 }}
                            onClick={() => extractFromGmail(msg)}
                            disabled={!!gmailExtracting}
                          >
                            {gmailExtracting === msg.id ? "Extracting…" : "Extract knowledge"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            const isExpanded = expandedCard === c.id;
            return (
              <div key={c.id} className="connector-card connected">
                <div className="connector-head">
                  <div className="connector-icon" style={{ background: c.color }}>{c.icon}</div>
                  <div className="connector-info">
                    <strong>{c.name}</strong>
                    <span>{c.detail}</span>
                  </div>
                  <button className="connector-edit-btn" onClick={() => setExpandedCard(isExpanded ? null : c.id)}>
                    {isExpanded ? "hide" : "edit"}
                  </button>
                </div>
                {isExpanded && (
                  <textarea
                    className="connector-content-edit"
                    value={connectorContents[c.id] ?? ""}
                    onChange={(e) => setConnectorContents({ ...connectorContents, [c.id]: e.target.value })}
                    placeholder={`Paste ${c.name} content here…`}
                  />
                )}
                <button
                  className="action-btn secondary"
                  style={{ width: "100%", marginTop: 12 }}
                  onClick={() => simulate(c)}
                  disabled={!!simulating}
                >
                  {simulating === c.id ? `Connecting to ${c.name}…` : c.connectLabel}
                </button>
              </div>
            );
          })}
        </div>

        {error && <div className="notice" style={{ background: "#fdecec", color: "#a02020" }}>{error}</div>}

        {draft && (
          <div className="block draft-block">
            {draft.connectorId && (
              <div className="auto-capture-badge">
                Auto-captured from {CONNECTORS.find((c) => c.id === draft.connectorId)?.name}
              </div>
            )}
            <h3>AI-drafted knowledge entry</h3>
            <p><strong>Summary:</strong> {draft.summary}</p>
            {draft.keyPoints.length > 0 && (
              <>
                <p><strong>Key points:</strong></p>
                <ul>{draft.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </>
            )}
            <p className="muted">
              {draft.connectorId
                ? `Area: ${draft.connectorArea} · Confidence: ${draft.recommendedConfidence}`
                : `Suggested source: ${draft.sourceLabel} · Suggested confidence: ${draft.recommendedConfidence}`}
            </p>
            <div className="action-row">
              <button onClick={acceptDraft}>Add to knowledge base</button>
              <button className="action-btn secondary" onClick={() => setDraft(null)}>Discard draft</button>
            </div>
          </div>
        )}

        {expertNotice && <div className="notice">{expertNotice}</div>}

        {autoCaptured.length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Auto-captured entries</h3>
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
          </>
        )}
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
    detail: "Tickets, comments & status updates",
    connectLabel: "Extract from Jira",
    sampleContent: `TICKET PMX-2847: Supplier B Qualification Status Update
Reporter: Dr. Lukas Müller | Project: Power Module X

Thermal cycling tests for Supplier B completed. 94% pass rate across 1000 cycles — within acceptable threshold. Lifetime stress tests within spec. No degradation anomalies detected. HTOL test still outstanding — expected completion end of month.

Recommendation: Conditional approval for pilot volumes. Full production release should wait for final HTOL confirmation.`,
    sampleArea: "Supplier approval",
    sampleSource: "Jira · PMX-2847",
  },
  {
    id: "slack",
    name: "Slack",
    icon: "S",
    color: "#4A154B",
    detail: "Channels, threads & messages",
    connectLabel: "Extract from Slack",
    sampleContent: `Thread: Power Module X — Supplier B Decision
@anna.weber: Supplier qualification audit passed April. OTD rate 96% over 12 months. Quality management system approved. Recommending approval for pilot volumes.
@markus.klein: Lead time is 6 weeks. Current buffer stock covers 8 weeks. Single-source risk until Supplier C qualifies in Q4. Pilot approval now prevents production gaps.
@dr.mueller: Reliability nearly complete. HTOL still running — won't block pilot but should gate full production ramp.`,
    sampleArea: "Supplier approval",
    sampleSource: "Slack · #engineering-decisions",
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: "G",
    color: "#EA4335",
    detail: "Inbox · decision-relevant emails",
    connectLabel: "Extract from Gmail",
    sampleContent: `From: dr.lukas.mueller@infineon.com
To: power-module-x-team@infineon.com
Subject: Re: Pilot batch shipment — quality gate sign-off

Team,

Following today's review: all critical quality gates have been passed for the first pilot batch. AQL sampling shows 0 critical defects across 500 units. Electrical characterisation within ±2% of nominal spec.

I am formally signing off the pilot batch for shipment. Customer delivery can proceed as planned. Post-shipment monitoring protocol (weekly feedback loop for 4 weeks) to be initiated by Quality.

Lukas`,
    sampleArea: "Pilot batch shipment",
    sampleSource: "Gmail · dr.mueller",
  },
  {
    id: "meeting",
    name: "Meeting transcript",
    icon: "",
    color: "",
    detail: "",
    connectLabel: "",
    sampleContent: "",
    sampleArea: "",
    sampleSource: "",
  },
];

const MEETING_PLATFORMS = {
  teams: {
    name: "Microsoft Teams",
    icon: "T",
    color: "#6264A7",
    detail: "Meeting transcript",
    connectLabel: "Extract from Teams",
    sampleContent: `[Teams meeting transcript — Power Module X Engineering Review]
Attendees: Thomas Richter (Quality), Maria Hoffmann (Manufacturing), Dr. Lukas Müller (Reliability)

Thomas Richter: Root cause confirmed on Line 3 defect cluster. Solder paste viscosity was out of spec due to incorrect storage temp — batch traced and quarantined. 47 units affected, all in WIP, none shipped. Line cleared and revalidated.

Maria Hoffmann: Process parameters locked. Added storage temp check to daily pre-shift checklist. Defect rate back to baseline below 0.3%.

Dr. Müller: Reliability sign-off given. No customer exposure confirmed.

Thomas Richter: Recommending we close the defect investigation and lift the quality gate for Line 3.`,
    sampleArea: "Manufacturing defect",
    sampleSource: "Teams meeting · Power Module X",
  },
  zoom: {
    name: "Zoom",
    icon: "Z",
    color: "#2D8CFF",
    detail: "Meeting transcript",
    connectLabel: "Extract from Zoom",
    sampleContent: `[Zoom transcript — Supplier Review Meeting]
Participants: Anna Weber (Supplier Qual.), Dr. Lukas Müller (Reliability), Supplier B representative

Anna Weber: Supplier B passed all quality management checkpoints in last week's audit. OTD rate 96.2% over trailing 12 months.

Dr. Müller: Thermal cycling results are within spec from reliability side. Conditionally cleared. HTOL expected end of month — won't block pilot.

Supplier B rep: We can commit to 6-week lead time for pilot volumes, 4-week emergency window.

Anna Weber: I'm recommending approval for pilot volumes. We document single-source risk and revisit when Supplier C qualifies in Q4.`,
    sampleArea: "Supplier approval",
    sampleSource: "Zoom meeting · supplier review",
  },
  gmeet: {
    name: "Google Meet",
    icon: "M",
    color: "#1A73E8",
    detail: "Meeting transcript",
    connectLabel: "Extract from Google Meet",
    sampleContent: `[Google Meet — Pilot Batch Sign-off Review]
Attendees: Thomas Richter (Quality), Maria Hoffmann (Manufacturing), Sarah Klein (PM)

Thomas Richter: AQL inspection complete on first 500 units. Zero critical defects. Three minor cosmetic issues within acceptance criteria. Quality gate passed — signing off.

Maria Hoffmann: Line ran at 98.3% yield for this batch, above our 97% threshold. Process was stable throughout.

Sarah Klein: Customer delivery window is confirmed for next week. Do we have all sign-offs?

Thomas Richter: Yes, this batch is cleared for shipment.

Maria Hoffmann: Agreed — all clear from manufacturing.`,
    sampleArea: "Pilot batch shipment",
    sampleSource: "Google Meet · pilot sign-off",
  },
} as const;

type MeetingPlatformKey = keyof typeof MEETING_PLATFORMS;

const CONNECTION_DEFS = [
  {
    id: "gmail" as const,
    name: "Gmail",
    icon: "G",
    color: "#EA4335",
    description: "Read emails and extract decision-relevant knowledge automatically.",
    mcpDefault: "https://gmailmcp.googleapis.com/mcp/v1",
    mcpHint: "Official Google Gmail MCP server",
  },
  {
    id: "jira" as const,
    name: "Jira",
    icon: "J",
    color: "#0052CC",
    description: "Pull tickets, comments and status updates from your Jira instance.",
    mcpDefault: "https://mcp.atlassian.com/jira",
    mcpHint: "Official Atlassian MCP server — deploy internally for data residency",
  },
  {
    id: "slack" as const,
    name: "Slack",
    icon: "S",
    color: "#4A154B",
    description: "Monitor decision channels and extract knowledge from threads.",
    mcpDefault: "https://mcp.slack.com/v1",
    mcpHint: "Official Slack MCP server by Salesforce",
  },
  {
    id: "teams" as const,
    name: "Microsoft Teams",
    icon: "T",
    color: "#6264A7",
    description: "Capture meeting transcripts and channel messages.",
    mcpDefault: "https://mcp.teams.microsoft.com/v1",
    mcpHint: "Microsoft Teams MCP server (preview — deploy internally)",
  },
  {
    id: "zoom" as const,
    name: "Zoom",
    icon: "Z",
    color: "#2D8CFF",
    description: "Receive post-meeting transcripts and action items.",
    mcpDefault: "https://mcp.zoom.us/v1",
    mcpHint: "Zoom MCP server",
  },
  {
    id: "gmeet" as const,
    name: "Google Meet",
    icon: "M",
    color: "#1A73E8",
    description: "Capture live captions and meeting summaries.",
    mcpDefault: "https://meet.googleapis.com/mcp/v1",
    mcpHint: "Google Meet MCP server",
  },
];

const LLM_OPTIONS: { provider: LlmProvider; name: string; badge: string; badgeColor: string; residency: string; residencyColor: string; desc: string; hasEndpoint?: boolean; hasKey?: boolean; hasRegion?: boolean }[] = [
  {
    provider: "gemini",
    name: "Google Gemini",
    badge: "Cloud",
    badgeColor: "#4285F4",
    residency: "Data sent to Google servers",
    residencyColor: "orange",
    desc: "Gemini 2.5 Flash via Google AI Studio. Fastest setup, no infrastructure needed.",
  },
  {
    provider: "internal",
    name: "Internal LLM",
    badge: "On-premise",
    badgeColor: "#2E7D32",
    residency: "Data stays within your network",
    residencyColor: "green",
    desc: "Ollama or vLLM running inside your corporate VPN. Full data residency — zero external calls.",
    hasEndpoint: true,
  },
  {
    provider: "azure",
    name: "Azure OpenAI",
    badge: "Private cloud",
    badgeColor: "#0078D4",
    residency: "Data stays in your Azure tenant",
    residencyColor: "green",
    desc: "Azure OpenAI Service with your own deployment. Covered by Microsoft's DPA and EU data boundaries.",
    hasEndpoint: true,
    hasKey: true,
  },
  {
    provider: "bedrock",
    name: "AWS Bedrock",
    badge: "Private cloud",
    badgeColor: "#FF9900",
    residency: "Data stays in your AWS region",
    residencyColor: "green",
    desc: "AWS Bedrock — Claude, Titan, or Llama hosted in your AWS account. Regional data residency.",
    hasRegion: true,
  },
];

function ConnectionsPanel() {
  const connections = useConnections();
  const [llmConfig, saveLlm] = useLlmConfig();
  const [endpoints, setEndpoints] = useState<Partial<Record<string, string>>>({});
  const [gmailToken, setGmailToken] = useState("");
  const [llmFields, setLlmFields] = useState<Record<string, string>>({});

  const getEndpoint = (id: string, defaultVal: string) => endpoints[id] ?? defaultVal;

  const connect = (def: typeof CONNECTION_DEFS[number]) => {
    const ep = getEndpoint(def.id, def.mcpDefault).trim();
    if (!ep) return;
    if (def.id === "gmail") {
      setConnection({ id: "gmail", status: "connected", mcpEndpoint: ep, token: gmailToken.trim() });
    } else {
      setConnection({ id: def.id as Exclude<typeof def.id, "gmail">, status: "connected", mcpEndpoint: ep });
    }
  };

  const activeLlm = llmConfig.provider;

  const saveLlmConfig = (provider: LlmProvider) => {
    if (provider === "gemini") { saveLlm({ provider: "gemini" }); return; }
    if (provider === "internal") {
      saveLlm({ provider: "internal", endpoint: llmFields.internal_endpoint ?? "" });
    } else if (provider === "azure") {
      saveLlm({ provider: "azure", endpoint: llmFields.azure_endpoint ?? "", apiKey: llmFields.azure_key ?? "" });
    } else if (provider === "bedrock") {
      saveLlm({ provider: "bedrock", region: llmFields.bedrock_region ?? "eu-west-1", modelId: llmFields.bedrock_model ?? "anthropic.claude-3-5-sonnet-20241022-v2:0" });
    }
  };

  return (
    <div className="connections-panel">
      <div className="connections-header">
        <h2>Connections</h2>
        <p className="muted">Point each connector at its MCP server endpoint — the AI reads directly from your tools, no file uploads needed. Deploy MCP servers inside your VPN for full data residency.</p>
      </div>

      <div className="connections-list">
        {CONNECTION_DEFS.map((def) => {
          const conn = connections[def.id];
          const isConnected = conn?.status === "connected";
          const endpoint = isConnected
            ? (conn as Extract<ConnectionConfig, { status: "connected" }>).mcpEndpoint
            : getEndpoint(def.id, def.mcpDefault);

          return (
            <div key={def.id} className={`conn-card ${isConnected ? "connected" : ""}`}>
              <div className="conn-card-main">
                <div className="conn-icon" style={{ background: def.color }}>{def.icon}</div>
                <div className="conn-info">
                  <div className="conn-name-row">
                    <strong>{def.name}</strong>
                    <span className="mcp-badge">MCP</span>
                    {isConnected && <span className="conn-status-dot" />}
                  </div>
                  <p className="conn-desc">{def.description}</p>
                  {isConnected ? (
                    <span className="conn-account">{endpoint}</span>
                  ) : (
                    <span className="conn-mcp-hint">{def.mcpHint}</span>
                  )}
                </div>
                <div className="conn-actions">
                  {isConnected ? (
                    <button className="conn-btn disconnect" onClick={() => removeConnection(def.id)}>Disconnect</button>
                  ) : (
                    <button className="conn-btn connect" onClick={() => connect(def)}>Connect</button>
                  )}
                </div>
              </div>
              {!isConnected && (
                <div className="conn-form">
                  <div className="conn-endpoint-row">
                    <label className="conn-endpoint-label">MCP endpoint</label>
                    <input
                      className="conn-endpoint-input"
                      type="text"
                      value={getEndpoint(def.id, def.mcpDefault)}
                      onChange={(e) => setEndpoints((p) => ({ ...p, [def.id]: e.target.value }))}
                      placeholder={def.mcpDefault}
                    />
                  </div>
                  {def.id === "gmail" && (
                    <div className="conn-gmail-token-row">
                      <label className="conn-endpoint-label">OAuth token</label>
                      <input
                        className="conn-endpoint-input"
                        type="password"
                        value={gmailToken}
                        onChange={(e) => setGmailToken(e.target.value)}
                        placeholder="ya29.a0AT3oNZ9x…"
                      />
                      <a
                        href="https://developers.google.com/oauthplayground"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="conn-token-hint"
                      >
                        Get token ↗
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── LLM configuration ─────────────────────── */}
      <div className="llm-section">
        <div className="llm-section-header">
          <h3>AI / LLM configuration</h3>
          <p className="muted">Choose where AI inference runs. For regulated industries, keep everything on-premise — the same models, zero data leaving your network.</p>
        </div>
        <div className="llm-grid">
          {LLM_OPTIONS.map((opt) => {
            const isActive = activeLlm === opt.provider;
            return (
              <button
                key={opt.provider}
                className={`llm-card ${isActive ? "active" : ""}`}
                onClick={() => { if (!opt.hasEndpoint && !opt.hasKey && !opt.hasRegion) saveLlmConfig(opt.provider); else saveLlm({ ...(llmConfig.provider === opt.provider ? llmConfig : { provider: opt.provider }) } as LlmConfig); }}
              >
                <div className="llm-card-top">
                  <div className="llm-name-row">
                    <span className="llm-name">{opt.name}</span>
                    <span className="llm-badge" style={{ background: opt.badgeColor }}>{opt.badge}</span>
                  </div>
                  <p className="llm-desc">{opt.desc}</p>
                </div>
                <div className={`llm-residency llm-residency-${opt.residencyColor}`}>
                  <span className="llm-residency-dot" />
                  {opt.residency}
                </div>
                {isActive && opt.hasEndpoint && (
                  <div className="llm-fields" onClick={(e) => e.stopPropagation()}>
                    <label>Endpoint URL</label>
                    <input
                      type="text"
                      placeholder={opt.provider === "internal" ? "http://ollama.internal:11434/v1" : "https://yourorg.openai.azure.com/"}
                      value={llmFields[`${opt.provider}_endpoint`] ?? ""}
                      onChange={(e) => setLlmFields((p) => ({ ...p, [`${opt.provider}_endpoint`]: e.target.value }))}
                    />
                    {opt.hasKey && (
                      <>
                        <label style={{ marginTop: 8 }}>API key</label>
                        <input
                          type="password"
                          placeholder="Azure OpenAI API key"
                          value={llmFields.azure_key ?? ""}
                          onChange={(e) => setLlmFields((p) => ({ ...p, azure_key: e.target.value }))}
                        />
                      </>
                    )}
                    <button className="action-btn" style={{ marginTop: 10, fontSize: 12 }} onClick={() => saveLlmConfig(opt.provider)}>Save</button>
                  </div>
                )}
                {isActive && opt.hasRegion && (
                  <div className="llm-fields" onClick={(e) => e.stopPropagation()}>
                    <label>AWS region</label>
                    <input
                      type="text"
                      placeholder="eu-west-1"
                      value={llmFields.bedrock_region ?? ""}
                      onChange={(e) => setLlmFields((p) => ({ ...p, bedrock_region: e.target.value }))}
                    />
                    <label style={{ marginTop: 8 }}>Model ID</label>
                    <input
                      type="text"
                      placeholder="anthropic.claude-3-5-sonnet-20241022-v2:0"
                      value={llmFields.bedrock_model ?? ""}
                      onChange={(e) => setLlmFields((p) => ({ ...p, bedrock_model: e.target.value }))}
                    />
                    <button className="action-btn" style={{ marginTop: 10, fontSize: 12 }} onClick={() => saveLlmConfig(opt.provider)}>Save</button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {activeLlm !== "gemini" && (
          <p className="llm-note">
            <strong>Note:</strong> This prototype always calls Gemini server-side. In production, swap the provider in <code>ai-gateway.server.ts</code> based on this stored config — the Vercel AI SDK supports all four providers with identical interfaces.
          </p>
        )}
      </div>
    </div>
  );
}

function ExpertTicketsPanel({ expertName, myName }: { expertName: string; myName: string }) {
  const tickets = useTickets();
  const allDecisions = usePmDecisions();
  const mine = tickets.filter((t) => t.assignedTo === myName);
  const open = mine.filter((t) => t.status === "open");
  const answered = mine.filter((t) => t.status === "answered");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const myDecisions = allDecisions.filter(
    (d) => d.expertsConsulted.length === 0 || d.expertsConsulted.some((e) => e.split(" · ")[0] === myName),
  );
  const unreadDecisions = myDecisions.filter((d) => !d.seenBy.includes(myName));

  const send = (t: Ticket) => {
    const answer = (drafts[t.id] || "").trim();
    if (!answer) { setNotice("Write an answer first."); return; }
    const confidence = confidences[t.id] || "Medium confidence";
    answerTicket(t.id, answer);
    addKnowledge({
      area: t.area,
      expert: myName,
      text: `Response to PM question "${t.sourceQuestion}":\n\n${answer}`,
      source: `Expert ticket reply · ${t.title}`,
      confidence,
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

        {myDecisions.length > 0 && (
          <div className="pm-decisions-section">
            <div className="pm-decisions-header">
              <span className="pm-decisions-title">PM Decisions</span>
              {unreadDecisions.length > 0 && (
                <span className="pm-decisions-badge">{unreadDecisions.length} new</span>
              )}
            </div>
            {myDecisions.map((d) => {
              const isUnread = !d.seenBy.includes(myName);
              return (
                <div key={d.id} className={`pm-notification ${d.verdict} ${isUnread ? "unread" : ""}`}>
                  <div className="pm-notif-top">
                    <span className={`pm-notif-verdict ${d.verdict}`}>
                      {d.verdict === "approved" ? "✓ Approved" : "✗ Rejected"}
                    </span>
                    <span className="pm-notif-time">{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="pm-notif-topic">
                    <strong>{d.topic}</strong>
                    {d.projectName && <span className="pm-notif-project"> · {d.projectName}</span>}
                  </div>
                  <p className="pm-notif-question muted">"{d.question}"</p>
                  <div className="pm-notif-score-row">
                    <span className="pm-notif-score-label">Readiness score at decision time:</span>
                    <span className="pm-notif-score-val">{d.score}%</span>
                  </div>
                  <div className="pm-notif-reco">
                    <span className="pm-notif-reco-label">Recommendation was:</span>
                    <span> {d.recommendation}</span>
                  </div>
                  {d.comment && (
                    <div className="pm-notif-comment">
                      <span className="pm-notif-comment-label">PM note:</span>
                      <p>"{d.comment}"</p>
                    </div>
                  )}
                  {isUnread && (
                    <button
                      className="pm-notif-ack"
                      onClick={() => markDecisionSeen(d.id, myName)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
                  <div className="action-row ticket-answer-row">
                    <select
                      className="ticket-confidence-select"
                      value={confidences[t.id] || "Medium confidence"}
                      onChange={(e) => setConfidences((c) => ({ ...c, [t.id]: e.target.value }))}
                    >
                      <option>High confidence</option>
                      <option>Medium confidence</option>
                      <option>Low confidence</option>
                    </select>
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

type PmVerdictPanelProps = {
  flow: Flow;
  question: string;
  projectName: string;
  projectId?: string;
};

function PmDecisionVerdictPanel({ flow, question, projectName, projectId }: PmVerdictPanelProps) {
  const allDecisions = usePmDecisions();
  const existing = allDecisions.find((d) => d.question === question && d.projectId === projectId);

  const [comment, setComment] = useState("");

  const submit = (v: "approved" | "rejected") => {
    addPmDecision({
      verdict: v,
      topic: flow.foundTitle,
      question,
      score: flow.score,
      recommendation: flow.recommendation,
      comment: comment.trim(),
      expertsConsulted: flow.expertsConsulted,
      projectId,
      projectName,
    });
  };

  if (existing) {
    const count = flow.expertsConsulted.length;
    return (
      <div className="verdict-done">
        <span className={`verdict-badge ${existing.verdict}`}>
          {existing.verdict === "approved" ? "✓ Decision approved" : "✗ Decision rejected"}
        </span>
        <p className="muted">
          {count > 0
            ? `${count} expert${count > 1 ? "s" : ""} (${flow.expertsConsulted.map((e) => e.split(" · ")[0]).join(", ")}) ${count > 1 ? "have" : "has"} been notified.`
            : "No experts were consulted for this decision."}
        </p>
      </div>
    );
  }

  return (
    <div className="verdict-panel">
      <div className="verdict-header">
        <span className="verdict-label">Your call — do you agree with this recommendation?</span>
        <span className="verdict-sub">Your decision will be logged and all consulted experts will be notified.</span>
      </div>
      <textarea
        className="verdict-comment"
        placeholder="Optional: add a note for the experts (e.g. rationale, conditions, next steps)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />
      <div className="verdict-btns">
        <button className="verdict-approve-btn" onClick={() => submit("approved")}>
          ✓ Agree — Proceed
        </button>
        <button className="verdict-reject-btn" onClick={() => submit("rejected")}>
          ✗ Disagree — Hold
        </button>
      </div>
    </div>
  );
}

export function PmChatView() {
  const kb = useKnowledge();
  const kbRef = useRef(kb);
  kbRef.current = kb;
  const tickets = useTickets();
  const projects = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [pmTab, setPmTab] = useState<"chat" | "log">("chat");

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

  const [isThinking, setIsThinking] = useState(false);
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
  const msgIdRef = useRef(1);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef<string>(
    typeof window !== "undefined" ? (localStorage.getItem("db_last_pm_q") ?? "") : ""
  );
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
        {f.conflicts.length > 0 && (
          <div className="conflict-banner">
            <div className="conflict-banner-head">
              <span className="conflict-icon">⚠</span>
              <strong>Expert conflict detected</strong>
              <span className="conflict-sub">{f.conflicts.length} conflicting position{f.conflicts.length > 1 ? "s" : ""} found in the knowledge base — resolution recommended before deciding.</span>
            </div>
            {f.conflicts.map((c, i) => (
              <div key={i} className="conflict-pair">
                <div className={`conflict-side ${c.stanceA}`}>
                  <span className="conflict-stance">{c.stanceA === "approve" ? "✓ Supports" : "✗ Against"}</span>
                  <strong>{c.expertA.split(" · ")[0]}</strong>
                  <p>"{c.textA}{c.textA.length >= 220 ? "…" : ""}"</p>
                </div>
                <div className={`conflict-side ${c.stanceB}`}>
                  <span className="conflict-stance">{c.stanceB === "approve" ? "✓ Supports" : "✗ Against"}</span>
                  <strong>{c.expertB.split(" · ")[0]}</strong>
                  <p>"{c.textB}{c.textB.length >= 220 ? "…" : ""}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
          <button className="action-btn secondary" onClick={() => exportBrief(f)}>Export PDF</button>
          <button className="action-btn" onClick={() => showExperts(f)}>Show experts to contact</button>
        </div>
        <PmDecisionVerdictPanel
          flow={f}
          question={lastQuestionRef.current}
          projectName={projectName}
          projectId={activeProject?.id}
        />
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
                {persisted.length} expert ticket(s) created and delivered to their inboxes.
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
    const conflictSection = f.conflicts.length > 0
      ? `<div class="pdf-conflict">
          <h3>⚠ Expert Conflict Detected</h3>
          ${f.conflicts.map((c) => `
            <div class="pdf-conflict-pair">
              <div class="pdf-conflict-side ${c.stanceA}">
                <span class="pdf-stance">${c.stanceA === "approve" ? "✓ Supports" : "✗ Against"}</span>
                <strong>${c.expertA.split(" · ")[0]}</strong>
                <p>"${c.textA}"</p>
              </div>
              <div class="pdf-conflict-side ${c.stanceB}">
                <span class="pdf-stance">${c.stanceB === "approve" ? "✓ Supports" : "✗ Against"}</span>
                <strong>${c.expertB.split(" · ")[0]}</strong>
                <p>"${c.textB}"</p>
              </div>
            </div>`).join("")}
          <p class="pdf-conflict-note">Resolution required before final decision. Consider requesting a joint review from both experts.</p>
        </div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Decision Brief — ${projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; font-size: 12px; color: #0f172a; background: #fff; padding: 40px 48px; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #009b3a; padding-bottom: 16px; margin-bottom: 28px; }
    .brand { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #009b3a; }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin-top: 6px; color: #0f172a; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    .score-row { display: flex; align-items: center; gap: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
    .score-num { font-size: 36px; font-weight: 800; color: #009b3a; font-variant-numeric: tabular-nums; min-width: 72px; }
    .score-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #009b3a; margin-bottom: 4px; }
    .score-note { font-size: 12px; color: #334155; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .card-full { grid-column: 1 / -1; }
    .tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #009b3a; margin-bottom: 6px; display: block; }
    .card h3 { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .card p { font-size: 12px; color: #475569; }
    ul { padding-left: 16px; }
    li { font-size: 12px; color: #475569; margin-bottom: 3px; }
    .card.risk { border-left: 3px solid #f59e0b; }
    .card.missing { border-left: 3px solid #e11d48; }
    .card.reco { border-left: 3px solid #009b3a; background: #f0fdf4; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th { text-align: left; padding: 7px 8px; border-bottom: 1.5px solid #e2e8f0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; font-size: 9.5px; }
    td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .pdf-conflict { border: 1.5px solid #fde68a; background: #fffbeb; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px; page-break-inside: avoid; }
    .pdf-conflict h3 { font-size: 13px; color: #92400e; margin-bottom: 12px; }
    .pdf-conflict-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
    .pdf-conflict-side { border-radius: 8px; padding: 10px 12px; font-size: 11px; }
    .pdf-conflict-side.approve { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .pdf-conflict-side.reject  { background: #fff1f2; border: 1px solid #fecdd3; }
    .pdf-stance { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
    .approve .pdf-stance { color: #009b3a; }
    .reject .pdf-stance  { color: #e11d48; }
    .pdf-conflict-note { font-size: 11px; color: #92400e; margin-top: 6px; font-style: italic; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { padding: 24px 32px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Collaborative Insight · Decision Brief</div>
      <h1>${projectName}</h1>
      <p style="font-size:11px;color:#64748b;margin-top:4px">${f.foundTitle} decision</p>
    </div>
    <div class="meta">
      <div>Readiness Score</div>
      <div style="font-size:22px;font-weight:800;color:#009b3a">${f.score}%</div>
      <div style="margin-top:4px">${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
    </div>
  </div>

  <div class="score-row">
    <div class="score-num">${f.score}%</div>
    <div>
      <div class="score-label">Decision Readiness</div>
      <div class="score-note">${f.found ? "Decision supported by expert knowledge. Conditions below must be met." : "Knowledge gaps identified. Expert input required before deciding."}</div>
    </div>
  </div>

  ${conflictSection}

  <div class="grid">
    <div class="card reco card-full">
      <span class="tag">Final Recommendation</span>
      <h3>${f.recommendation}</h3>
      <p>${f.reason}</p>
    </div>
    <div class="card">
      <span class="tag">Business Impact</span>
      <p>${f.businessImpact}</p>
    </div>
    <div class="card risk">
      <span class="tag">Risk</span>
      <p>${f.risk}</p>
    </div>
    <div class="card missing">
      <span class="tag">Missing Information</span>
      ${f.missingInfo.length ? `<ul>${f.missingInfo.map((m) => `<li>${m}</li>`).join("")}</ul>` : "<p>No critical gaps identified.</p>"}
    </div>
    <div class="card">
      <span class="tag">Recommended Actions</span>
      <ul>${f.actions.map((a) => `<li>${a}</li>`).join("")}</ul>
    </div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <span class="tag">Evidence Traceability</span>
    <table>
      <thead><tr><th>Evidence</th><th>Source</th><th>Expert</th><th>Confidence</th></tr></thead>
      <tbody>${f.evidence.map((e) => `<tr><td>${e[0]}</td><td>${e[1]}</td><td>${e[2]}</td><td>${e[3]}</td></tr>`).join("")}</tbody>
    </table>
  </div>

  <div class="footer">
    <span>Generated by Collaborative Insight · Infineon Hackathon 2025</span>
    <span>${new Date().toISOString()}</span>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=860,height=1000");
    if (!w) { alert("Allow pop-ups to export PDF."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  const ask = async (q: string) => {
    lastQuestionRef.current = q;
    localStorage.setItem("db_last_pm_q", q);
    appendMsg("user", <p>{q}</p>);
    setQuestion("");
    setIsThinking(true);

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

    setIsThinking(false);
    setProjectName(activeProject ? activeProject.name : flow.project);

    const chip = flow.found
      ? <span className="result-chip found">Existing expert knowledge found</span>
      : <span className="result-chip missing">Knowledge gap found</span>;

    appendMsg("ai", (
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
    ));
  };

  const sendQuestion = () => {
    const q = question.trim();
    if (!q) {
      alert("Please type a decision question.");
      return;
    }
    ask(q);
  };

  const showStarters = messages.length === 1;
  const pmDecisions = usePmDecisions();

  const logEvents = [...kb, ...tickets, ...pmDecisions].length;

  return (
    <section className="view pm-view">
      <div className="pm-tabs">
        <button className={`pm-tab ${pmTab === "chat" ? "active" : ""}`} onClick={() => setPmTab("chat")}>Ask a question</button>
        <button className={`pm-tab ${pmTab === "log" ? "active" : ""}`} onClick={() => setPmTab("log")}>
          Decision log{logEvents > 0 && <span className="tab-badge">{logEvents}</span>}
        </button>
      </div>
      {pmTab === "log" && (
        <PmDecisionLog kb={kb} tickets={tickets} pmDecisions={pmDecisions} projects={projects} selectedProjectId={selectedProjectId} />
      )}
      {pmTab === "chat" && <>
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
        {isThinking && (
          <div className="message ai">
            <div className="avatar">AI</div>
            <div className="bubble">
              <div className="translating-state">
                <div className="translating-spinner" />
                <span>Searching knowledge base…</span>
              </div>
            </div>
          </div>
        )}
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
        </div>
        <div className="input-row">
          <textarea className="question-input" placeholder="Type your decision question here..."
            value={question} onChange={(e) => setQuestion(e.target.value)}
          />
          <button onClick={sendQuestion}>Send</button>
        </div>
      </section>
      </>}
    </section>
  );
}

function PmDecisionLog({
  kb, tickets, pmDecisions, projects, selectedProjectId,
}: {
  kb: Knowledge[];
  tickets: ReturnType<typeof useTickets>;
  pmDecisions: PmDecision[];
  projects: ReturnType<typeof useProjects>;
  selectedProjectId: string;
}) {
  const project = projects.find((p) => p.id === selectedProjectId) ?? null;

  type TlEvent =
    | { kind: "knowledge"; ts: number; area: string; expert: string; source: string; text: string }
    | { kind: "ticket"; ts: number; area: string; assignedTo: string; question: string; status: string; answer?: string; answeredAt?: number }
    | { kind: "conflict"; ts: number; area: string; expertA: string; stanceA: string; expertB: string; stanceB: string }
    | { kind: "verdict"; ts: number; area: string; verdict: "approved" | "rejected"; topic: string; question: string; score: number; comment: string; experts: string[] };

  const scopedKb = kb.filter((k) => !project || k.projectId === project.id);

  // Detect conflicts per area in the current KB
  const areaGroups: Record<string, Knowledge[]> = {};
  for (const k of scopedKb) {
    (areaGroups[k.area] ??= []).push(k);
  }
  const conflictEvents: TlEvent[] = [];
  for (const [area, entries] of Object.entries(areaGroups)) {
    const pairs = detectConflicts(entries);
    for (const c of pairs) {
      const ts = Math.max(...entries.map((e) => e.createdAt));
      conflictEvents.push({ kind: "conflict", ts, area, expertA: c.expertA, stanceA: c.stanceA, expertB: c.expertB, stanceB: c.stanceB });
    }
  }

  const verdictEvents: TlEvent[] = pmDecisions
    .filter((d) => !project || d.projectId === project.id)
    .map((d): TlEvent => ({
      kind: "verdict",
      ts: d.createdAt,
      area: d.topic,
      verdict: d.verdict,
      topic: d.topic,
      question: d.question,
      score: d.score,
      comment: d.comment,
      experts: d.expertsConsulted,
    }));

  const events: TlEvent[] = [
    ...scopedKb
      .map((k): TlEvent => ({ kind: "knowledge", ts: k.createdAt, area: k.area, expert: k.expert, source: k.source, text: k.text.slice(0, 160) + (k.text.length > 160 ? "…" : "") })),
    ...tickets
      .filter((t) => !project || t.projectId === project.id)
      .map((t): TlEvent => ({ kind: "ticket", ts: t.createdAt, area: t.area, assignedTo: t.assignedTo, question: t.question, status: t.status, answer: t.answer, answeredAt: t.answeredAt })),
    ...conflictEvents,
    ...verdictEvents,
  ].sort((a, b) => b.ts - a.ts);

  const fmt = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const kbCount = events.filter((e) => e.kind === "knowledge").length;
  const ticketCount = events.filter((e) => e.kind === "ticket").length;
  const answeredCount = tickets.filter((t) => t.status === "answered" && (!project || t.projectId === project.id)).length;
  const conflictCount = conflictEvents.length;
  const approvedCount = verdictEvents.filter((e) => e.kind === "verdict" && e.verdict === "approved").length;
  const rejectedCount = verdictEvents.filter((e) => e.kind === "verdict" && e.verdict === "rejected").length;

  return (
    <div className="decision-log">
      <div className="log-header">
        <div>
          <h2>Decision log</h2>
          <p className="muted">{project ? `Project: ${project.name}` : "All projects"} · full audit trail of captured knowledge and expert tickets</p>
        </div>
        <div className="log-stats">
          <div className="log-stat"><strong>{kbCount}</strong><span>knowledge entries</span></div>
          <div className="log-stat"><strong>{answeredCount}/{ticketCount}</strong><span>tickets answered</span></div>
          {conflictCount > 0 && (
            <div className="log-stat conflict"><strong>{conflictCount}</strong><span>conflict{conflictCount > 1 ? "s" : ""} detected</span></div>
          )}
          {approvedCount > 0 && (
            <div className="log-stat approved"><strong>{approvedCount}</strong><span>approved</span></div>
          )}
          {rejectedCount > 0 && (
            <div className="log-stat rejected"><strong>{rejectedCount}</strong><span>rejected</span></div>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty-box">No activity yet. Capture knowledge from the Expert view or ask a question in the chat to create tickets.</div>
      ) : (
        <div className="timeline">
          {events.map((e, i) => (
            <div key={i} className={`tl-event ${e.kind}`}>
              <div className="tl-left">
                <div className={`tl-dot ${
                  e.kind === "knowledge" ? "green"
                  : e.kind === "conflict" ? "red"
                  : e.kind === "verdict" ? (e.verdict === "approved" ? "green" : "red")
                  : e.kind === "ticket" && e.status === "answered" ? "blue" : "orange"
                }`} />
                {i < events.length - 1 && <div className="tl-line" />}
              </div>
              <div className="tl-body">
                <div className="tl-head">
                  <span className={`tl-tag ${
                    e.kind === "knowledge" ? "green"
                    : e.kind === "conflict" ? "red"
                    : e.kind === "verdict" ? (e.verdict === "approved" ? "green" : "red")
                    : e.kind === "ticket" && e.status === "answered" ? "blue" : "orange"
                  }`}>
                    {e.kind === "knowledge" ? "Knowledge captured"
                      : e.kind === "conflict" ? "⚠ Conflict detected"
                      : e.kind === "verdict" ? (e.verdict === "approved" ? "✓ PM approved" : "✗ PM rejected")
                      : e.status === "answered" ? "Expert answered" : "Ticket sent"}
                  </span>
                  <span className="tl-area">{e.area}</span>
                  <span className="tl-time">{fmt(e.ts)}</span>
                </div>
                {e.kind === "knowledge" && (
                  <>
                    <p className="tl-text">{e.text}</p>
                    <div className="tl-meta">{e.expert} · {e.source}</div>
                  </>
                )}
                {e.kind === "ticket" && (
                  <>
                    <p className="tl-text"><strong>Q:</strong> {e.question}</p>
                    {e.answer && <p className="tl-text tl-answer"><strong>A:</strong> {e.answer}</p>}
                    <div className="tl-meta">Assigned to {e.assignedTo}{e.answeredAt ? ` · answered ${fmt(e.answeredAt)}` : " · pending"}</div>
                  </>
                )}
                {e.kind === "conflict" && (
                  <div className="tl-conflict-body">
                    <div className={`tl-conflict-side ${e.stanceA}`}>
                      <strong>{e.expertA.split(" · ")[0]}</strong>
                      <span>{e.stanceA === "approve" ? "✓ Supports" : "✗ Against"}</span>
                    </div>
                    <div className="tl-conflict-vs">vs</div>
                    <div className={`tl-conflict-side ${e.stanceB}`}>
                      <strong>{e.expertB.split(" · ")[0]}</strong>
                      <span>{e.stanceB === "approve" ? "✓ Supports" : "✗ Against"}</span>
                    </div>
                  </div>
                )}
                {e.kind === "verdict" && (
                  <>
                    <p className="tl-text"><strong>Decision question:</strong> "{e.question}"</p>
                    <p className="tl-text">Readiness score: <strong>{e.score}%</strong></p>
                    {e.comment && <p className="tl-text tl-answer"><strong>PM note:</strong> {e.comment}</p>}
                    <div className="tl-meta">
                      {e.experts.length > 0
                        ? `Experts consulted: ${e.experts.map((ex) => ex.split(" · ")[0]).join(", ")}`
                        : "No experts consulted"}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
  const kb = useKnowledge();
  const tickets = useTickets();

  // Build expertise depth per expert from the knowledge base
  const expertStats = useMemo(() => {
    return f.experts.map((e) => {
      const name = e[0];
      const areaEntries = kb.filter((k) => k.expert === name && k.area === f.area);
      const totalEntries = kb.filter((k) => k.expert === name);
      const lastEntry = totalEntries.sort((a, b) => b.createdAt - a.createdAt)[0];
      const daysSince = lastEntry
        ? Math.floor((Date.now() - lastEntry.createdAt) / 86400000)
        : null;
      const openTickets = tickets.filter((t) => t.assignedTo === name && t.status === "open").length;
      const answeredTickets = tickets.filter((t) => t.assignedTo === name && t.status === "answered").length;
      // Rank score: area contributions × 4 + total × 1 + answered tickets × 2
      const rank = areaEntries.length * 4 + totalEntries.length + answeredTickets * 2;
      return { name, areaEntries: areaEntries.length, totalEntries: totalEntries.length, daysSince, openTickets, answeredTickets, rank };
    });
  }, [kb, tickets, f.experts, f.area]);

  // Sort experts by rank descending
  const sortedExperts = useMemo(() => {
    const withStats = f.experts.map((e, i) => ({ e, stats: expertStats[i] }));
    return withStats.sort((a, b) => b.stats.rank - a.stats.rank);
  }, [f.experts, expertStats]);

  const bestMatchName = sortedExperts[0]?.e[0];
  const maxAreaEntries = Math.max(1, ...expertStats.map((s) => s.areaEntries));

  const defaultSelected = new Set<string>(sortedExperts.map((x) => x.e[0]));
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
    for (const { e } of sortedExperts) {
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

  if (sent) {
    return (
      <div className="tickets-sent-confirm">
        <span className="tickets-sent-icon">✓</span>
        <div>
          <strong>{selected.size} expert ticket{selected.size === 1 ? "" : "s"} sent</strong>
          <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
            {Array.from(selected).join(", ")} · Switch to the Expert view to see responses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="expert-selector-header">
        <strong>Recommended experts</strong>
        <span className="muted" style={{ fontSize: 12 }}>Ranked by knowledge depth · click to select</span>
      </div>
      <div className="expert-list">
        {sortedExperts.map(({ e, stats }, i) => {
          const isSel = selected.has(e[0]);
          const color = EXPERT_DOMAINS[e[0]]?.color ?? "#667085";
          const initials = e[0].split(" ").map((s) => s[0]).slice(0, 2).join("");
          const isBest = e[0] === bestMatchName;
          const depthPct = Math.round((stats.areaEntries / maxAreaEntries) * 100);
          return (
            <div key={i} className={`expert-row${isSel ? " selected" : ""}${isBest ? " best-match" : ""}`}>
              <div className="expert-row-main" onClick={() => toggle(e[0])} role="button" aria-pressed={isSel}>
                <div className={`expert-check-box${isSel ? " checked" : ""}`}>
                  {isSel && <span>✓</span>}
                </div>
                <div className="expert-avatar-sm" style={{ background: color }}>{initials}</div>
                <div className="expert-row-info">
                  <div className="expert-row-name">
                    {e[0]}
                    {isBest && <span className="best-match-badge">Best match</span>}
                  </div>
                  <div className="expert-row-role">{e[1]}</div>
                  <div className="expert-depth-row">
                    <div className="expert-depth-bar-track">
                      <div className="expert-depth-bar-fill" style={{ width: `${depthPct}%` }} />
                    </div>
                    <span className="expert-depth-label">
                      {stats.areaEntries > 0
                        ? `${stats.areaEntries} contribution${stats.areaEntries !== 1 ? "s" : ""} in this area`
                        : stats.totalEntries > 0
                          ? `${stats.totalEntries} total contribution${stats.totalEntries !== 1 ? "s" : ""}`
                          : "No contributions yet"}
                      {stats.daysSince !== null && stats.daysSince <= 30 && (
                        <span className="expert-recency"> · active {stats.daysSince === 0 ? "today" : `${stats.daysSince}d ago`}</span>
                      )}
                    </span>
                  </div>
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
          {selected.size} of {sortedExperts.length} expert{sortedExperts.length === 1 ? "" : "s"} selected
        </span>
        <button
          className="action-btn"
          onClick={submit}
          disabled={selected.size === 0}
        >
          {selected.size === 0
            ? "Select at least one expert"
            : `Send tickets to ${selected.size} expert${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </>
  );
}
