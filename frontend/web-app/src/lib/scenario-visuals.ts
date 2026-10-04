export const decisionFlowDefinition = `flowchart LR
  A["Decision frame"] --> B["Critical drivers"]
  B --> C["Four plausible environments"]
  C --> D["Robust actions"]
  C --> E["Observable signposts"]
  E -. "refresh assumptions" .-> A`;

export const mermaidThemeVariables = {
  background: '#ffffff',
  primaryColor: '#ffffff',
  primaryTextColor: '#111111',
  primaryBorderColor: '#111111',
  lineColor: '#1f4b73',
  secondaryColor: '#f3f4f6',
  tertiaryColor: '#ffffff',
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontSize: '15px',
};
