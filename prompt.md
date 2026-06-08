# Build Prompt: Collaborative Insight — Decision Intelligence Platform

Build a web application called **Collaborative Insight** (or **DecisionBridge**). It is an AI-powered decision intelligence platform that bridges the gap between technical experts and business decision makers in large engineering organizations.

---

## Core Problem Being Solved

In engineering companies, valuable knowledge is locked in meetings, documents, and individual experts' heads. Decision makers (Project Managers) cannot find the right expert, do not understand technical language, and the same knowledge gets rediscovered repeatedly. This app solves all three problems.

---

## Tech Stack

- **Framework**: React with Vite (or Next.js)
- **Styling**: Tailwind CSS or plain CSS
- **State**: React useState / localStorage for persistence (no backend database required)
- **AI**: Google Gemini API (via Google AI Studio key) — use `@google/generative-ai` npm package or fetch directly
- **Language**: TypeScript

---

## Authentication (Demo Only)

No real auth. On the landing/login page, show three role cards the user can click to enter:

1. **Admin** — manages the team and project workspace
2. **Expert** — captures knowledge and answers questions from PMs
3. **Project Manager (PM)** — asks decision questions and gets AI-powered briefs

Store the selected role in `localStorage` as `demo_role`. On protected pages, read this and redirect to `/auth` if missing.

---

## Data Models (all stored in localStorage)

### Knowledge Entry
```ts
type Knowledge = {
  id: string;
  area: string;          // e.g. "Supplier approval"
  expert: string;        // expert's name
  text: string;          // full knowledge text (summary + key points)
  source: string;        // e.g. "Meeting transcript · supplier_review.txt"
  confidence: string;    // "High confidence" | "Medium confidence" | "Low confidence"
  createdAt: number;     // Date.now()
}
```

### Ticket (expert request)
```ts
type Ticket = {
  id: string;
  title: string;
  assignedTo: string;    // expert name
  question: string;      // specific question for the expert
  area: string;          // decision area
  sourceQuestion: string; // original PM question
  status: "open" | "answered";
  createdAt: number;
  answeredAt?: number;
  answer?: string;
}
```

Store knowledge as `db_knowledge_v1` and tickets as `db_tickets_v1` in localStorage. Fire a `CustomEvent` whenever either changes so other parts of the UI can react.

---

## Hardcoded Reference Data

### Expert Roster
```
Dr. Lukas Müller — Reliability Expert — Thermal cycling, lifetime stress, reliability validation
Anna Weber — Supplier Qualification Expert — Previous supplier approval cases and decision memory
Markus Klein — Supply Chain Expert — Lead time, supplier risk, buffer stock
Thomas Richter — Quality Expert — Quality gates, customer risk, failure escape
Maria Hoffmann — Manufacturing Expert — Line compatibility, cycle time, production stability
Sarah Klein — Project Manager — Decision owner for Power Module X
```

### Decision Categories (5 types)
Each category has: area name, business question (PM language), technical question (expert language), recommendation, reason, risk, next action, relevant experts with match %, relevant ticket templates.

**1. Supplier approval**
- Business: "Can Supplier B be approved without creating delivery, quality, cost, or customer risk?"
- Technical: "Has Supplier B passed supplier qualification, reliability validation, production readiness, ERP purchasing checks, and MES quality checks?"
- Recommendation: "Conditional approval"
- Risk: "Full release is risky if final reliability validation is not complete."
- Next: "Approve only for pilot production and request missing final confirmation before full production."
- Experts: Dr. Lukas Müller (92% match), Anna Weber (87%), Markus Klein (84%)
- Ticket templates: "Complete reliability validation" → Dr. Lukas Müller, "Check delivery risk" → Markus Klein

**2. Manufacturing defect**
- Business: "What caused the defect increase and can production continue safely?"
- Technical: "Which process parameter changes correlate with the defect-rate increase in MES data after the Line 3 process change?"
- Recommendation: "Continue with restrictions"
- Risk: "Continuing production without confirmation can increase scrap and customer quality risk."
- Next: "Ask process engineering for final root-cause confirmation and keep stricter quality checks active."
- Experts: Thomas Richter (89%), Maria Hoffmann (86%)

**3. Pilot batch shipment**
- Business: "Can we ship the pilot batch this week without unacceptable quality or customer risk?"
- Technical: "Are manufacturing release, quality gate, reliability status, and customer shipment conditions complete?"
- Recommendation: "Ship pilot batch with conditions"
- Next: "Ship only after quality gate owner confirms release status."
- Experts: Thomas Richter (89%), Maria Hoffmann (86%)

**4. Packaging material change**
- Business: "Can we change the packaging material without product, customer, or production risk?"
- Technical: "Has the new packaging material passed reliability, manufacturability, compliance, and PLM change-control requirements?"
- Recommendation: "Expert input required"
- Experts: Nina Brandt/PLM (90%), Dr. Lukas Müller (88%), Maria Hoffmann (84%)

**5. New testing process**
- Business: "Can we use the new testing process without increasing customer, production, or quality risk?"
- Technical: "Has the new test process been validated for coverage, repeatability, measurement accuracy, line compatibility, and release criteria?"
- Recommendation: "Expert input required"
- Experts: Dr. Eva Schneider/Test Engineering (94%), Thomas Richter (89%), Maria Hoffmann (86%), Jonas Fischer/PLM (81%)

### Keyword Classification
Map PM questions to categories using keywords:
- "supplier" or "supplier b" → supplier
- "defect" or "line 3" → defect
- "ship" or "pilot batch" → pilot
- "material" or "packaging" → material
- anything else → testing

---

## Views

### 1. Auth Page (`/auth`)

Clean centered card with:
- App logo (gradient square with "DB" or "CI" initials)
- App name: "Collaborative Insight" or "DecisionBridge"
- Subtitle: "AI-powered decision intelligence for engineering teams"
- Three role cards (Admin, Expert, PM) each with an icon, title, description, and arrow
- Footnote: "This is a demo — your role is stored locally"

On click, save role to localStorage and navigate to `/admin`, `/expert`, or `/pm`.

---

### 2. Admin View (`/admin`)

**Header section**: Project onboarding form with fields for Project name, Business unit, Project manager, Decision area (dropdown). Select employees from a list with checkboxes. "Onboard selected people" button.

**Expertise Coverage Map** (below the form):
A grid of cards, one per expert. Each card shows:
- Colored initials badge (each expert gets a distinct color)
- Expert name and role title
- Domain tags (3 small pills showing their specialty areas)
- Live stats pulled from localStorage: number of knowledge contributions, open tickets, answered tickets

This map gives the Admin visibility into who is active and who covers what.

---

### 3. Expert View (`/expert`)

Two tabs: **Capture knowledge** | **My tickets** (with badge showing open count)

A dropdown at the top lets you switch between expert personas (for demo purposes).

#### Capture Knowledge Tab

Form with:
- Knowledge area selector (the 5 categories)
- Confidence selector (High / Medium / Low)
- Large textarea for meeting transcript (paste text)
- File upload for transcript (.txt file)
- File upload for handwritten notes image
- Additional insights textarea
- "Generate knowledge with AI" button

**On generate**: Call Gemini API with the transcript/image/insights and ask it to return:
```json
{
  "summary": "2-5 sentence expert knowledge summary",
  "keyPoints": ["point 1", "point 2", ...],
  "recommendedConfidence": "High confidence | Medium confidence | Low confidence",
  "sourceLabel": "Meeting transcript | Handwritten notes | Expert input"
}
```

Show the AI-drafted result in a preview card. User can then click "Add to knowledge base" to save it to localStorage.

#### My Tickets Tab

List of open and answered tickets assigned to the current expert persona.

**Open ticket card** includes:
- Title, timestamp, status pill
- **"Why your input matters" context box** (orange left border): Shows the business decision this ticket belongs to, the financial/timeline impact, and which other experts are contributing to the same decision
- PM's original question
- Specific question for this expert
- Textarea to type the answer
- "Send answer & save to knowledge base" button — saves answer to ticket AND auto-creates a knowledge entry

---

### 4. PM Chat View (`/pm`)

A chat interface layout: scrollable message area on top, fixed composer at bottom.

**Composer**: Project name input, impact selector (High/Medium/Low), file attach button, question textarea, Send button.

**Starter question chips** shown when chat is empty:
- "Can we approve Supplier B for Power Module X?"
- "What caused the defect increase on Line 3?"
- "Should we ship the pilot batch this week?"
- "Can we change the packaging material on Product X?"

**Message flow when PM asks a question** (each step appends a new AI message):

**Step 1 — Classify + Language Bridge**
Show a chip: "Existing expert knowledge found" (green) or "Knowledge gap found" (orange).
Then show a two-column card:
- Left: "PM / business view" — the business question restatement
- Right: "Technical expert view" — the technical question restatement
Button: "Check expert knowledge base"

**Step 2 — Knowledge Evidence**
Show a table with columns: Finding | Source | Expert | Confidence
Rows come from localStorage knowledge entries matching the category area.
Button: "Calculate readiness"

**Step 3 — Decision Readiness Score**
Show a circular donut chart with the score percentage (0–100%).
Score formula:
- Evidence (max 40pts): min(40, count_of_matching_entries × 18)
- Agreement (max 30pts): min(30, unique_expert_count × 18)
- Recency (max 30pts): 30 if newest entry < 30 days old, 20 if < 90 days, 10 if older, 0 if none

Below the circle, show a breakdown table with three rows (Evidence depth, Expert agreement, Knowledge recency) each with a label, progress bar, score, and explanation note.

Below that, show "To raise the score: [specific advice based on what's lowest]".

If knowledge found → Button: **"Translate findings to business language →"**
If no knowledge → Button: **"Show experts and prepare tickets"**

**Step 4a — AI Translation (if knowledge found)**

Show a loading spinner with text "AI is translating technical findings to business language…"

Call Gemini with the question, area, and found technical findings. Prompt:
```
You translate technical engineering findings into clear business language for non-technical decision makers.
Be specific. Quantify impact with realistic estimates. Focus on: time, money, risk, opportunity.
Never use jargon.

Decision question: "[question]"
Area: [area]
Technical findings: [list of findings from knowledge base]

Return ONLY this JSON:
{
  "businessImpact": "2-3 sentence plain-language summary",
  "timelineRisk": "specific timeline implication e.g. '4-6 week delay if X not resolved'",
  "financialSignal": "estimated financial impact e.g. '~€120k savings if approved'",
  "recommendedAction": "single most important action for the decision maker right now",
  "stakeholders": ["role or person who should be informed"]
}
```

Show result in a 4-card grid:
- Business Impact (blue label)
- Timeline Risk (orange label, orange left border)
- Financial Signal (green label, green left border)
- Recommended Action (full width, blue background) — this is the key takeaway

Show stakeholders as a line of text below.
Badge at top: "AI Translation Layer" in a gradient pill.

Button: "View full decision brief →"

**Step 4b — Expert Routing (if no knowledge)**

Show a list of recommended experts for the category. Each expert card shows:
- Name, role, specialty
- Match percentage badge (green pill)
- Availability badge (orange pill)
- Select/deselect toggle button
- When selected: expandable textarea pre-filled with a specific question, editable

Sticky bottom bar: "{N} of {total} experts selected" + "Send tickets to N experts" button.

On send: create a Ticket in localStorage for each selected expert. Show confirmation with ticket details.

**Step 5 — Decision Brief (after translation)**

Show the full decision package:

**Decision Story Graph** (horizontal flow):
Experts → Technical Finding → Business Impact → Action → Recommendation

Five columns connected by arrows. Each column has a title and one or more node cards with color-coded left borders.

**Brief grid** (2-column):
- Final recommendation (full width, blue background): recommendation text + reason
- Business impact
- Risk (red label)
- Missing information (list of what's still needed)
- Recommended actions (green label, bullet list)
- Experts consulted (avatar circles with initials)

**Evidence traceability table**: Evidence | Source | Expert/Owner | Confidence

Buttons: "Export brief" (downloads .txt file) + "Show experts to contact"

**Export format** (plain text file):
```
Collaborative Insight — Decision Brief
Project: [name]
Decision type: [area]
Final recommendation: [recommendation]
Readiness Score: [score]%
Reason: ...
Business impact: ...
Risk: ...
Missing information: - item 1 ...
Recommended actions: - item 1 ...
Experts consulted: - name ...
Evidence: - finding | Source: ... | Owner: ... | Confidence: ...
```

---

## AI Integration (Gemini)

Use the `@google/generative-ai` package or the Gemini REST API directly.

**Two AI calls in the app:**

### 1. Knowledge Extraction (Expert view)
Model: `gemini-1.5-flash` or `gemini-2.0-flash`

System prompt: "You extract concise, decision-grade engineering knowledge from meeting transcripts, handwritten notes, and expert input. Always respond with a single JSON object. Be specific, neutral, and avoid speculation."

User prompt: Include the transcript text, any additional insights, and image (if uploaded, send as base64). Ask for:
```json
{
  "summary": "2-5 sentence summary",
  "keyPoints": ["point 1", "..."],
  "recommendedConfidence": "High confidence | Medium confidence | Low confidence",
  "sourceLabel": "Meeting transcript | Handwritten notes | Expert input"
}
```

### 2. Business Translation (PM view)
Model: `gemini-1.5-flash` or `gemini-2.0-flash`

System prompt: "You translate technical engineering findings into clear, concise business language for non-technical decision makers. Quantify impact. Never use jargon. Respond only with the requested JSON."

User prompt: Include the PM question, decision area, project name, and list of technical findings from the knowledge base. Return the 5-field JSON described above.

**JSON extraction helper** (both calls return JSON, strip markdown fences if present):
```ts
function extractJson(raw: string): unknown {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[{\[]/);
  const end = s.lastIndexOf(s[start] === "[" ? "]" : "}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  return JSON.parse(s.substring(start, end + 1));
}
```

---

## UI Design System

**Colors**:
- Primary blue: `#1746a2`
- Accent blue: `#0b63b6`
- Orange: `#ff8a00`
- Green: `#12b76a`
- Red: `#d92d20`
- Background: `#eef3f9` (with radial gradient accents)
- Card: `#ffffff`
- Border: `#d9e2ef`
- Muted text: `#667085`
- Dark text: `#182230`

**Typography**: Inter or system sans-serif. Bold weights for headings and labels.

**Card style**: white background, `1px solid #d9e2ef` border, `border-radius: 16–22px`, subtle box shadow.

**Buttons**: Gradient `#1746a2 → #0b63b6`, white text, bold, `border-radius: 14px`. Secondary: white bg, blue text, blue border.

**The app shell**: A centered card (`max-width: 1180px`) with a header containing the logo, app name, role tabs (Admin / Expert / PM), and sign-out button. The main content area fills the remaining height.

**Status pills**: Rounded pill badges. Open tickets: orange bg, orange text. Answered: green. Found: green. Missing: orange.

**Score circle**: CSS conic-gradient donut. `conic-gradient(#1746a2 0deg ${deg}deg, #e7eefb ${deg}deg)` with a white inner circle overlay.

**Decision story graph**: Horizontal flexbox with columns connected by `→` arrows. Color-coded left borders on nodes: blue for experts, cyan for finding, orange for impact, green for action, blue for recommendation.

---

## Responsive Design

On screens under 900px:
- Stack the split layout (form + sidebar) to single column
- Stack the two-column grid to single column
- Stack the composer meta row (project name, impact, attach) to single column
- Allow story graph to scroll horizontally or stack vertically

---

## Page Routes

```
/auth          — role picker (public)
/admin         — admin view (requires role = admin)
/expert        — expert view (requires role = expert)
/pm            — PM chat view (requires role = pm)
/              — redirects to correct view based on stored role, or to /auth
```

---

## Key UX Details

1. When the PM chat is empty (first load), show the 4 starter question chips and a status line: "N approved expert knowledge entries available" or "No expert knowledge yet — ask anyway and I'll route you to the right experts."

2. When expert answers a ticket, auto-create a knowledge entry so the PM's next question immediately benefits from it. Show a notice: "Sent. PMs asking about [area] now see your answer in the knowledge base."

3. After tickets are sent from PM view, show a banner at the top of the chat: "Expert ticket status — N of M responses received · N pending" with a "Re-run readiness with new answers" button.

4. The knowledge base sidebar on the Expert capture panel shows all entries in real time — labeled by area, expert name, source, and confidence.

5. The AI translation loading state should be visually interesting — a spinner with text "AI is translating technical findings to business language… Turning expert knowledge into a decision you can act on." Do not just show a plain loading text.

6. The expert ticket context box (orange left border) is the most important UX addition for the hackathon demo — it directly shows the expert WHY their input matters, what business decision depends on it, and who else is contributing. Make it prominent.

7. The Admin expertise coverage map should update in real time as experts contribute knowledge and answer tickets — pull live counts from localStorage.

---

## What the App Demonstrates to Judges

The three verbs from the hackathon track are: **Discover, Communicate, Use**.

- **Discover**: The expertise map shows who knows what. The PM chat identifies the right experts automatically when knowledge is missing.
- **Communicate**: Experts see full business context on their tickets. PMs see technical knowledge translated to plain language.
- **Use**: The Decision Brief gives PMs a structured, exportable artifact they can act on and share. Every decision is preserved for future reuse.

The most impressive demo sequence:
1. Expert captures knowledge from a transcript (AI extraction visible)
2. PM asks a question → Language Bridge → knowledge found → readiness score
3. PM clicks translate → spinner → AI generates live business translation
4. PM clicks brief → full decision story + exportable artifact
5. Switch to Admin → expertise coverage map shows live stats

---

## Sample Transcript for Demo

Paste this in the Expert view to generate knowledge for "Supplier approval":

```
Meeting: Supplier B Qualification Review
Date: June 2024
Attendees: Dr. Lukas Müller (Reliability), Anna Weber (Supplier Qualification)

Lukas: We completed thermal cycling for Supplier B components last week.
1000 cycles tested, 94% pass rate, within the acceptable threshold for this product class.
Lifetime stress tests also within spec — no degradation anomalies detected.

Anna: Supplier B's quality management system audit passed in April.
On-time delivery rate is 96% over the past 12 months. Single-source risk exists
until Supplier C qualification completes in Q4.

Decision: Conditional approval recommended. Final sign-off pending
one remaining reliability test result expected by end of month.
```

This will generate a High confidence knowledge entry that makes the PM translation demo work immediately.
