export const decisionFlowDefinition = `flowchart LR
  A["Frame decision"] --> B["Verify evidence"]
  B --> F["Challenge claims"]
  F --> C["Build scenarios"]
  C --> D["Test actions"]
  C --> E["Monitor signposts"]
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
