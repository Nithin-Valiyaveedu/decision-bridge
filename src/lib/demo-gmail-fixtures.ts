import type { GmailMessage } from "./search-gmail.functions";

// Keyed by knowledge area — returned when no real Gmail token is present
const FIXTURES: Record<string, GmailMessage[]> = {
  "Supplier approval": [
    {
      id: "demo-sup-001",
      subject: "RE: Supplier B qualification — reliability test results",
      from: "Dr. Lukas Müller <lukas.mueller@infineon.com>",
      date: "3 Jun 2025",
      snippet: "Thermal cycling passed 500 cycles with zero failures. I recommend conditional approval for pilot production, pending final lot acceptance.",
      body: `Hi Sarah,

Quick update from the reliability lab: Supplier B's components completed the full thermal cycling test (500 cycles, -40°C to +125°C) with zero failures across all 48 samples. This exceeds our internal gate.

I'd recommend conditional approval for pilot production. The one open item is the final lot-acceptance test (LAT) — we typically require that before full ramp. I can close that in about 2 weeks if they ship the next batch on schedule.

My recommendation: approve for pilot, hold full production release until LAT is confirmed.

Best,
Dr. Lukas Müller
Reliability Expert — Power Semiconductors`,
    },
    {
      id: "demo-sup-002",
      subject: "Supplier B — supply chain risk assessment (CATL dependency)",
      from: "Markus Klein <markus.klein@infineon.com>",
      date: "28 May 2025",
      snippet: "Lead times are acceptable at 6–8 weeks, but we have no backup supplier qualified. Recommend buffer stock of at least 8 weeks before approval.",
      body: `Sarah,

I've completed the supply chain review for Supplier B. Summary:

1. Lead time: 6–8 weeks standard, acceptable for our production schedule.
2. Single-source risk: We have no qualified backup. If Supplier B has any disruption we're exposed.
3. Buffer stock: I strongly recommend holding 8 weeks' worth before we approve them as a primary source.
4. China dependency: ~40% of their sub-components come from Chinese suppliers. Given current geopolitical climate, this is a medium risk that should be flagged to the procurement committee.

My stance: approval is viable but not without these safeguards in place. I would not approve for full production without the buffer stock plan confirmed.

Markus Klein
Supply Chain Expert`,
    },
    {
      id: "demo-sup-003",
      subject: "Supplier B qualification — approval recommendation from SQE",
      from: "Anna Weber <anna.weber@infineon.com>",
      date: "1 Jun 2025",
      snippet: "PPAP documentation complete. Cpk values all above 1.67. I approve Supplier B for pilot production based on the qualification package.",
      body: `Hi team,

I've reviewed the full PPAP package for Supplier B and everything looks solid:
- Dimensional reports: all within tolerance (Cpk ≥ 1.67 across all critical dimensions)
- FMEA: complete, all risk levels addressed
- Control plan: approved
- MSA: gauge R&R < 10% on all measurement systems
- Initial samples: 300 pcs, zero defects

Based on the qualification documentation, I formally approve Supplier B for pilot production. For full production release, we'll need the LAT from Lukas and a confirmed buffer-stock plan from Markus.

Anna Weber
Supplier Qualification Expert`,
    },
  ],

  "Manufacturing defect": [
    {
      id: "demo-mfg-001",
      subject: "Line 3 defect escalation — solder void rate spike",
      from: "Thomas Richter <thomas.richter@infineon.com>",
      date: "4 Jun 2025",
      snippet: "Solder void rate jumped to 8.3% on Line 3 this morning — 3× our threshold. I've flagged it for immediate root-cause investigation. Do not ship until resolved.",
      body: `ESCALATION — Line 3 Quality Issue

Sarah, team,

This morning's in-line AOI data shows solder void rate at 8.3% on Line 3 (threshold: 2.5%). This is a 3× breach. I've already put a STOP SHIP hold on all parts from Line 3 produced since 06:00 this morning (approx. 1,200 units).

Immediate containment:
- Affected units quarantined in MES
- Line 3 halted pending root-cause
- Customer shipment scheduled for Thursday is at risk

Suspected root cause: paste printer maintenance was skipped last night shift. Engineering team is investigating.

I need a go/no-go decision from you by EOD on whether to attempt emergency rework or scrap.

Thomas Richter
Quality Expert`,
    },
    {
      id: "demo-mfg-002",
      subject: "RE: Line 3 defect — root cause confirmed, corrective action",
      from: "Maria Hoffmann <maria.hoffmann@infineon.com>",
      date: "4 Jun 2025",
      snippet: "Root cause confirmed: stencil clogging due to missed cleaning cycle. Corrective action complete — line requalified. Recommend resuming production.",
      body: `Sarah,

Root cause confirmed: the apertures on the solder paste stencil were partially blocked due to a missed cleaning cycle on night shift. This caused inconsistent paste deposit and the void spike.

Actions taken:
1. Stencil cleaned and requalified — paste weight back within ±5% spec
2. Night shift SOP updated to make cleaning mandatory before each shift start
3. First-article inspection on 50 units post-fix: 0 defects, void rate 0.9%

My recommendation: resume production on Line 3. The quarantined 1,200 units need X-ray re-inspection — I'd estimate 15–20% may need rework (solder reflow), the rest should be clean.

Maria Hoffmann
Manufacturing Expert`,
    },
    {
      id: "demo-mfg-003",
      subject: "Line 3 hold status — quality gate release pending",
      from: "Thomas Richter <thomas.richter@infineon.com>",
      date: "5 Jun 2025",
      snippet: "X-ray results in: 214 units require rework, 986 units cleared. Quality gate release pending your sign-off. Thursday shipment salvageable if you approve rework by noon.",
      body: `Sarah,

X-ray inspection complete on the quarantined batch:
- 986 units: cleared, void rate < 2% ✓
- 214 units: void rate > 5%, require solder rework

If you approve the rework plan today (target completion: Wednesday evening), we can still make the Thursday shipment for the 986 clean units. The 214 rework units would ship next week.

I'm holding the quality gate release pending your decision. Line 3 is ready to resume for new production.

Please confirm:
1. Approve rework for the 214 units
2. Release quality gate for the 986 cleared units

Thomas`,
    },
  ],

  "Pilot batch shipment": [
    {
      id: "demo-ship-001",
      subject: "Pilot batch PB-2025-07 — quality gate status",
      from: "Thomas Richter <thomas.richter@infineon.com>",
      date: "2 Jun 2025",
      snippet: "All quality gates passed for PB-2025-07. I've signed the QGR. Ready to ship pending logistics confirmation.",
      body: `Sarah,

Pilot batch PB-2025-07 has cleared all internal quality gates:

✓ Incoming inspection: passed
✓ In-process monitoring: no deviations
✓ Final electrical test: 100% pass rate (0 failures)
✓ Visual inspection: passed
✓ Customer-specific tests per spec rev 3.2: all passed

I've signed the Quality Gate Release (QGR-2025-0612) in PLM. The batch is cleared from a quality standpoint.

Remaining dependencies before shipment:
- Logistics booking confirmation (Markus)
- Customer receiving window confirmation

Thomas Richter
Quality Expert`,
    },
    {
      id: "demo-ship-002",
      subject: "RE: PB-2025-07 shipment window — customer confirmed",
      from: "Markus Klein <markus.klein@infineon.com>",
      date: "3 Jun 2025",
      snippet: "Customer confirmed receiving window: 10–12 June. Logistics booked with DHL Express. All clear from supply chain side — proceed with shipment.",
      body: `Hi Sarah,

Customer logistics confirmed: they can receive PB-2025-07 on 10–12 June. I've booked DHL Express for pickup on 9 June (Monday).

Export documentation:
- Commercial invoice: prepared
- Packing list: prepared
- ECC classification: confirmed, no export license required
- REACH/RoHS declarations: attached to shipment in SAP

From supply chain side: all clear. The batch can proceed to shipment as scheduled. The €2.1M follow-on order milestone is protected if we ship by Friday.

Markus`,
    },
    {
      id: "demo-ship-003",
      subject: "Pilot batch — reliability sign-off for PB-2025-07",
      from: "Dr. Lukas Müller <lukas.mueller@infineon.com>",
      date: "31 May 2025",
      snippet: "HTRB and temperature cycling complete on pilot samples. All pass. I approve the batch for customer shipment from a reliability standpoint.",
      body: `Hi,

Reliability qualification on the 10 pilot samples from PB-2025-07:

- HTRB (1000h, 150°C, rated voltage): 0 failures ✓
- Temperature cycling (200 cycles, -55°C to +150°C): 0 failures ✓
- HTSL (1000h, 175°C): 0 failures ✓

All results within specification. I sign off on this batch for customer shipment. This data has been uploaded to PLM under document REL-2025-0598.

Dr. Lukas Müller`,
    },
  ],

  "Material change": [
    {
      id: "demo-mat-001",
      subject: "PCN review: packaging material change — mold compound switch",
      from: "Anna Weber <anna.weber@infineon.com>",
      date: "30 May 2025",
      snippet: "Reviewed PCN from supplier. New mold compound is equivalent per JEDEC. Customer notification required under our contract. Recommend proceeding with qualification.",
      body: `Sarah,

Reviewed the Product Change Notification from Supplier B regarding the mold compound switch (from MC-A to MC-B).

My assessment:
- MC-B is JEDEC MSL2 equivalent ✓
- Pin-for-pin compatible — no form/fit/function change
- Material safety data: REACH/RoHS compliant ✓
- Customer notification: required under our supply agreement (Clause 7.2) — 90-day advance notice

Recommendation: Proceed with internal qualification testing in parallel with customer notification. This avoids a 90-day delay if tests pass quickly. Full qualification typically takes 6–8 weeks.

Anna Weber
Supplier Qualification`,
    },
    {
      id: "demo-mat-002",
      subject: "RE: Mold compound change — long-term reliability concern",
      from: "Dr. Lukas Müller <lukas.mueller@infineon.com>",
      date: "1 Jun 2025",
      snippet: "I have concerns about MC-B's moisture sensitivity under high-humidity conditions. Need to see the HTSL and autoclave test data before I can approve.",
      body: `Hi Anna, Sarah,

I've reviewed the datasheet for MC-B. While the standard JEDEC tests show equivalent performance, I have one open concern: high-humidity storage behavior.

Our application (automotive underhood) sees humidity levels that can stress mold compounds differently than the standard test. I need to see:
1. Autoclave test data (96h, 121°C, 100% RH) — not in the package they sent
2. HTSL at 175°C (our operating condition is higher than the standard 150°C test)

Until I have that data, I cannot approve this change. The risk of a field reliability issue on this compound under our conditions is non-trivial.

I do NOT recommend proceeding with customer notification yet — if the data comes back negative, we'll have notified them for nothing and set an expectation we can't meet.

Dr. L. Müller`,
    },
    {
      id: "demo-mat-003",
      subject: "MC-B qualification data received — proceed?",
      from: "Maria Hoffmann <maria.hoffmann@infineon.com>",
      date: "4 Jun 2025",
      snippet: "Line trials with MC-B complete. No process issues. Wire bonding and molding yields identical to MC-A. Manufacturing approves the material change.",
      body: `Sarah,

We ran MC-B on Line 2 last week for 3 production days (approx. 8,000 units). Results:

- Molding yield: 99.4% (vs 99.5% for MC-A — within noise) ✓
- Wire bonding pull strength: no change ✓
- Visual defect rate: identical ✓
- Cure profile: compatible with existing oven settings ✓

From a manufacturing perspective, MC-B is a drop-in replacement. No process changes needed. I approve this change from the manufacturing side.

The ball is in Lukas' court — once he clears the reliability data, we're ready to go.

Maria Hoffmann
Manufacturing Expert`,
    },
  ],

  "New testing process": [
    {
      id: "demo-test-001",
      subject: "Proposal: accelerated electrical test flow for PM-X — 40% cycle time reduction",
      from: "Maria Hoffmann <maria.hoffmann@infineon.com>",
      date: "29 May 2025",
      snippet: "New test sequence removes redundant intermediate checks. Simulation shows 40% throughput gain. Recommending validation study before rollout.",
      body: `Sarah,

I've been working on a revised electrical test sequence for Power Module X. The current flow has 3 intermediate checkpoints that are redundant given our in-line SPC data. Removing them would reduce test cycle time from 4.2 min to 2.5 min per unit — a 40% improvement.

Estimated impact: ~12% throughput gain on the test floor, roughly 350 additional units/day.

Before I recommend rollout, I want to run a 2-week parallel study — new flow alongside old — on a sample of 2,000 units to confirm we're not missing any escapes. If the study passes, I'd recommend PLM change approval and then full rollout.

Do I have go-ahead to start the parallel study?

Maria`,
    },
    {
      id: "demo-test-002",
      subject: "RE: New test flow — quality risk assessment",
      from: "Thomas Richter <thomas.richter@infineon.com>",
      date: "31 May 2025",
      snippet: "I have concerns. The intermediate checks catch ~0.3% of units that pass final test but have latent defects. Removing them increases field escape risk. Need to see a proper FMEA before I can approve.",
      body: `Maria, Sarah,

I've looked at the data behind the proposed test reduction. My concern:

The three intermediate checks you're proposing to remove caught 23 units with latent defects over the last 6 months — units that passed the final test but would likely have failed in the field within 12 months (based on our FMEA analysis). That's a 0.3% escape rate on those steps.

At 350 additional units per day, we'd be shipping roughly 1 extra latent-defect unit per day. Over a year, that's ~350 units at risk — each with a potential warranty cost of €800–2,000 depending on the application.

My position: I cannot approve this change without a formal FMEA showing how we'll catch those latent defects through other means. The throughput gain does not justify the quality escape risk as currently scoped.

Thomas Richter
Quality Expert`,
    },
    {
      id: "demo-test-003",
      subject: "RE: Test process FMEA — revised proposal",
      from: "Maria Hoffmann <maria.hoffmann@infineon.com>",
      date: "3 Jun 2025",
      snippet: "Revised FMEA complete. Added enhanced in-line SPC trigger to compensate. Thomas, does this address your concern? Sarah, pending Thomas's sign-off we can proceed.",
      body: `Thomas, Sarah,

Revised FMEA attached. To address Thomas's concern:

New control: Enhanced in-line SPC trigger — if any of 4 key process parameters drift >1.5σ, the system automatically re-routes the affected lot to full test (including the intermediate checks). This gives us an equivalent safety net without adding cycle time to every unit.

Based on our historical data, this trigger would have caught 21 of the 23 units Thomas flagged. The 2 misses were random mechanical failures — not caught by either test approach.

Thomas: does this satisfy your quality concern? If yes, I'll initiate the PLM change request today.
Sarah: pending Thomas's sign-off, the 2-week parallel study can start Monday.

Maria`,
    },
  ],
};

// Returns demo emails filtered loosely by area. Falls back to the area's full list.
export function getDemoGmailMessages(area: string): GmailMessage[] {
  return FIXTURES[area] ?? FIXTURES["Supplier approval"];
}
