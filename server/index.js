/* MG Connect server
 *
 * One process does two jobs:
 *   POST /api/claude   proxies a Messages API call, keeping ANTHROPIC_API_KEY server-side
 *   everything else    serves the built React app from dist/
 *
 * The proxy is deliberately narrow: the browser sends only `system` and
 * `messages`; the model, effort and token ceiling are fixed here so a visitor
 * cannot turn the endpoint into a general-purpose, key-billed Claude relay.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../dist");

const PORT = Number(process.env.PORT) || 8787;
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const EFFORT = process.env.CLAUDE_EFFORT || "medium";
const MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS) || 4000;
const RATE_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN) || 20;
const ACCESS_CODE = process.env.ACCESS_CODE || ""; // optional shared secret

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY is not set; /api/claude will fail until it is.");
}
const client = new Anthropic();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* Tiny fixed-window rate limit per IP. Enough for a workshop; swap for a
   shared store if you ever run more than one instance. */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > 60_000) {
    hits.set(ip, { start: now, n: 1 });
    return false;
  }
  return ++h.n > RATE_PER_MIN;
}

function validMessages(m) {
  return (
    Array.isArray(m) &&
    m.length > 0 &&
    m.length <= 100 &&
    m.every(
      (x) =>
        x &&
        (x.role === "user" || x.role === "assistant") &&
        (typeof x.content === "string" || Array.isArray(x.content)),
    ) &&
    m[m.length - 1].role === "user"
  );
}

app.post("/api/claude", async (req, res) => {
  if (ACCESS_CODE && req.get("x-access-code") !== ACCESS_CODE) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: "Too many requests, try again in a minute" });
  }

  const { system, messages, max_tokens } = req.body || {};
  if (!validMessages(messages)) {
    return res.status(400).json({ error: "messages must be a non-empty user/assistant array ending in a user turn" });
  }
  if (system !== undefined && typeof system !== "string") {
    return res.status(400).json({ error: "system must be a string" });
  }

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: Math.min(Number(max_tokens) || MAX_TOKENS, MAX_TOKENS),
      output_config: { effort: EFFORT },
      // If a safety classifier declines, the API retries on its recommended
      // fallback model inside the same call instead of returning a refusal.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      ...(system ? { system } : {}),
      messages,
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "The request was declined", stop_details: response.stop_details });
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    res.json({ text, stop_reason: response.stop_reason, model: response.model, usage: response.usage });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: "Upstream rate limit, try again shortly" });
    } else if (err instanceof Anthropic.APIConnectionError) {
      res.status(502).json({ error: "Could not reach the Anthropic API" });
    } else if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      // 401/403 mean our key is wrong, not the caller's request.
      const clientFault = err.status >= 400 && err.status < 500 && err.status !== 401 && err.status !== 403;
      res.status(clientFault ? 400 : 502).json({ error: "Upstream error" });
    } else {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Built React app, with SPA fallback.
app.use(express.static(dist, { maxAge: "1h", index: false }));
app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, () => console.log(`MG Connect listening on http://localhost:${PORT}`));
