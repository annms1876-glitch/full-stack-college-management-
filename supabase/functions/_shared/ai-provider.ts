export type ChatMessage = { role: "system" | "user"; content: string };

export async function generateText(messages: ChatMessage[]): Promise<string> {
  const provider = (Deno.env.get("AI_PROVIDER") ?? "openai-compatible").toLowerCase();
  const base = Deno.env.get("AI_BASE_URL");
  const key = Deno.env.get("AI_API_KEY");
  const model = Deno.env.get("AI_MODEL");
  if (!base || !key || !model || !["openai-compatible", "openai", "deepseek", "custom"].includes(provider)) {
    throw new Error("AI provider not configured");
  }
  let parsed: URL;
  try { parsed = new URL(base); } catch { throw new Error("AI provider configuration invalid"); }
  const allowedHosts = (Deno.env.get("AI_ALLOWED_HOSTS") ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port && parsed.port !== "443" ||
      parsed.search || parsed.hash || !allowedHosts.includes(parsed.hostname.toLowerCase())) {
    throw new Error("AI provider configuration invalid");
  }
  const endpoint = `${parsed.toString().replace(/\/+$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      redirect: "error",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 500, stream: false }),
    });
    if (!response.ok) throw new Error("AI provider error");
    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content;
    if (typeof output !== "string") throw new Error("Invalid AI response");
    return output;
  } finally {
    clearTimeout(timer);
  }
}
