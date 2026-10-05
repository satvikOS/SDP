// Fail closed: a successful HTTP response can still be a hosting login page.
let body = '';
for await (const chunk of process.stdin) body += chunk;
let health;
try {
  health = JSON.parse(body);
} catch {
  throw new Error('Runtime health check did not return application JSON.');
}
if (health.status !== 'ready' || health.service !== 'sdp-decision-room'
  || !['xai', 'google', 'openai', 'researchEnabled', 'evidenceRequired'].every((key) => health.providers?.[key] === true)) {
  throw new Error('Runtime health check failed: required evidence providers are not configured.');
}
console.log('SDP runtime is ready; all three evidence providers are configured.');
