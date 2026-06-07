import { useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { extractKnowledge } from "@/lib/extract-knowledge.functions";
import { addKnowledge, useKnowledge, type Knowledge } from "@/lib/knowledge-store";
import { addTicket, answerTicket, useTickets, type Ticket } from "@/lib/ticket-store";
import {
  adminPeople,
  categoryMap,
  classify,
  type Category,
  type Person,
} from "@/lib/decisionbridge-data";

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

function buildFlow(question: string, kb: Knowledge[]): Flow {
  const key = classify(question);
  const base = categoryMap[key];
  const matching = kb.filter((k) => k.area === base.area);
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

export function AdminView() {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [onboarded, setOnboarded] = useState<Person[]>([]);
  const [adminNotice, setAdminNotice] = useState("");

  const onboard = () => {
    const sel = Array.from(checked).map((i) => adminPeople[i]);
    setOnboarded(sel);
    setAdminNotice(`${sel.length} people onboarded to the project workspace.`);
  };

  return (
    <section className="view">
      <div className="single-layout">
        <div className="panel">
          <h2>Onboard a project</h2>
          <div className="form-grid">
            <div><label>Project name</label><input defaultValue="Power Module X" /></div>
            <div><label>Business unit</label><input defaultValue="Automotive Power Semiconductors" /></div>
            <div><label>Project manager</label><input defaultValue="Sarah Klein · Project Manager" /></div>
            <div>
              <label>Decision area</label>
              <select>
                <option>Supplier, production, reliability, quality</option>
                <option>Manufacturing process and yield</option>
                <option>Product change and material qualification</option>
              </select>
            </div>
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
          <button onClick={onboard}>Onboard selected people</button>
          {adminNotice && <div className="notice">{adminNotice}</div>}
          <h3>People currently in workspace</h3>
          {onboarded.length === 0 ? (
            <div className="empty-box">No people onboarded yet.</div>
          ) : (
            <div className="people-list">
              {onboarded.map((p, i) => (
                <div key={i} className="person-card">
                  <strong>{p[0]} · {p[1]}</strong>
                  <span>{p[2]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ExpertView() {
  const [expertName, setExpertName] = useState(EXPERTS[0]);
  const [tab, setTab] = useState<"capture" | "tickets">("capture");
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
        </div>
      </div>
      {tab === "capture"
        ? <ExpertCapturePanel expertName={expertName} />
        : <ExpertTicketsPanel expertName={expertName} myName={myName} />}
    </section>
  );
}

function ExpertCapturePanel({ expertName }: { expertName: string }) {
  const kb = useKnowledge();
  const [knowledgeArea, setKnowledgeArea] = useState("Supplier approval");
  const [transcript, setTranscript] = useState("");
  const [transcriptFileName, setTranscriptFileName] = useState("");
  const [additionalInsights, setAdditionalInsights] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [imageFileName, setImageFileName] = useState("");
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

  const runExtract = useServerFn(extractKnowledge);

  const onTranscriptFile = async (file: File | undefined) => {
    if (!file) return;
    setTranscriptFileName(file.name);
    const text = await file.text();
    setTranscript((prev) => (prev ? prev + "\n\n" + text : text));
  };

  const onImageFile = (file: File | undefined) => {
    if (!file) { setImageDataUrl(""); setImageFileName(""); return; }
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    setError("");
    if (!transcript.trim() && !imageDataUrl && !additionalInsights.trim()) {
      setError("Add a transcript, an image of notes, or additional insights first.");
      return;
    }
    setIsGenerating(true);
    setDraft(null);
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      if (imageDataUrl) {
        const match = /^data:(.+?);base64,(.*)$/.exec(imageDataUrl);
        if (match) { imageMimeType = match[1]; imageBase64 = match[2]; }
      }
      const result = await runExtract({
        data: { knowledgeArea, expertName, transcript, additionalInsights, imageBase64, imageMimeType },
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
    const sources: string[] = [];
    if (transcriptFileName) sources.push(`Transcript: ${transcriptFileName}`);
    else if (transcript.trim()) sources.push("Pasted transcript");
    if (imageFileName) sources.push(`Notes image: ${imageFileName}`);
    if (!sources.length) sources.push(draft.sourceLabel || "Expert manual entry");

    addKnowledge({
      area: knowledgeArea,
      expert: expertName.split(" · ")[0],
      text: body,
      source: sources.join(" · "),
      confidence,
    });
    setDraft(null);
    setTranscript(""); setTranscriptFileName("");
    setAdditionalInsights("");
    setImageDataUrl(""); setImageFileName("");
    setExpertNotice("Knowledge added. PM decision chat can now reuse this knowledge.");
  };

  return (
    <div className="split-layout">
      <div className="panel">
        <h2>Capture expert knowledge from meetings</h2>
        <p className="muted">
          Upload a meeting transcript or a photo of handwritten notes. The AI drafts a knowledge entry that you can review, edit with additional insights, and approve. Approved entries are immediately available to Project Managers.
        </p>
        <div className="form-grid">
          <div>
            <label>Knowledge area</label>
            <select value={knowledgeArea} onChange={(e) => setKnowledgeArea(e.target.value)}>
              <option>Supplier approval</option>
              <option>Manufacturing defect</option>
              <option>Pilot batch shipment</option>
              <option>Packaging material change</option>
              <option>New testing process</option>
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
          placeholder="Paste meeting transcript here, or attach a .txt file below..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <div className="form-grid">
          <div>
            <label>Attach transcript file</label>
            <label className="attach-btn wide-attach" htmlFor="transcriptFile">Attach .txt transcript</label>
            <input id="transcriptFile" type="file" accept=".txt,text/plain,.md" className="hidden-input"
              onChange={(e) => onTranscriptFile(e.target.files?.[0])} />
            <div className="file-text">{transcriptFileName ? "Attached: " + transcriptFileName : "No transcript file."}</div>
          </div>
          <div>
            <label>Attach handwritten notes (image)</label>
            <label className="attach-btn wide-attach" htmlFor="notesImage">Attach photo of notes</label>
            <input id="notesImage" type="file" accept="image/*" className="hidden-input"
              onChange={(e) => onImageFile(e.target.files?.[0])} />
            <div className="file-text">{imageFileName ? "Attached: " + imageFileName : "No image attached."}</div>
            {imageDataUrl && <img src={imageDataUrl} alt="notes preview" className="notes-preview" />}
          </div>
        </div>

        <label>Additional expert insights (optional)</label>
        <textarea
          className="large-text"
          placeholder="Add anything the transcript or notes miss — context, caveats, decisions..."
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
        <p className="muted">Shared with all PMs in this workspace.</p>
        {kb.length === 0 ? (
          <div className="empty-box">No expert knowledge added yet.</div>
        ) : (
          <div className="knowledge-feed">
            {kb.map((k) => (
              <div key={k.id} className="knowledge-row">
                <strong>{k.area}</strong>
                <span style={{ whiteSpace: "pre-wrap" }}>{k.expert}: {k.text}</span>
                <span>Source: {k.source} · {k.confidence}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
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
            {open.map((t) => (
              <div key={t.id} className="ticket-card">
                <div className="ticket-head">
                  <div>
                    <span className="ticket-pill open">Open</span>
                    <strong>{t.title}</strong>
                  </div>
                  <span className="ticket-meta">{new Date(t.createdAt).toLocaleString()}</span>
                </div>
                <p className="ticket-q"><strong>PM asked:</strong> "{t.sourceQuestion}"</p>
                <p className="muted">{t.question}</p>
                <textarea
                  className="large-text"
                  placeholder="Type your expert answer..."
                  value={drafts[t.id] || ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                />
                <div className="action-row">
                  <button onClick={() => send(t)}>Send answer & publish to knowledge base</button>
                </div>
              </div>
            ))}
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
  const openTickets = tickets.filter((t) => t.status === "open");
  const answeredTickets = tickets.filter((t) => t.status === "answered");


  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 0,
      type: "ai",
      node: (
        <>
          <p><strong>Hello — ask a project decision question in your own words.</strong></p>
          <p>I check the expert knowledge base first. If an answer already exists, I give you a decision brief with a full evidence chain. If not, I show the right experts and create tickets.</p>
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
            <button className="action-btn" onClick={() => showDecisionBrief(f)}>Create decision brief</button>
          ) : (
            <button className="action-btn" onClick={() => showExperts(f)}>Show experts and prepare tickets</button>
          )}
        </div>
      </>
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

  const ask = (q: string) => {
    const flow = buildFlow(q, kbRef.current);
    lastQuestionRef.current = q;
    setProjectName(flow.project);
    appendMsg("user", <p>{q}</p>);
    setQuestion("");
    setTimeout(() => {
      const chip = flow.found ? (
        <span className="result-chip found">Existing expert knowledge found</span>
      ) : (
        <span className="result-chip missing">Knowledge gap found</span>
      );
      appendMsg(
        "ai",
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
      );
    }, 350);
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
              {kb.length > 0
                ? `${kb.length} approved expert knowledge entr${kb.length === 1 ? "y" : "ies"} available.`
                : "No expert knowledge captured yet — ask anyway and I'll route you to the right experts."}
            </div>
          </div>
        )}
      </section>
      <section className="composer">
        <div className="meta-row">
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project / product" />
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
  onCreated,
}: {
  f: Flow;
  sourceQuestion: string;
  onCreated: (persisted: Ticket[]) => void;
}) {
  const defaultSelected = new Set<string>(f.tickets.map((t) => t[1]));
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
        }),
      );
    }
    setSent(true);
    onCreated(persisted);
  };

  return (
    <>
      <p><strong>Recommended experts — select who to route this question to</strong></p>
      <div className="block">
        <div className="two-col">
          {f.experts.map((e, i) => {
            const isSel = selected.has(e[0]);
            return (
              <div key={i} className={`item expert-card ${isSel ? "selected" : ""}`}>
                <div className="expert-pick-header">
                  <div style={{ flex: 1 }}>
                    <h4>{e[0]}</h4>
                    <p><strong>{e[1]}</strong></p>
                    <p>{e[2]}</p>
                    <div>
                      <span className="tag green">{e[3]}</span>{" "}
                      <span className="tag orange">{e[4]}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`expert-select-btn ${isSel ? "selected" : ""}`}
                    onClick={() => toggle(e[0])}
                    disabled={sent}
                    aria-pressed={isSel}
                  >
                    {isSel ? "✓ Selected" : "+ Select"}
                  </button>
                </div>
                {isSel && (
                  <div style={{ marginTop: 10 }}>
                    <label className="muted" style={{ fontSize: 12 }}>Question for {e[0].split(" ")[0]}</label>
                    <textarea
                      className="expert-question"
                      value={questions[e[0]]}
                      disabled={sent}
                      onChange={(ev) =>
                        setQuestions({ ...questions, [e[0]]: ev.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="action-row">
        <button
          className="action-btn"
          onClick={submit}
          disabled={selected.size === 0 || sent}
        >
          {sent
            ? "Tickets sent"
            : selected.size === 0
              ? "Select at least one expert"
              : `Send ticket${selected.size === 1 ? "" : "s"} to ${selected.size} expert${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </>
  );
}
