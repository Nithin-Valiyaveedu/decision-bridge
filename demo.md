# Demo & QA Script — Collaborative Insight

This document is written for a QA tester. Follow every step in order. For each step, the **Expected result** tells you what should happen. If it does not match, note the step number and describe what you saw instead.

---

## Part 0 — Setup (do this before testing anything)

### 0.1 — Start the app

```bash
bun run dev
```

Open **http://localhost:3000** in a browser.

**Expected:** A role selector page with three options — Admin, Expert, Project Manager.

---

### 0.2 — Get a Gmail OAuth token

1. Open [https://developers.google.com/oauthplayground](https://developers.google.com/oauthplayground) in a new tab
2. In the left panel, scroll to **Gmail API v1** → tick `https://www.googleapis.com/auth/gmail.readonly`
3. Click **Authorize APIs** → sign in with your Gmail account
4. Click **Exchange authorization code for tokens**
5. Copy the value shown in **Access token** (starts with `ya29.`)
6. Keep this tab open — you will need the token in step 2.3

---

### 0.3 — Send yourself a test email

Send the following email **to your own Gmail address** (from any account):

> **Subject:** Re: Supplier B — Reliability validation update
>
> Hi Lukas, confirming that the final thermal cycling results for Supplier B are complete. All 200 units passed the 1000-cycle AEC-Q100 test with zero failures. Lifetime stress projection shows ≥15 year MTTF at nominal operating conditions. HTOL test outstanding — results expected end of month, will not block pilot. I am clearing the reliability gate and recommending conditional approval for pilot production.

Wait 1–2 minutes for the email to arrive before proceeding.

---

## Part 1 — Admin role

### 1.1 — Select Admin role

On the home page, click **Admin**.

**Expected:** Admin panel opens. You see three sections: "Onboard a project", "Active projects", "Expertise coverage map".

---

### 1.2 — Set demo email override

1. Scroll to the **Select employees to onboard** section
2. Find **Dr. Lukas Müller · Reliability Expert**
3. On the right side of that row, click the grey email badge showing `lukas.mueller@infineon.com`
4. An inline input appears — type your Gmail address (the one you used in step 0.3)
5. Click **Save**

**Expected:** The badge turns amber/orange and shows ⚡ followed by your email address.

> **Report if:** Badge does not turn amber, or your email is not shown, or clicking Save has no effect.

---

### 1.3 — Create a project

Fill in the form at the top:

| Field | Value |
|---|---|
| Project name | `Power Module X` |
| Business unit | `Automotive Power Semiconductors` |
| Project manager | `Sarah Klein` |

Under **Decision areas for this project**, make sure these three are ticked:
- ✅ Supplier approval
- ✅ Manufacturing defect
- ✅ Pilot batch shipment

Under **Select employees to onboard**, tick:
- ✅ Dr. Lukas Müller
- ✅ Anna Weber
- ✅ Markus Klein
- ✅ Thomas Richter
- ✅ Maria Hoffmann

Click **Create project**.

**Expected:** A notice appears: *"Project 'Power Module X' created with 5 member(s)."* A project card appears in the **Active projects** section below showing the project name, business unit, PM, member count, and decision areas.

> **Report if:** No notice appears, no project card appears, or the project card is missing fields.

---

### 1.4 — Expertise coverage map

Scroll to the **Expertise coverage map** section at the bottom.

**Expected:** Six expert cards are shown, each with a name, role, domain tags, and three stats (contributions, open tickets, answered). All stats show 0 at this point.

---

## Part 2 — Expert role: Connections

Click **Switch role** in the top-right corner and select **Expert**.

### 2.1 — Expert identity selector

At the top of the Expert view, there is a **Signed in as** dropdown.

Select: **Dr. Lukas Müller · Reliability Expert**

**Expected:** The dropdown shows Dr. Lukas Müller selected. Three tabs are visible: Capture knowledge, My tickets, Connections.

---

### 2.2 — Open the Connections tab

Click the **Connections** tab.

**Expected:** A panel opens showing six connector cards (Gmail, Jira, Slack, Microsoft Teams, Zoom, Google Meet) and below them an LLM configuration section with four options.

---

### 2.3 — Connect Gmail

On the **Gmail** card:

1. The **MCP endpoint** field is pre-filled with `https://gmailmcp.googleapis.com/mcp/v1` — leave it as-is
2. In the **OAuth token** field, paste the token you copied in step 0.2
3. Click **Connect**

**Expected:** The Gmail card turns green-bordered, shows a green status dot, and the endpoint URL is shown. The Connect button changes to **Disconnect**.

> **Report if:** Card does not turn green, or the button does not change to Disconnect.

---

### 2.4 — LLM configuration

Scroll down to the **AI / LLM configuration** section.

Click the **Internal LLM** card.

**Expected:** The card becomes highlighted with a green border. An **Endpoint URL** field and a **Save** button appear inside the card. A note at the bottom appears saying the prototype still uses Gemini server-side.

Click **Google Gemini** to switch back.

**Expected:** The Gemini card is highlighted again. The note disappears.

---

## Part 3 — Expert role: Capture knowledge

Click the **Capture knowledge** tab.

### 3.1 — Panel overview

**Expected:** The panel shows:
- A form row at the top with Project, Knowledge area, and Confidence dropdowns
- A grid of connector cards below: Jira, Slack, Gmail, Meeting transcript
- An "Auto-captured" section (empty for now) at the bottom

---

### 3.2 — Select project and area

1. Set **Project** to `Power Module X`
2. Set **Knowledge area** to `Supplier approval`
3. Set **Confidence** to `High confidence`

---

### 3.3 — Extract from Gmail (live API call)

On the **Gmail** connector card:

1. Confirm the card shows your Gmail address in green (● yourname@gmail.com)
2. Click **Search emails about "Supplier approval"**

**Expected:** The button shows "Searching Gmail…" for a few seconds. Then a list of emails appears below the button. You should see at least one email — the one you sent yourself in step 0.3 — showing subject, sender, date, and a snippet.

> **Report if:** An error appears instead, or no emails are found. Copy the exact error message.

3. Click **Extract knowledge** on the email from step 0.3

**Expected:** The button shows "Extracting…" for a few seconds. Then a draft panel appears on the right side showing:
- A summary paragraph
- Key points as a bullet list
- A recommended confidence level
- A source label showing `Gmail · "Re: Supplier B — Reliability validation update" · ...`

> **Report if:** No draft appears, or the draft panel is empty, or an error is shown.

4. Click **Save to knowledge base**

**Expected:** A green notice appears: *"Knowledge captured and added to the base."* The draft disappears. The "Auto-captured" section at the bottom now shows one entry tagged with a Gmail source.

---

### 3.4 — Extract from Jira (simulated — Lukas, approve stance)

On the **Jira** connector card:

1. Click the **edit** button on the card
2. The textarea expands showing a pre-filled Jira ticket about Supplier B — read it. It recommends **conditional approval**.
3. Click **Extract from Jira**

**Expected:** The button shows "Simulating…" then a draft appears with findings from the Jira ticket. Source label shows `Jira · PMX-2847`.

4. Click **Save to knowledge base**

**Expected:** Second entry appears in the Auto-captured section.

---

### 3.5 — Extract from Slack (simulated)

On the **Slack** connector card:

1. Click **edit** — shows a pre-filled Slack thread with team members recommending approval
2. Click **Extract from Slack**
3. Draft appears — click **Save to knowledge base**

**Expected:** Third entry appears in Auto-captured.

---

### 3.6 — Extract from meeting transcript

On the **Meeting transcript** card:

1. The dropdown shows **Microsoft Teams** by default
2. Notice the green dot and **Transcript ready** label — the transcript is pre-loaded
3. Click **Extract from Teams**

**Expected:** Draft appears with findings from a Teams meeting transcript. Source label shows `Teams meeting · Power Module X`.

4. Save to knowledge base.

---

### 3.7 — Inject a conflicting expert view (Thomas Richter — concern stance)

This step seeds a blocking concern from the quality side to trigger conflict detection in the PM brief.

1. Change the **Signed in as** dropdown to **Thomas Richter · Quality Expert**
2. Confirm **Project** is still `Power Module X` and **Knowledge area** is still `Supplier approval`
3. Set **Confidence** to `High confidence`

On the **Jira** connector card:

4. Click the **edit** button — the pre-filled textarea appears
5. **Select all text in the textarea and replace it** with the following exactly:

```
CONCERN — PMX-2849: Supplier B Quality Gate Review
Reporter: Thomas Richter | Project: Power Module X

HTOL (High Temperature Operating Life) test still outstanding with no confirmed completion date. Customer-facing quality gate requires full HTOL results before production ramp. Reliability data is not ready and not complete — HTOL is pending with no confirmed end date.

Recommendation: Hold production ramp until HTOL results are confirmed. This is a blocking concern from a quality perspective.
```

6. Click **Extract from Jira**

**Expected:** Draft appears summarising the quality concern and HTOL blocker. Source label shows `Jira · PMX-2849` or similar.

7. Click **Save to knowledge base**

**Expected:** A new entry appears in Auto-captured under Thomas Richter's name, area "Supplier approval", concern tone.

> **Why this matters:** You now have two experts in the same decision area with opposing positions — Lukas's entries say "approve / conditional approval", Thomas's entry says "outstanding / not ready / blocking concern". The conflict detector will pick this up when the PM asks about Supplier B.

---

## Part 4 — PM role: Ask a question

Navigate to **Project Manager** role.

### 4.1 — PM view overview

**Expected:** PM view opens showing a question input at the bottom and two tabs at the top: **Ask a question** and **Decision log**.

---

### 4.2 — Question 1: Supplier B with conflicting knowledge

In the message input at the bottom, type exactly:

> Can we approve Supplier B for Power Module X?

Press Enter or click Send.

**Expected (in order):**

1. Your question appears as a chat bubble on the right
2. A green chip appears: *"Existing expert knowledge found"*
3. A **Language Bridge** card appears with two columns — a business-language version and a technical version of the same question
4. Three action buttons appear: **Check expert knowledge base**, **Calculate readiness**, **Translate findings**

---

### 4.3 — Check knowledge base

Click **Check expert knowledge base**.

**Expected:** An evidence table expands showing multiple rows — one for each knowledge entry captured in Part 3. Each row shows the expert name, area, confidence level, and the source. Confirm:
- Lukas's Gmail entry shows source `Gmail · "Re: Supplier B…"`
- Thomas Richter's entry is also present with source `Jira · PMX-2849`

> **Report if:** The table is empty, entries are missing, or Thomas's entry is absent.

---

### 4.4 — Calculate readiness

Click **Calculate readiness**.

**Expected:** A score appears — likely in the **50–70% range** (lower than it would be without the conflict). Below it, three breakdown rows:
- **Evidence depth** — value based on number and confidence of entries
- **Expert agreement** — shows a ⚠ warning: *"Conflict detected between 1 expert pair — agreement score reduced"*
- **Knowledge recency** — recent, full value

> **Note:** The agreement score is reduced because Lukas and Thomas have opposing stances on the same area. This directly lowers the final readiness score, signalling to the PM that expert consensus is missing.

> **Report if:** Agreement row shows no warning, or score appears above 85%.

---

### 4.5 — AI translation

Click **Translate findings to business language →**

**Expected:** A spinner appears briefly. Then four cards appear:
- **Business Impact** — one paragraph in plain language
- **Timeline Risk** — timeline implications (likely mentions HTOL delay)
- **Financial Signal** — cost/revenue reference
- **Recommended Action** — a single clear sentence (full-width card)

> **Report if:** Spinner runs indefinitely (more than 30 seconds), or cards appear empty, or an error is shown.

---

### 4.6 — Full decision brief with conflict banner

Click **View full decision brief →**

**Expected:** A new section expands below showing:

1. **⚠ Expert conflict detected** — an amber banner at the top of the brief (above the Decision Story)
   - It shows the two conflicting experts side-by-side
   - Left card (green): Dr. Lukas Müller — "✓ Supports" with a snippet of his finding
   - Right card (red): Thomas Richter — "✗ Against" with a snippet of his concern
   - A note reads: *"Resolution recommended before deciding"*
2. The **Decision Story** flow below the banner
3. The **brief grid** with Risk, Missing information, Recommendation, and Experts consulted cards
4. An **Evidence traceability** table

> **This is the key demo moment:** Judges can see that the system doesn't blindly aggregate all expert input — it detects when experts disagree and surfaces that disagreement transparently in the brief.

> **Report if:** Amber banner does not appear, or only one expert is shown, or the stances are both the same.

Click **Export PDF**.

**Expected:** A new browser tab or print dialog opens showing a cleanly formatted decision brief — including the conflict section with side-by-side cards. The browser's print dialog appears (or you can Save as PDF). Close that tab/dialog when done.

> **Report if:** No tab opens, a pop-up blocker message appears, or the PDF content is empty.

---

### 4.7 — Decision log with conflict event

Click the **Decision log** tab at the top.

**Expected:** A vertical timeline appears showing all events in chronological order:
- Green dots: knowledge entries (Gmail, Jira × 2, Slack, Teams)
- **Red dot: ⚠ Conflict detected** — shows Thomas Richter "✗ Against" vs Dr. Lukas Müller "✓ Supports" inline
- Stats row at the top showing knowledge entries, tickets answered, and a **red conflict counter** (e.g. "1 conflict detected")

> **Report if:** No red dot appears, or conflict counter is missing from the stats row.

---

### 4.8 — Question 2: Knowledge gap

Click the **Ask a question** tab. Type:

> Can we change the packaging material on Product X?

Press Enter.

**Expected:**
1. An orange chip appears: *"Knowledge gap found"*
2. Language Bridge appears for this new area
3. Same three action buttons appear

Click **Check expert knowledge base**.

**Expected:** A message appears saying no approved expert knowledge exists for this area.

Click **Calculate readiness**.

**Expected:** Score is low — between 20–40%. Evidence row shows 0.

---

### 4.9 — Send expert tickets

Click **Show experts and prepare tickets**.

**Expected:** A list of expert cards appears, each with a name, role, match percentage (e.g. 90%), and availability. A **Select all** option and a **Send tickets** button are visible.

Click **Select all**, then click **Send tickets**.

**Expected:**
- A compact confirmation message appears: *"Tickets sent to X experts"*
- The ticket form collapses — it does NOT stay active or reappear

---

## Part 5 — Expert role: Answer tickets

Switch back to the **Expert** role. Select **Dr. Lukas Müller · Reliability Expert**.

### 5.1 — My tickets tab

Click the **My tickets** tab.

**Expected:** A badge shows the number of open tickets. A list of open ticket cards is visible, each showing the title, the PM's question, and a "Why your input matters" context box with the business decision and financial stakes.

---

### 5.2 — Answer a ticket

Open the first ticket card. In the answer textarea, paste:

```
The new packaging material has not completed long-term reliability testing.
We need minimum 500-hour humidity exposure and a thermal shock study before
approving it. Estimated test duration: 4 weeks. I recommend not changing until
tests are complete — field failures in high-humidity environments would affect
3 of our top 5 customer regions.
```

Notice the **confidence dropdown** next to the Send button — it defaults to **Medium confidence**. Leave it as Medium (this is appropriate — detailed findings but tests not yet run).

Click **Send answer & save to knowledge base**.

**Expected:**
- A green notice appears confirming the answer was saved
- The ticket moves from Open to Answered
- The open ticket badge count decreases by 1

---

### 5.3 — Re-run readiness after expert answer

Switch back to the **Project Manager** role.

**Expected:** A banner at the top of the chat shows: *"1 of 1 response received"* and a button: **Re-run readiness with new answers**.

Click **Re-run readiness with new answers**.

**Expected:** The question re-runs against the now-updated knowledge base and returns a new (higher) readiness score for the packaging material question.

---

### 5.4 — Verify knowledge base updated

Switch back to Expert role → Dr. Lukas Müller → **Capture knowledge** tab.

Scroll to the **Auto-captured** section at the bottom.

**Expected:** A new entry appears sourced from *"Expert ticket reply"* with the area "Material change" and confidence "Medium".

---

## Part 6 — Connections: Architecture story

Still in the Expert role. Click the **Connections** tab.

### 6.1 — Review all connectors

**Expected:** All six connector cards are visible. Gmail shows as connected (green). The others show their MCP endpoint fields pre-filled with official server URLs.

Hover over or read the hint text on the Jira card.

**Expected:** Hint text reads something like *"Official Atlassian MCP server — deploy internally for data residency"*.

---

### 6.2 — LLM residency options

Scroll to the **AI / LLM configuration** section.

Confirm all four cards are visible:
- **Google Gemini** — marked Cloud, orange residency label "Data sent to Google servers"
- **Internal LLM** — marked On-premise, green label "Data stays within your network"
- **Azure OpenAI** — marked Private cloud, green label
- **AWS Bedrock** — marked Private cloud, green label

Click **Internal LLM**.

**Expected:** Card highlights green. Endpoint URL field appears. Note at bottom appears.

---

## Part 7 — Edge cases to verify

### 7.1 — Gmail not connected

1. Go to Connections tab → click **Disconnect** on the Gmail card
2. Go to Capture knowledge tab
3. On the Gmail card, confirm it shows *"Not connected — add token in Connections tab"* in red
4. Click **Search emails about "Supplier approval"**

**Expected:** An error message appears directly on the card: *"Connect Gmail first — go to the Connections tab and add your OAuth token."* No spinner, no crash.

---

### 7.2 — Switching expert identity

On the Expert role, change the **Signed in as** dropdown to **Anna Weber · Supplier Qualification Expert**.

Go to **My tickets** tab.

**Expected:** Ticket count and list change to show Anna Weber's tickets only (from the material change tickets sent in step 4.9).

---

### 7.3 — Conflict confidence selector

In the Expert role as Thomas Richter, go to **My tickets** tab. If a ticket is open:

1. Type a short, vague answer: `Yes it should be fine.`
2. Notice the confidence dropdown — it defaults to **Medium confidence**
3. Change it to **High confidence**
4. Send the answer

Switch to PM role, re-run the question for that area.

**Expected:** A "High confidence" vague answer scores higher than a "Medium confidence" vague answer (18 pts vs 12 pts for evidence). This demonstrates that confidence controls scoring weight.

---

### 7.4 — Empty state — no projects

Open a fresh browser (incognito window) and navigate to the app.

Select **Expert** → **Capture knowledge** tab.

**Expected:** The Project dropdown shows *"— No project selected —"*. The knowledge area dropdown still works. The connector cards are still visible and usable.

---

## What to Report

For each issue found, note:

1. **Step number** (e.g. Step 3.7)
2. **What you did** (exact action)
3. **What you expected** (from the Expected line above)
4. **What actually happened** (exact error text, or describe the UI state)
5. **Browser and OS**

---

## Timing reference for demo presentation

| Section | Steps | Time |
|---|---|---|
| Admin setup + email mapping | 1.1–1.4 | 45s |
| Gmail live extraction | 3.2–3.3 | 90s |
| Conflict injection (Thomas Richter) | 3.7 | 45s |
| PM question + Language Bridge | 4.2–4.4 | 60s |
| AI translation + conflict brief | 4.5–4.6 | 90s |
| PDF export | 4.6 | 15s |
| Decision log with conflict event | 4.7 | 30s |
| Knowledge gap + tickets | 4.8–4.9 | 45s |
| Expert answers ticket | 5.1–5.3 | 45s |
| Connections architecture story | 6.1–6.2 | 45s |
| **Total** | | **~8 min** |

**For a 5-minute slot:** Run 1.2, 3.3, 3.7, 4.2–4.6, 4.7 (conflict log only). Skip Jira/Slack/Meeting capture, ticket flow, and Connections.

**Key narrative arc for judges:**
1. Expert captures "approve" findings from Gmail (live data)
2. A second expert raises a blocking concern — system detects the conflict automatically
3. PM sees the conflict surfaced in the brief, not buried in raw data
4. Readiness score is visibly reduced by the disagreement
5. Export PDF shows the conflict in a structured, auditable format
