import { useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { extractKnowledge } from "@/lib/extract-knowledge.functions";
import {
  adminPeople,
  categoryMap,
  classify,
  type Category,
  type Person,
} from "@/lib/decisionbridge-data";

type Knowledge = {
  area: string;
  expert: string;
  text: string;
  source: string;
  confidence: string;
};

type Flow = Category & {
  found: boolean;
  key: string;
  score: number;
  evidence: [string, string, string, string][];
};

type ChatMsg = { type: "ai" | "user"; node: ReactNode; id: number };

function buildFlow(question: string, kb: Knowledge[]): Flow {
  const key = classify(question);
  const base = categoryMap[key];
  const matching = kb.filter((k) => k.area === base.area);
  const found = matching.length > 0;
  const evidence: [string, string, string, string][] = found
    ? matching.map((k) => [
        `${k.area} expert knowledge`,
        k.source,
        k.expert,
        k.confidence.replace(" confidence", ""),
      ])
    : [["No approved expert knowledge found", "DecisionBridge Knowledge Index", "DecisionBridge AI", "Low"]];
  return {
    ...base,
    found,
    key,
    score: found ? (key === "defect" ? 68 : 72) : 36,
    evidence,
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
  const [kb, setKb] = useState<Knowledge[]>([]);
  const [expertName, setExpertName] = useState("Dr. Lukas Müller · Reliability Expert");
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
    if (!file) {
      setImageDataUrl("");
      setImageFileName("");
      return;
    }
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
        if (match) {
          imageMimeType = match[1];
          imageBase64 = match[2];
        }
      }
      const result = await runExtract({
        data: {
          knowledgeArea,
          expertName,
          transcript,
          additionalInsights,
          imageBase64,
          imageMimeType,
        },
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

    const entry: Knowledge = {
      area: knowledgeArea,
      expert: expertName.split(" · ")[0],
      text: body,
      source: sources.join(" · "),
      confidence,
    };
    setKb((k) => [entry, ...k]);
    setDraft(null);
    setTranscript("");
    setTranscriptFileName("");
    setAdditionalInsights("");
    setImageDataUrl("");
    setImageFileName("");
    setExpertNotice("Knowledge added. PM decision chat can now reuse this knowledge.");
  };

  return (
    <section className="view">
      <div className="split-layout">
        <div className="panel">
          <h2>Capture expert knowledge from meetings</h2>
          <p className="muted">
            Upload a meeting transcript or a photo of handwritten notes. The AI drafts a knowledge entry that you can review, edit with additional insights, and approve.
          </p>
          <div className="form-grid">
            <div>
              <label>Expert name</label>
              <select value={expertName} onChange={(e) => setExpertName(e.target.value)}>
                <option>Dr. Lukas Müller · Reliability Expert</option>
                <option>Anna Weber · Supplier Qualification Expert</option>
                <option>Markus Klein · Supply Chain Expert</option>
                <option>Thomas Richter · Quality Expert</option>
                <option>Maria Hoffmann · Manufacturing Expert</option>
              </select>
            </div>
            <div>
              <label>Knowledge area</label>
              <select value={knowledgeArea} onChange={(e) => setKnowledgeArea(e.target.value)}>
                <option>Supplier approval</option>
                <option>Manufacturing defect</option>
                <option>Pilot batch shipment</option>
                <option>Material change</option>
                <option>New testing process</option>
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
              <input
                id="transcriptFile"
                type="file"
                accept=".txt,text/plain,.md"
                className="hidden-input"
                onChange={(e) => onTranscriptFile(e.target.files?.[0])}
              />
              <div className="file-text">{transcriptFileName ? "Attached: " + transcriptFileName : "No transcript file."}</div>
            </div>
            <div>
              <label>Attach handwritten notes (image)</label>
              <label className="attach-btn wide-attach" htmlFor="notesImage">Attach photo of notes</label>
              <input
                id="notesImage"
                type="file"
                accept="image/*"
                className="hidden-input"
                onChange={(e) => onImageFile(e.target.files?.[0])}
              />
              <div className="file-text">{imageFileName ? "Attached: " + imageFileName : "No image attached."}</div>
              {imageDataUrl && (
                <img src={imageDataUrl} alt="notes preview" className="notes-preview" />
              )}
            </div>
          </div>

          <label>Additional expert insights (optional)</label>
          <textarea
            className="large-text"
            placeholder="Add anything the transcript or notes miss — context, caveats, decisions..."
            value={additionalInsights}
            onChange={(e) => setAdditionalInsights(e.target.value)}
          />

          <div className="form-grid">
            <div>
              <label>Confidence</label>
              <select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                <option>High confidence</option>
                <option>Medium confidence</option>
                <option>Low confidence</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={generate} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate knowledge with AI"}
              </button>
            </div>
          </div>

          {error && <div className="notice" style={{ background: "#fdecec", color: "#a02020" }}>{error}</div>}

          {draft && (
            <div className="block draft-block">
              <h3>AI-drafted knowledge entry</h3>
              <p><strong>Summary:</strong> {draft.summary}</p>
              {draft.keyPoints.length > 0 && (
                <>
                  <p><strong>Key points:</strong></p>
                  <ul>
                    {draft.keyPoints.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
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
          {kb.length === 0 ? (
            <div className="empty-box">No expert knowledge added yet.</div>
          ) : (
            <div className="knowledge-feed">
              {kb.map((k, i) => (
                <div key={i} className="knowledge-row">
                  <strong>{k.area}</strong>
                  <span style={{ whiteSpace: "pre-wrap" }}>{k.expert}: {k.text}</span>
                  <span>Source: {k.source} · {k.confidence}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export function PmChatView() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 0,
      type: "ai",
      node: (
        <>
          <p><strong>Hello, ask a project decision question in your own words.</strong></p>
          <p>I will first check the expert knowledge base. If an answer already exists, I will give you a decision brief with evidence. If not, I will show the right experts and create tickets.</p>
        </>
      ),
    },
  ]);
  const [projectName, setProjectName] = useState("Power Module X");
  const [question, setQuestion] = useState("");
  const [pmFiles, setPmFiles] = useState<string[]>([]);
  const kb: Knowledge[] = [];
  const msgIdRef = useRef(1);
  const chatRef = useRef<HTMLDivElement>(null);

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
          <thead><tr><th>Finding</th><th>Source</th><th>Owner</th><th>Confidence</th></tr></thead>
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
      : "Decision is not ready yet. The PM should collect expert input before deciding.";
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
        <div className="block">
          <p><strong>Recommendation:</strong> {f.recommendation}</p>
          <p><strong>Main reason:</strong> {f.reason}</p>
          <p><strong>Main risk:</strong> {f.risk}</p>
          <p><strong>Next step:</strong> {f.next}</p>
        </div>
        <div className="block">
          <h4>Expert + Evidence Traceability</h4>
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
      <>
        <p><strong>Recommended experts in this project workspace</strong></p>
        <div className="block">
          <div className="two-col">
            {f.experts.map((e, i) => (
              <div key={i} className="item expert-card">
                <div>
                  <h4>{e[0]}</h4>
                  <p><strong>{e[1]}</strong></p>
                  <p>{e[2]}</p>
                </div>
                <div>
                  <span className="tag green">{e[3]}</span><br /><br />
                  <span className="tag orange">{e[4]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="action-row">
          <button className="action-btn" onClick={() => createTickets(f)}>Create expert tickets</button>
        </div>
      </>
    );
  };

  const createTickets = (f: Flow) => {
    appendMsg(
      "ai",
      <>
        <div className="ticket-created">{f.tickets.length} expert ticket(s) created and routed.</div>
        <div className="block">
          <div className="two-col">
            {f.tickets.map((t, i) => (
              <div key={i} className="item">
                <span>Ticket</span>
                <p><strong>{t[0]}</strong></p>
                <p>Assigned to: {t[1]}</p>
                <p>{t[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const exportBrief = (f: Flow) => {
    const text = `DecisionBridge - Decision Brief

Project: ${projectName}
Decision type: ${f.foundTitle}
Recommendation: ${f.recommendation}
Readiness Score: ${f.score}%

Main reason:
${f.reason}

Main risk:
${f.risk}

Next step:
${f.next}

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

  const sendQuestion = () => {
    const q = question.trim();
    if (!q) {
      alert("Please type a decision question.");
      return;
    }
    const flow = buildFlow(q, kb);
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

  const fileText = useMemo(
    () => (pmFiles.length ? "Attached: " + pmFiles.join(", ") : "No files attached. DecisionBridge will use the expert knowledge base."),
    [pmFiles]
  );

  return (
    <section className="view pm-view">
      <section className="chat-area" ref={chatRef}>
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.type}`}>
            <div className="avatar">{m.type === "ai" ? "AI" : "PM"}</div>
            <div className="bubble">{m.node}</div>
          </div>
        ))}
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
