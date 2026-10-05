export const decisionFlowDefinition = `flowchart LR
  A["Decision frame"] --> B["Verified evidence"]
  B --> F["Independent challenge"]
  F --> C["Four conditional scenarios"]
  C --> D["Robust actions"]
  C --> E["Observable signposts"]
  E -. "refresh assumptions" .-> A`;

export const mermaidThemeVariables = {
  background: '#ffffff',
  primaryColor: '#ffffff',
  primaryTextColor: '#111111',
  primaryBorderColor: '#111111',
  lineColor: '#111111',
  secondaryColor: '#ffffff',
  tertiaryColor: '#ffffff',
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontSize: '15px',
};
