# DecisionBridge — Decision Readiness Scoring Algorithm

## Overview

Every time a PM asks a decision question, DecisionBridge calculates a **Decision Readiness Score** out of 100. The score is a composite of three sub-scores that answer three questions:

| Sub-score | Max | Question |
|---|---|---|
| Evidence Depth | 40 | How much approved expert knowledge exists for this topic? |
| Expert Agreement | 30 | Do the experts agree, or are there conflicts? |
| Knowledge Recency | 30 | How fresh is the knowledge? |

```
Total Score = Evidence Depth + Expert Agreement + Knowledge Recency
            = max 100
```

---

## Step 1 — Find Matching Knowledge

Before scoring, the system identifies which knowledge base entries are relevant to the question.

- **Primary path:** The AI classifier (`extractKnowledge`) returns a list of specific KB entry IDs that match the question semantically.
- **Fallback path:** If the AI classifier returns no matches, a keyword matcher maps the question to one of five hardcoded decision areas (`supplier`, `defect`, `pilot`, `material`, `testing`) and returns all KB entries in that area.

All scoring is done against this **matched subset** only — not the entire knowledge base.

---

## Sub-score 1 — Evidence Depth (max 40)

Measures how much validated expert knowledge supports the decision.

Each matching KB entry contributes points based on its **confidence level**, set by the expert when they submitted it:

| Confidence level | Points |
|---|---|
| High (starts with "High") | 18 |
| Medium (starts with "Medium") | 12 |
| Low / anything else | 6 |

```
Evidence = min(40,  Σ confidencePoints(entry)  for each matching entry)
```

**Examples:**
- 0 matching entries → 0/40
- 1 High entry → 18/40
- 2 High entries → 36/40
- 3 High entries → capped at 40/40
- 1 High + 1 Medium → 30/40

> **What's hardcoded:** The point values (18/12/6) and the cap (40) are fixed constants in `decisionbridge-views.tsx:127–129`.

---

## Sub-score 2 — Expert Agreement (max 30)

Measures whether the contributing experts agree with each other.

### Base agreement

Counts the number of distinct experts who have entries in the matched set:

```
rawAgreement = min(30,  uniqueExperts × 18)
```

So one expert gives 18/30, two give 30/30 (capped).

### Conflict detection

A **conflict** is detected between two experts when:

1. Their combined KB text leans toward opposite stances (one "approve", one "reject").
2. Stance is determined by keyword counting:
   - **Approve keywords:** `approve`, `approved`, `pass`, `passed`, `clear`, `cleared`, `recommend`, `proceed`, `ready`, `completed`, `complete`, `no failure`, `zero failure`, `successful`, `all units`, `no issues`, `conditional approval`
   - **Reject keywords:** `reject`, `fail`, `failed`, `outstanding`, `not complete`, `not ready`, `delay`, `block`, `concern`, `risky`, `pending`, `hold`, `not approved`, `need more`, `requires additional`, `unable`, `incomplete`, `not yet`
3. The expert whose approve-keyword count > reject-keyword count is classified as "approve"; the reverse is "reject". If tied, they are "neutral" (no conflict raised).

Each detected conflict **deducts 12 points** from the raw agreement:

```
agreement = max(0,  rawAgreement − (conflictCount × 12))
```

**Examples:**
- 2 experts, no conflict → 30/30
- 2 experts, 1 conflict → 30 − 12 = 18/30
- 2 experts, 2 conflicts → 30 − 24 = 6/30
- 1 expert → 18/30 (no conflicts possible with one expert)

> **What's hardcoded:** The per-expert base (18), the cap (30), and the per-conflict penalty (12) are fixed in `decisionbridge-views.tsx:131–134`.

---

## Sub-score 3 — Knowledge Recency (max 30)

Measures how fresh the most recently added matching KB entry is. Uses the `createdAt` timestamp (Unix ms) of the newest matching entry.

| Age of newest entry | Points |
|---|---|
| Less than 30 days | 30 |
| 30–90 days | 20 |
| Older than 90 days | 10 |
| No matching entries | 0 |

```
recency = 0 if no entries, else:
          30  if daysOld < 30
          20  if daysOld < 90
          10  otherwise
```

Only the **newest** entry's age matters — older entries in the matched set are ignored for recency.

> **What's hardcoded:** The thresholds (30 days, 90 days) and the point buckets (30/20/10) are fixed in `decisionbridge-views.tsx:135–138`.

---

## Worked Example

**Question:** "Can Supplier B be approved?"

Matched KB entries (from `localStorage` / backend):

| Entry | Expert | Confidence | Text snippet |
|---|---|---|---|
| 1 | Dr. Müller | High | "Thermal cycling passed, no failure observed…" |
| 2 | Anna Weber | Medium | "Supplier approved for pilot, conditional approval pending final…" |
| 3 | T. Richter | High | "Reliability concern — not ready for full release…" |

**Evidence Depth:**
- Müller High = 18, Weber Medium = 12, Richter High = 18 → total 48 → capped at **40**

**Expert Agreement:**
- 3 unique experts → rawAgreement = min(30, 3×18) = **30**
- Müller stance: approve keywords "passed", "no failure" (2) vs reject (0) → "approve"
- Weber stance: approve keywords "approved", "conditional approval" (2) vs reject (0) → "approve"
- Richter stance: approve (0) vs reject keywords "concern", "not ready" (2) → "reject"
- Conflicts: Müller vs Richter = 1, Weber vs Richter = 1 → **2 conflicts**
- agreement = 30 − (2 × 12) = **6/30**

**Knowledge Recency:**
- Newest entry added 15 days ago → **30/30**

**Total: 40 + 6 + 30 = 76/100**

---

## What's Hardcoded vs. Dynamic

| Element | Status | Where |
|---|---|---|
| Confidence point weights (18/12/6) | Hardcoded | `decisionbridge-views.tsx:128` |
| Score maxes (40/30/30) | Hardcoded | `decisionbridge-views.tsx:127,131,135` |
| Per-conflict penalty (12 pts) | Hardcoded | `decisionbridge-views.tsx:134` |
| Recency thresholds (30d/90d) | Hardcoded | `decisionbridge-views.tsx:137–138` |
| Stance keyword lists | Hardcoded | `decisionbridge-views.tsx:83–84` |
| Knowledge base entries | Dynamic — `localStorage` | `knowledge-store.ts` |
| Confidence level per entry | Dynamic — set by expert on submit | `knowledge-store.ts` |
| Which entries match a question | Dynamic — AI classifier or keyword fallback | `decisionbridge-views.tsx:119–123` |

---

## Limitations & Suggested Improvements

1. **Recency is step-function, not continuous** — a 29-day-old entry scores the same as a 1-day-old entry. A linear decay curve would be more accurate.
2. **Conflict detection is keyword-based** — stance inference via word lists is brittle for nuanced expert language. An LLM call to classify stance would be more reliable.
3. **Agreement rewards quantity, not quality** — two experts each with one Low-confidence entry give the same agreement score as two experts with multiple High-confidence entries. Weighting by confidence would align it better with evidence depth.
4. **Knowledge lives in `localStorage`** — not shared across users. A real deployment needs a shared backend so all users score against the same knowledge pool.
5. **Only the newest entry drives recency** — if one expert added a stale entry years ago and another added one yesterday, the score reflects "fresh" even if most knowledge is old. An average or weighted recency would be more representative.
