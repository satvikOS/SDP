export const industries = [
  'Aerospace and defense', 'Agricultural technology', 'Agriculture and forestry',
  'Airlines and aviation', 'Apparel and luxury goods', 'Asset management',
  'Automotive manufacturing', 'Banking', 'Biotechnology', 'Broadcasting and media',
  'Building materials', 'Business services', 'Chemicals', 'Cloud infrastructure',
  'Commercial real estate', 'Construction and engineering', 'Consumer electronics',
  'Consumer finance', 'Cybersecurity', 'Data centers', 'Digital commerce',
  'Education and learning', 'Electric utilities', 'Energy infrastructure',
  'Entertainment', 'Environmental services', 'Financial technology', 'Food and beverage',
  'Freight and logistics', 'Gaming and interactive media', 'Government and public sector',
  'Healthcare delivery', 'Hospitality and leisure', 'Industrial automation',
  'Industrial manufacturing', 'Insurance', 'Internet platforms', 'Legal services',
  'Life sciences', 'Maritime and shipping', 'Medical devices', 'Metals and mining',
  'Mobility and transportation', 'Oil and gas', 'Pharmaceuticals',
  'Professional services', 'Quantum computing', 'Renewable energy', 'Retail',
  'Robotics', 'Semiconductors', 'Software', 'Space economy', 'Sports and recreation',
  'Supply chain technology', 'Telecommunications', 'Travel and tourism',
  'Venture capital and private equity', 'Waste management', 'Water infrastructure',
];

const countryCodes = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');

const regionGroups = [
  'Global', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
  'Middle East', 'European Union', 'Gulf Cooperation Council', 'ASEAN',
  'Latin America and the Caribbean', 'Sub-Saharan Africa', 'Central Asia',
];

export function getGeographies(locale = 'en') {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = countryCodes
    .map((code) => ({ id: code, name: names.of(code) ?? code }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  return [
    ...regionGroups.map((name) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name })),
    ...countries,
  ];
}

export const scenarioTemplates = [
  {
    id: 'market-entry',
    name: 'Market entry',
    description: 'Test sequencing, regulation, channel power, and demand uncertainty.',
    question: 'How should we sequence market entry if adoption and regulation move at different speeds?',
    uncertainties: ['Regulatory timing', 'Customer adoption', 'Channel concentration'],
  },
  {
    id: 'capital-allocation',
    name: 'Capital allocation',
    description: 'Stress-test staged investments against demand and financing conditions.',
    question: 'Which capital commitments remain defensible across materially different demand environments?',
    uncertainties: ['Cost of capital', 'Demand growth', 'Execution capacity'],
  },
  {
    id: 'supply-network',
    name: 'Supply network',
    description: 'Explore concentration, trade, automation, and supplier resilience.',
    question: 'How should the supply network change if trade access and automation economics diverge?',
    uncertainties: ['Trade restrictions', 'Supplier concentration', 'Automation cost'],
  },
  {
    id: 'technology-bet',
    name: 'Technology investment',
    description: 'Evaluate platform bets under changing capability, cost, and governance.',
    question: 'What technology posture creates advantage without locking us into one capability trajectory?',
    uncertainties: ['Capability progress', 'Governance requirements', 'Integration cost'],
  },
  {
    id: 'workforce',
    name: 'Workforce design',
    description: 'Plan skills, operating models, and capacity for multiple demand paths.',
    question: 'Which workforce design remains effective as demand and automation adoption change?',
    uncertainties: ['Talent availability', 'Automation adoption', 'Operating model change'],
  },
  {
    id: 'portfolio',
    name: 'Portfolio resilience',
    description: 'Find correlated exposure and options across a portfolio of initiatives.',
    question: 'Which portfolio choices improve resilience without sacrificing strategic upside?',
    uncertainties: ['Market correlation', 'Funding availability', 'Execution dependencies'],
  },
];
