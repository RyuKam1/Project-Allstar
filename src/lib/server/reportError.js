// Lightweight centralized error reporter.
// Always logs to the server console; if ERROR_WEBHOOK_URL is set, also forwards
// a compact JSON payload (works with Slack/Discord/generic webhooks). No hard
// third-party dependency — wire a real monitor (e.g. Sentry) later if desired.
export async function reportError(scope, error, context = {}) {
  const message = error?.message || String(error);
  console.error(`[allstar:${scope}]`, message, context);

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 [${scope}] ${message}`,
        scope,
        message,
        context,
        at: new Date().toISOString(),
      }),
    });
  } catch {
    // Never let error reporting throw.
  }
}
