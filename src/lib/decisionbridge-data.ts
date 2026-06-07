export type Person = [string, string, string];

export const adminPeople: Person[] = [
  ['Sarah Klein', 'Project Manager', 'Decision owner for Power Module X'],
  ['Dr. Lukas Müller', 'Reliability Expert', 'Thermal cycling, lifetime stress, reliability validation'],
  ['Anna Weber', 'Supplier Qualification Expert', 'Previous supplier approval cases and decision memory'],
  ['Markus Klein', 'Supply Chain Expert', 'Lead time, supplier risk, buffer stock'],
  ['Thomas Richter', 'Quality Expert', 'Quality gates, customer risk, failure escape'],
  ['Maria Hoffmann', 'Manufacturing Expert', 'Line compatibility, cycle time, production stability'],
];

export type Category = {
  area: string;
  foundTitle: string;
  project: string;
  business: string;
  technical: string;
  recommendation: string;
  reason: string;
  risk: string;
  next: string;
  experts: [string, string, string, string, string][];
  tickets: [string, string, string][];
};

export const categoryMap: Record<string, Category> = {
  supplier: {
    area: 'Supplier approval',
    foundTitle: 'Supplier approval',
    project: 'Power Module X',
    business: 'Can Supplier B be approved without creating delivery, quality, cost, or customer risk?',
    technical: 'Has Supplier B passed supplier qualification, reliability validation, production readiness, ERP purchasing checks, and MES quality checks?',
    recommendation: 'Conditional approval',
    reason: 'Expert knowledge exists for Supplier B. The decision can be made conditionally with the available evidence.',
    risk: 'Full release is risky if final reliability validation is not complete.',
    next: 'Approve only for pilot production and request missing final confirmation before full production.',
    experts: [
      ['Dr. Lukas Müller', 'Reliability Expert', 'Thermal cycling and lifetime stress', '92% match', 'Available tomorrow'],
      ['Anna Weber', 'Supplier Qualification Expert', 'Supplier approval history', '87% match', 'Available today'],
      ['Markus Klein', 'Supply Chain Expert', 'Lead time and supplier risk', '84% match', 'Available today'],
    ],
    tickets: [
      ['Complete reliability validation', 'Dr. Lukas Müller', 'Please confirm final thermal cycling and lifetime stress result.'],
      ['Check delivery risk', 'Markus Klein', 'Please confirm lead time, stock, and supplier risk.'],
    ],
  },
  defect: {
    area: 'Manufacturing defect',
    foundTitle: 'Manufacturing defect',
    project: 'Line 3',
    business: 'What caused the defect increase and can production continue safely?',
    technical: 'Which process parameter changes correlate with the defect-rate increase in MES data after the Line 3 process change?',
    recommendation: 'Continue with restrictions',
    reason: 'Expert knowledge and MES evidence indicate the defect increase is linked to a process parameter change.',
    risk: 'Continuing production without confirmation can increase scrap and customer quality risk.',
    next: 'Ask process engineering for final root-cause confirmation and keep stricter quality checks active.',
    experts: [
      ['Thomas Richter', 'Quality Expert', 'Quality gates and customer risk', '89% match', 'Available tomorrow'],
      ['Maria Hoffmann', 'Manufacturing Expert', 'Line stability and cycle time', '86% match', 'Available today'],
    ],
    tickets: [
      ['Root cause confirmation', 'Maria Hoffmann', 'Please compare process parameters before and after the defect increase.'],
      ['Quality severity check', 'Thomas Richter', 'Please confirm customer risk and quality gate impact.'],
    ],
  },
  pilot: {
    area: 'Pilot batch shipment',
    foundTitle: 'Pilot batch shipment',
    project: 'Power Module X',
    business: 'Can we ship the pilot batch this week without unacceptable quality or customer risk?',
    technical: 'Are manufacturing release, quality gate, reliability status, and customer shipment conditions complete for the pilot batch?',
    recommendation: 'Ship pilot batch with conditions',
    reason: 'Expert knowledge confirms pilot shipment is possible if quality gate and manufacturing release are complete.',
    risk: 'Shipment can be blocked if final quality gate is not confirmed.',
    next: 'Ship only after quality gate owner confirms release status.',
    experts: [
      ['Thomas Richter', 'Quality Expert', 'Quality gates and customer risk', '89% match', 'Available tomorrow'],
      ['Maria Hoffmann', 'Manufacturing Expert', 'Batch release and line readiness', '86% match', 'Available today'],
    ],
    tickets: [
      ['Quality gate confirmation', 'Thomas Richter', 'Please confirm whether the pilot batch passed quality gate.'],
      ['Manufacturing release check', 'Maria Hoffmann', 'Please confirm batch readiness and release status.'],
    ],
  },
  material: {
    area: 'Material change',
    foundTitle: 'Packaging material change',
    project: 'Product X',
    business: 'Can we change the packaging material without product, customer, or production risk?',
    technical: 'Has the new packaging material passed reliability, manufacturability, compliance, and PLM change-control requirements?',
    recommendation: 'Expert input required',
    reason: 'No complete approved expert knowledge exists for this material change.',
    risk: 'Material change may create unknown reliability or customer approval risk.',
    next: 'Route to PLM, reliability, manufacturing, and compliance experts.',
    experts: [
      ['Nina Brandt', 'PLM Expert', 'Change request and lifecycle approval', '90% match', 'Available today'],
      ['Dr. Lukas Müller', 'Reliability Expert', 'Stress testing and lifetime', '88% match', 'Available tomorrow'],
      ['Maria Hoffmann', 'Manufacturing Expert', 'Process compatibility', '84% match', 'Available today'],
    ],
    tickets: [
      ['PLM approval check', 'Nina Brandt', 'Please confirm change-control status.'],
      ['Material reliability validation', 'Dr. Lukas Müller', 'Please confirm required long-term tests.'],
      ['Manufacturing compatibility check', 'Maria Hoffmann', 'Please check production-line compatibility.'],
    ],
  },
  testing: {
    area: 'New testing process',
    foundTitle: 'New testing process',
    project: 'Module Z',
    business: 'Can we use the new testing process without increasing customer, production, or quality risk?',
    technical: 'Has the new test process been validated for coverage, repeatability, measurement accuracy, line compatibility, and release criteria?',
    recommendation: 'Expert input required',
    reason: 'No approved expert knowledge exists for this new testing process.',
    risk: 'Using it without validation may create quality escape or customer approval risk.',
    next: 'Route to test engineering, quality, manufacturing, and PLM change experts.',
    experts: [
      ['Dr. Eva Schneider', 'Test Engineering Expert', 'Test validation and measurement systems', '94% match', 'Available today'],
      ['Thomas Richter', 'Quality Expert', 'Quality gates and customer risk', '89% match', 'Available tomorrow'],
      ['Maria Hoffmann', 'Manufacturing Expert', 'Line capability and cycle time', '86% match', 'Available today'],
      ['Jonas Fischer', 'PLM Change Expert', 'Change request and release docs', '81% match', 'Available this week'],
    ],
    tickets: [
      ['Validate new testing process', 'Dr. Eva Schneider', 'Please confirm test coverage, repeatability, measurement accuracy, and validation status.'],
      ['Quality gate approval', 'Thomas Richter', 'Please check customer risk and quality approval requirements.'],
      ['Manufacturing compatibility check', 'Maria Hoffmann', 'Please verify line compatibility, cycle time impact, and process stability.'],
      ['PLM change approval', 'Jonas Fischer', 'Please confirm whether formal PLM change approval is required.'],
    ],
  },
};

export function classify(q: string): keyof typeof categoryMap {
  const s = q.toLowerCase();
  if (s.includes('supplier') || s.includes('supplier b')) return 'supplier';
  if (s.includes('defect') || s.includes('line 3')) return 'defect';
  if (s.includes('ship') || s.includes('pilot batch')) return 'pilot';
  if (s.includes('material') || s.includes('packaging')) return 'material';
  return 'testing';
}
