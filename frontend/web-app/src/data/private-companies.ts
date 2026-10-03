export const privateCompanies = [
  'Airtable', 'Alchemy', 'Aldi', 'Anthropic', 'Anduril Industries', 'Automattic',
  'Bloomberg', 'Bosch', 'Brex', 'ByteDance', 'Canva', 'Cargill', 'Carta', 'Celonis',
  'Databricks', 'Dataminr', 'Deel', 'Deloitte', 'Discord', 'Epic Games', 'EY',
  'Fanatics', 'Fidelity Investments', 'Flexport', 'HEYTEA', 'Huawei', 'IKEA',
  'Impossible Foods', 'Koch', 'Lego Group', 'Mars', 'Mistral AI', 'Neuralink',
  'Notion', 'OpenAI', 'Perplexity', 'Plaid', 'PwC', 'Revolut', 'Rippling',
  'SAS Institute', 'Scale AI', 'Shein', 'SpaceX', 'Stripe', 'Telegram',
  'The Boring Company', 'ThoughtSpot', 'TikTok', 'VAST Data', 'Valve', 'Waymo',
  'xAI', 'Zapier', 'Zoox',
].map((name) => ({ name, ownership: 'private' as const }));
