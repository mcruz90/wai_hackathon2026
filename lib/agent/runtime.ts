/**
 * A small tool-use agent loop with a human in the loop.
 *
 * The agents in this folder never change what patients see. Their tools only read
 * the database or write proposals (a pending listing, or a row in agent_proposals).
 * A reviewer approves or rejects every proposal in /admin.
 *
 * With LLM_PROVIDER=anthropic, Claude chooses which tool to call next. With any other
 * provider (openai, mock), a scripted planner calls the same tools in a fixed order,
 * so the pipeline, the trace and the review queue work offline too.
 */
import Anthropic from "@anthropic-ai/sdk";

export type Step = { tool: string; input: unknown; result: unknown; error?: string };

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

export type AgentResult = { steps: Step[]; finished: boolean; planner: "claude" | "scripted"; model: string | null; note: string };

export class AgentError extends Error {}

const MAX_STEPS = 8;

export function usesClaudePlanner(): boolean {
  return (process.env.LLM_PROVIDER || "anthropic").toLowerCase() === "anthropic";
}

export async function runAgent<Ctx>(opts: {
  system: string;
  task: string;
  tools: AgentTool<Ctx>[];
  ctx: Ctx;
  planner: Planner<Ctx>;
}): Promise<AgentResult> {
  const steps: Step[] = [];
  let finished = false;
  const byName = new Map(opts.tools.map((t) => [t.name, t]));

  async function call(name: string, input: Record<string, unknown>): Promise<{ content: string; isError: boolean }> {
    const tool = byName.get(name);
    if (!tool) {
      steps.push({ tool: name, input, result: null, error: "Unknown tool." });
      return { content: `Unknown tool "${name}".`, isError: true };
    }
    if (finished) {
      steps.push({ tool: name, input, result: null, error: "A proposal was already made; the run is over." });
      return { content: "A proposal was already made. Stop now.", isError: true };
    }
    try {
      const result = await tool.run(input, opts.ctx);
      steps.push({ tool: name, input, result });
      if (tool.terminal) finished = true;
      return { content: JSON.stringify(result ?? null), isError: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : "The tool failed.";
      steps.push({ tool: name, input, result: null, error: message });
      return { content: message, isError: true };
    }
  }

  if (!usesClaudePlanner()) {
    await opts.planner(async (name, input) => {
      const r = await call(name, input);
      if (r.isError) throw new AgentError(r.content);
      return JSON.parse(r.content);
    }, opts.ctx);
    return { steps, finished, planner: "scripted", model: null, note: "Scripted planner (no Claude key in use). Same tools, fixed order." };
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

/** Shorten a step for display and storage: tool results can carry whole listings. */
export function compactTrace(steps: Step[]): Step[] {
  const cut = (v: unknown) => {
    const s = JSON.stringify(v ?? null);
    return s.length > 1200 ? `${s.slice(0, 1200)}…` : (v ?? null);
  };
  return steps.map((s) => ({ ...s, input: cut(s.input), result: cut(s.result) }));
}
