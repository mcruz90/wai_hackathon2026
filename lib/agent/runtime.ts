/**
 * A small tool-use agent loop with a human in the loop.
 *
 * The agents in this folder never change what patients see. Their tools only read
 * the database or write proposals (a pending listing, or a row in agent_proposals).
 * A reviewer approves or rejects every proposal in /admin.
 *
 * The model chooses which tool to call next with LLM_PROVIDER=anthropic (Claude) or
 * LLM_PROVIDER=cohere (Cohere tool use). With any other provider (openai, mock), or with
 * AGENT_PLANNER=scripted, a scripted planner calls the same tools in a fixed order, so the
 * pipeline, the trace and the review queue work offline too.
 *
 * If Cohere fails or stops without a proposal, the scripted planner takes over and finishes the
 * run; the trace keeps Cohere's steps and says what happened.
 */
import Anthropic from "@anthropic-ai/sdk";

/** `plan` is the model's own reasoning before a call, when the provider gives one (Cohere's tool_plan). */
export type Step = { tool: string; input: unknown; result: unknown; error?: string; plan?: string };

export type AgentTool<Ctx> = {
  name: string;
  description: string;
  /** JSON schema for the tool input. Must set additionalProperties: false and list every property in required. */
  schema: Record<string, unknown>;
  /** Ends the run once it succeeds. Every agent has at least one terminal tool that writes a proposal. */
  terminal?: boolean;
  run: (input: Record<string, unknown>, ctx: Ctx) => Promise<unknown>;
};

/** A scripted planner calls tools through `call`, in the order a careful reviewer would. */
export type Planner<Ctx> = (call: (name: string, input: Record<string, unknown>) => Promise<unknown>, ctx: Ctx) => Promise<void>;

export type AgentResult = { steps: Step[]; finished: boolean; planner: "claude" | "cohere" | "scripted"; model: string | null; note: string };

export class AgentError extends Error {}

const MAX_STEPS = 8;

export function usesClaudePlanner(): boolean {
  return process.env.AGENT_PLANNER !== "scripted" && (process.env.LLM_PROVIDER || "anthropic").toLowerCase() === "anthropic";
}

/** Cohere chooses the steps when LLM_PROVIDER=cohere, unless AGENT_PLANNER=scripted switches it off. */
export function usesCoherePlanner(): boolean {
  return process.env.AGENT_PLANNER !== "scripted" && (process.env.LLM_PROVIDER || "").toLowerCase() === "cohere";
}

export async function runAgent<Ctx>(opts: {
  system: string;
  task: string;
  tools: AgentTool<Ctx>[];
  ctx: Ctx;
  planner: Planner<Ctx>;
  offline?: boolean;
}): Promise<AgentResult> {
  const steps: Step[] = [];
  let finished = false;
  const byName = new Map(opts.tools.map((t) => [t.name, t]));

  async function call(name: string, input: Record<string, unknown>, plan?: string): Promise<{ content: string; isError: boolean }> {
    const tool = byName.get(name);
    if (!tool) {
      steps.push({ tool: name, input, result: null, error: "Unknown tool.", ...(plan ? { plan } : {}) });
      return { content: `Unknown tool "${name}".`, isError: true };
    }
    if (finished) {
      steps.push({ tool: name, input, result: null, error: "A proposal was already made; the run is over." });
      return { content: "A proposal was already made. Stop now.", isError: true };
    }
    try {
      const result = await tool.run(input, opts.ctx);
      steps.push({ tool: name, input, result, ...(plan ? { plan } : {}) });
      if (tool.terminal) finished = true;
      return { content: JSON.stringify(result ?? null), isError: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : "The tool failed.";
      steps.push({ tool: name, input, result: null, error: message, ...(plan ? { plan } : {}) });
      return { content: message, isError: true };
    }
  }

  const scripted = async () => opts.planner(async (name, input) => {
    const r = await call(name, input);
    if (r.isError) throw new AgentError(r.content);
    return JSON.parse(r.content);
  }, opts.ctx);

  if (!opts.offline && usesCoherePlanner()) {
    const model = process.env.LLM_MODEL || "command-a-plus-05-2026";
    let why = "";
    try {
      why = await cohereLoop(opts.system, opts.task, opts.tools, call, () => finished, model);
    } catch (err) {
      why = err instanceof Error ? err.message : "Cohere failed.";
    }
    if (finished) return { steps, finished, planner: "cohere", model, note: why };
    // Cohere did not reach a proposal: the scripted planner finishes the run with the same tools.
    await scripted();
    return { steps, finished, planner: "scripted", model, note: `Cohere did not finish (${why || "no proposal"}), so the scripted planner completed the run.` };
  }

  if (opts.offline || !usesClaudePlanner()) {
    await scripted();
    return { steps, finished, planner: "scripted", model: null, note: "Scripted planner. Same tools, fixed order." };
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new AgentError("LLM_API_KEY is not set.");
  const model = process.env.LLM_MODEL || "claude-opus-5-5";
  const client = new Anthropic({ apiKey });
  const tools: Anthropic.Beta.BetaTool[] = opts.tools.map((t) => ({
    name: t.name, description: t.description, strict: true, input_schema: t.schema as Anthropic.Beta.BetaTool["input_schema"],
  }));
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.task }];
  let note = "";

  for (let turn = 0; turn < MAX_STEPS && !finished; turn++) {
    let res: Anthropic.Beta.BetaMessage;
    try {
      res = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: opts.system,
        tools,
        messages,
      });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new AgentError("The LLM API key was rejected.");
      if (err instanceof Anthropic.RateLimitError) throw new AgentError("The LLM provider is rate limiting. Try again in a minute.");
      if (err instanceof Anthropic.APIError) throw new AgentError(`The LLM provider returned an error (${err.status ?? "network"}).`);
      throw err;
    }
    if (res.stop_reason === "refusal") { note = "The model declined to continue."; break; }
    if (res.stop_reason === "max_tokens") { note = "The model's answer was cut off."; break; }
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason === "pause_turn") continue;
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!uses.length) {
      const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? "";
      note = text ? `Stopped without a proposal: ${text.slice(0, 300)}` : "Stopped without a proposal.";
      break;
    }
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const u of uses) {
      const r = await call(u.name, (u.input ?? {}) as Record<string, unknown>);
      results.push({ type: "tool_result", tool_use_id: u.id, content: r.content, is_error: r.isError || undefined });
    }
    messages.push({ role: "user", content: results });
  }
  if (!finished && !note) note = `Stopped after ${MAX_STEPS} turns without a proposal.`;
  return { steps, finished, planner: "claude", model, note };
}

/**
 * Cohere's JSON schema support is narrower than the tools' strict schemas: a nullable field
 * (anyOf [T, null]) becomes an optional field of type T, and additionalProperties is dropped.
 * Tools already treat a missing optional field like null.
 */
export function toCohereSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;
  const s = schema as Record<string, unknown>;
  if (Array.isArray(s.anyOf)) {
    const nonNull = (s.anyOf as Record<string, unknown>[]).filter((x) => x?.type !== "null");
    if (nonNull.length === 1) return toCohereSchema(nonNull[0]);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "additionalProperties") continue;
    if (k === "properties" && v && typeof v === "object") out.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, toCohereSchema(pv)]));
    else if (k === "items") out.items = toCohereSchema(v);
    else out[k] = v;
  }
  if (Array.isArray(s.required) && s.properties && typeof s.properties === "object") {
    const props = s.properties as Record<string, Record<string, unknown>>;
    out.required = (s.required as string[]).filter((k) => !(Array.isArray(props[k]?.anyOf) && props[k].anyOf.some((x: Record<string, unknown>) => x?.type === "null")));
  }
  return out;
}

type CohereToolCall = { id?: string; type?: string; function?: { name?: string; arguments?: string } };

/**
 * Cohere v2 Chat tool use: the model reads the task, writes a short plan, and calls tools until it calls a
 * terminal tool (one that writes a proposal). Returns a note; throws on an API error.
 */
async function cohereLoop<Ctx>(
  system: string, task: string, agentTools: AgentTool<Ctx>[],
  call: (name: string, input: Record<string, unknown>, plan?: string) => Promise<{ content: string; isError: boolean }>,
  isFinished: () => boolean, model: string,
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new AgentError("LLM_API_KEY is not set.");
  const tools = agentTools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: toCohereSchema(t.schema) } }));
  const messages: Record<string, unknown>[] = [{ role: "system", content: system }, { role: "user", content: task }];

  for (let turn = 0; turn < MAX_STEPS && !isFinished(); turn++) {
    let res: Response;
    try {
      res = await fetch("https://api.cohere.com/v2/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({ model, messages, tools }),
      });
    } catch {
      throw new AgentError("Cohere could not be reached.");
    }
    if (res.status === 401) throw new AgentError("The LLM API key was rejected.");
    if (res.status === 429) throw new AgentError("Cohere is rate limiting.");
    if (!res.ok) throw new AgentError(`Cohere returned an error (${res.status}). ${(await res.text().catch(() => "")).slice(0, 200)}`.trim());
    const body = await res.json();
    const message = body?.message ?? {};
    const calls: CohereToolCall[] = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    const plan = typeof message.tool_plan === "string" ? message.tool_plan.slice(0, 600) : undefined;
    if (!calls.length) {
      const text = Array.isArray(message.content) ? message.content.find((c: { type?: string }) => c?.type === "text")?.text : undefined;
      return text ? `Stopped without a proposal: ${String(text).slice(0, 300)}` : "Stopped without a proposal.";
    }
    messages.push({ role: "assistant", tool_plan: message.tool_plan, tool_calls: calls });
    for (const [i, c] of calls.entries()) {
      let input: Record<string, unknown> = {};
      try { input = c.function?.arguments ? JSON.parse(c.function.arguments) : {}; } catch { input = {}; }
      const r = await call(String(c.function?.name ?? ""), input, i === 0 ? plan : undefined);
      messages.push({ role: "tool", tool_call_id: c.id, content: r.isError ? `Error: ${r.content}` : r.content });
    }
  }
  return isFinished() ? "Cohere chose each step." : `Stopped after ${MAX_STEPS} turns without a proposal.`;
}

/** Shorten a step for display and storage: tool results can carry whole listings. */
export function compactTrace(steps: Step[]): Step[] {
  const cut = (v: unknown) => {
    const s = JSON.stringify(v ?? null);
    return s.length > 1200 ? `${s.slice(0, 1200)}…` : (v ?? null);
  };
  return steps.map((s) => ({ ...s, input: cut(s.input), result: cut(s.result) }));
}
