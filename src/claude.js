/* Browser-side helper for the /api/claude proxy.
 *
 * The API key never reaches the browser: this posts to our own server, which
 * holds ANTHROPIC_API_KEY and makes the Anthropic call. The server fixes the
 * model and caps max_tokens, so only `system` and `messages` are sent.
 *
 *   import { askClaude } from "./claude";
 *   const text = await askClaude({
 *     system: "You are N. Sabry, Rooms Division Director…",
 *     messages: [{ role: "user", content: "How did this happen?" }],
 *   });
 */
export async function askClaude({ system, messages, maxTokens, signal }) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens: maxTokens }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data.text;
}
