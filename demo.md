# Demo Script — Collaborative Insight

Estimated demo time: **5–7 minutes**
Best format: two browser tabs open side by side — Expert (left) and PM (right)

---

## Before You Present — One-Time Setup

Do this 2 minutes before the demo starts so the knowledge base is pre-loaded.

**Tab 1**: Open the app, pick **Expert**
**Tab 2**: Open the app in a new tab, pick **Project Manager**

In Tab 1 (Expert), do the following:

1. Knowledge area: **Supplier approval**
2. Paste the transcript below into the transcript field
3. Click **Generate knowledge with AI** → wait for draft
4. Click **Add to knowledge base**

**Pre-load transcript (Supplier approval):**
```
Meeting: Supplier B Qualification Review — June 2024
Attendees: Dr. Lukas Müller (Reliability), Anna Weber (Supplier Qualification)

Lukas: We completed thermal cycling for Supplier B last week. 1000 cycles tested,
94% pass rate — within the acceptable threshold for this product class.
Lifetime stress tests also within spec. No degradation anomalies detected.
One remaining test is outstanding: high-temperature operating life (HTOL).
Expected completion end of month.

Anna: Supplier B's quality management audit passed in April. On-time delivery
rate is 96% over the past 12 months. Approved for pilot volumes. Full production
release should wait until the final HTOL result is confirmed.

Decision: Conditional approval recommended for pilot. Full production pending
final reliability sign-off.
```

Now in Tab 1, also add a second entry:
1. Knowledge area: **Supplier approval**
2. Paste this in **Additional expert insights** (not transcript):
```
Supply chain view: Supplier B lead time is 6 weeks. We have 8 weeks of buffer stock
for Power Module X. Single-source risk exists until Supplier C qualifies in Q4.
Recommend approving for pilot now to avoid production gaps.
```
3. Click **Generate knowledge with AI** → Add to knowledge base

The PM tab now has 2 knowledge entries for Supplier approval. The readiness score will be strong and the AI translation will have real content to work with.

---

## Demo Flow

### Scene 1: The Expert Captures Knowledge (30 seconds)

*Say: "An expert just finished a technical review meeting. Instead of writing a long report nobody reads, they paste the transcript here."*

**In Expert tab → Capture knowledge:**
- Show the knowledge area dropdown
- Show the transcript textarea already filled (from setup)
- Show the AI draft result already there
- Point out: "AI extracts the key findings, assigns a confidence level, and it's immediately available to anyone in the project."

---

### Scene 2: The PM Asks a Decision Question (60 seconds)

*Say: "Now switch to the Project Manager. They don't know about HTOL testing or thermal cycling. They just need to know: can we go ahead?"*

**In PM tab:**
Click the starter chip or type:
> **Can we approve Supplier B for Power Module X?**

**What happens:**
- Green chip: "Existing expert knowledge found"
- Language Bridge appears — show both columns
  - *Say: "Notice how the same decision is shown in two languages — business and technical. The PM sees their version, the expert sees theirs."*
- Click **Check expert knowledge base**
- Evidence table appears with both entries
  - *Say: "Two experts contributed. The system found it instantly."*
- Click **Calculate readiness**
- Score appears (~76%)
  - *Say: "76% ready. The breakdown explains exactly why — two experts, recent knowledge, but the HTOL test result is still missing."*

---

### Scene 3: The AI Translation — The Core Feature (90 seconds)

*Say: "This is the moment that matters. Watch what happens when we translate these technical findings for the decision maker."*

**Click: "Translate findings to business language →"**

- Spinner appears — *say: "Gemini is reading the expert findings and rewriting them for a business audience."*
- 4-card grid appears:
  - Point to **Business Impact**: *"Plain language. No jargon."*
  - Point to **Timeline Risk**: *"Quantified. They know exactly what's at stake."*
  - Point to **Financial Signal**: *"Ballpark numbers. Enough to make a call."*
  - Point to **Recommended Action** (full width): *"One sentence. This is what the PM needs."*

*Say: "The expert wrote about HTOL tests and thermal cycling. The PM sees delivery risk, cost exposure, and a clear next step. Same knowledge — different language."*

**Click: "View full decision brief →"**

- Show the Decision Story graph: Expert → Finding → Impact → Action → Recommendation
  - *Say: "Every step is traceable. You can always see where the recommendation came from."*
- Show the brief grid — point to Risk and Missing Information cards
- Click **Export brief**
  - *Say: "This goes to the meeting, the email, the approval ticket. The decision is documented."*

---

### Scene 4: What Happens When Knowledge Is Missing (60 seconds)

*Say: "Now let's say they ask about something the system doesn't know yet."*

**In PM tab, type:**
> **Can we change the packaging material on Product X?**

- Orange chip: "Knowledge gap found"
- Language Bridge shown
- Click **Check expert knowledge base** → shows "No approved expert knowledge found"
- Click **Calculate readiness** → low score (~36%)
  - Point to breakdown: *"Evidence: zero. No expert has contributed for this area yet."*
- Click **Show experts and prepare tickets**
  - *Say: "The system identifies which experts are relevant and why."*
- Show expert cards with match percentages and availability
- Select all experts, click **Send tickets**
  - *Say: "Each expert gets a ticket in their inbox — with the business context already included."*

---

### Scene 5: The Expert Side of Collaboration (60 seconds)

**Switch to Expert tab → My tickets tab**

- Show the badge (open count)
- Open a ticket card — point to the orange **"Why your input matters"** box
  - *Say: "The expert sees the business decision this is part of, the financial impact, and who else is contributing. They know exactly what kind of answer is useful — not just 'answer my question'."*

**Paste this as the expert answer for the material change ticket:**
```
The new packaging material has not completed long-term reliability testing.
We need minimum 500-hour humidity exposure and a thermal shock study before
we can approve it. Estimated test duration: 4 weeks. If we skip this,
we risk field failures in high-humidity environments — which covers 3 of our
top 5 customer regions. I recommend not changing until tests complete,
unless the cost savings justify the warranty risk.
```

- Click **Send answer & save to knowledge base**
  - *Say: "That answer is now in the knowledge base. Any future PM asking about material changes gets this expert's knowledge — without needing to find them."*

**Switch back to PM tab** — show the ticket status banner at the top of chat.
- Click **Re-run readiness with new answers**
  - Score jumps — *say: "The readiness score updated instantly. The decision moved forward."*

---

### Scene 6: Admin — Who Knows What (30 seconds)

*Say: "Finally, the Admin view gives the organisation visibility into their own expertise."*

**Switch to `/auth`, pick Admin → scroll to Expertise Coverage Map**

- *Say: "Every expert, their domains, and how active they are. When a new decision comes in, you know exactly who to bring in — and you can see who's already contributing."*
- Point to the live contribution and ticket counts

---

## Closing Line

> "Most organisations don't have a knowledge problem. They have a discovery problem, a communication problem, and a reuse problem. Collaborative Insight solves all three — expertise found, translated, and preserved."

---

## Ready-to-Paste Expert Answers

Use these when answering tickets live in the demo if you don't want to type freehand.

### Supplier approval — Reliability (Dr. Lukas Müller)
```
Thermal cycling complete: 94% pass rate across 1000 cycles, within spec.
HTOL test outstanding — results expected end of month. Lifetime stress within limits.
No anomalies detected. My recommendation: conditional approval for pilot.
Full production release should wait for final HTOL confirmation.
```

### Supplier approval — Supply Chain (Markus Klein)
```
Lead time is 6 weeks. Current buffer stock covers 8 weeks of production.
Single-source risk until Supplier C qualifies (Q4 target). For pilot volumes,
risk is manageable. For full production ramp, recommend staggered release
tied to Supplier C readiness to avoid single-source dependency.
```

### Manufacturing defect — Quality (Thomas Richter)
```
Defect rate increased from 0.8% to 2.3% following the Line 3 parameter change
on June 3rd. Two customer-facing parts affected — both in Tier 1 category.
Quality gate impact: medium severity. No escapes to customers confirmed yet
but risk is elevated. Recommend reverting the parameter change or running
parallel line until root cause is confirmed by manufacturing.
```

### Manufacturing defect — Manufacturing (Maria Hoffmann)
```
Process parameter review complete. The cycle time reduction implemented June 3rd
changed the reflow temperature profile by 4°C. Correlation with defect increase
is 91% confidence based on MES data. Reverting the profile is low risk and
can be done in 2 hours. Recommend immediate revert and a controlled re-test
before re-introducing the cycle time optimization.
```

### Pilot batch shipment — Quality (Thomas Richter)
```
Quality gate review complete for the pilot batch. 2 of 3 checkpoints passed.
Final checkpoint — outgoing inspection sign-off — pending sign-off from
customer-appointed QA representative. Expected by Thursday EOD.
Do not ship before confirmation. Risk of contractual non-compliance if we ship
without formal customer QA sign-off.
```

### Packaging material change — PLM (Nina Brandt)
```
Change request PLM-2024-0847 has been submitted but not yet approved.
Formal material change requires sign-off from 3 stakeholders: Reliability,
Manufacturing, and Customer Quality. Current status: 1 of 3 signed.
Do not proceed with material change until PLM approval is complete.
Estimated approval cycle: 2–3 weeks if reviews are prioritised.
```

### New testing process — Test Engineering (Dr. Eva Schneider)
```
New test process validation is 60% complete. Repeatability study passed —
Cpk of 1.45, above the 1.33 minimum. Coverage analysis shows 94% of
failure modes captured vs 91% with current process. Outstanding items:
measurement system analysis (MSA) and formal PLM change document.
Cannot recommend full release until MSA is done — estimated 1 week.
Pilot use on non-critical products is acceptable in the interim.
```

---

## Questions Judges Might Ask — And Answers

**"How is this different from a shared document or wiki?"**
> A wiki stores documents. This structures knowledge by decision type, scores completeness, routes questions to the right expert automatically, and translates technical input to business language in real time. Documents require someone to read and interpret — this gives you a ready answer.

**"What happens when the AI translation is wrong?"**
> The expert's original technical finding is always shown in the evidence table — fully traceable. The AI translation is a starting point, not the final word. Decision makers see both, and the brief is exportable for review. The expert, not the AI, remains the source of truth.

**"Can this work in industries other than automotive/semiconductors?"**
> Yes — the category system is configurable by the Admin. Any domain with technical experts and non-technical decision makers benefits: pharma regulatory decisions, construction compliance, financial risk assessment. The AI translation layer is domain-agnostic.

**"How does the knowledge not go stale?"**
> The readiness score includes a recency dimension — knowledge older than 90 days scores lower and the system flags it explicitly. The PM sees "Knowledge is older than 90 days — consider refreshing" in the breakdown, which prompts a new expert ticket.

**"What about privacy — can anyone see all expert knowledge?"**
> In this demo, yes — it's a shared workspace. In production, knowledge visibility would be scoped to projects, and experts would have control over what is published vs kept as a draft. The approval step (expert reviews AI draft before publishing) is already in the current flow.

---

## Timing Guide for a 5-Minute Pitch Slot

| Section | Time |
|---|---|
| Problem statement (1 slide or verbal) | 45s |
| Scene 1: Expert captures knowledge | 30s |
| Scene 2: PM asks question + Language Bridge | 45s |
| Scene 3: AI Translation (this is the WOW moment — slow down) | 90s |
| Scene 4: Knowledge gap + ticket routing | 45s |
| Scene 5: Expert answers with context | 30s |
| Scene 6: Admin expertise map | 20s |
| Closing line | 15s |
| **Total** | **~5:30** |

If time is short, cut Scene 4 and 5 — the translation demo (Scene 3) is the most important moment.
