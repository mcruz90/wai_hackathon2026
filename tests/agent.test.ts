import test from "node:test";
import assert from "node:assert/strict";
import { runAgent, toCohereSchema, type AgentTool } from "../lib/agent/runtime";

type Ctx = { log: string[] };
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const tools: AgentTool<Ctx>[] = [
  { name: "look", description: "Look something up.", schema: obj({ q: { anyOf: [{ type: "string" }, { type: "null" }] } }), async run(input, ctx) { ctx.log.push(`look:${input.q ?? ""}`); return { found: 1 }; } },
  { name: "propose", description: "Write the proposal.", schema: obj({ why: { type: "string" } }), terminal: true, async run(input, ctx) { ctx.log.push(`propose:${input.why}`); return { ok: true }; } },
];
const scripted = async (call: (n: string, i: Record<string, unknown>) => Promise<unknown>) => { await call("look", { q: "scripted" }); await call("propose", { why: "fallback" }); };

function withEnv(env: Record<string, string | undefined>, fn: () => Promise<void>) {
  const before = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  const realFetch = globalThis.fetch;
  return fn().finally(() => {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(before)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  });
}
const reply = (message: unknown) => new Response(JSON.stringify({ message }), { status: 200 });

test("Cohere schemas: nullable fields become optional, additionalProperties is dropped", () => {
  const s = toCohereSchema(obj({ q: { anyOf: [{ type: "string" }, { type: "null" }] }, why: { type: "string" } })) as Record<string, unknown>;
  assert.deepEqual(s, { type: "object", properties: { q: { type: "string" }, why: { type: "string" } }, required: ["why"] });
});

test("with LLM_PROVIDER=cohere, Cohere chooses the steps and its plan is kept in the trace", () =>
  withEnv({ LLM_PROVIDER: "cohere", LLM_API_KEY: "k", LLM_MODEL: "command-a-plus-05-2026", AGENT_PLANNER: undefined }, async () => {
    const bodies: { messages: { role: string }[]; tools: { function: { name: string } }[] }[] = [];
    const replies = [
      { tool_plan: "First I will look it up.", tool_calls: [{ id: "c1", type: "function", function: { name: "look", arguments: JSON.stringify({ q: "clinic" }) } }] },
      { tool_plan: "Nothing conflicts, so I will propose.", tool_calls: [{ id: "c2", type: "function", function: { name: "propose", arguments: JSON.stringify({ why: "new clinic" }) } }] },
    ];
    globalThis.fetch = (async (_url: string, init: { body: string }) => { bodies.push(JSON.parse(init.body)); return reply(replies[bodies.length - 1]); }) as unknown as typeof fetch;
    const ctx: Ctx = { log: [] };
    const r = await runAgent({ system: "sys", task: "task", tools, ctx, planner: scripted });
    assert.equal(r.planner, "cohere");
    assert.equal(r.finished, true);
    assert.deepEqual(ctx.log, ["look:clinic", "propose:new clinic"]);
    assert.equal(r.steps[0].plan, "First I will look it up.");
    assert.deepEqual(bodies[0].tools.map((t) => t.function.name), ["look", "propose"]);
    // The second request carries the first call and its result back to Cohere.
    assert.deepEqual(bodies[1].messages.map((m) => m.role), ["system", "user", "assistant", "tool"]);
  }));

test("if Cohere fails, the scripted planner finishes the run and the trace says so", () =>
  withEnv({ LLM_PROVIDER: "cohere", LLM_API_KEY: "k", AGENT_PLANNER: undefined }, async () => {
    globalThis.fetch = (async () => new Response("bad", { status: 500 })) as unknown as typeof fetch;
    const ctx: Ctx = { log: [] };
    const r = await runAgent({ system: "sys", task: "task", tools, ctx, planner: scripted });
    assert.equal(r.planner, "scripted");
    assert.equal(r.finished, true);
    assert.deepEqual(ctx.log, ["look:scripted", "propose:fallback"]);
    assert.match(r.note, /Cohere did not finish/);
  }));

test("if Cohere stops without a proposal, the scripted planner finishes the run", () =>
  withEnv({ LLM_PROVIDER: "cohere", LLM_API_KEY: "k", AGENT_PLANNER: undefined }, async () => {
    globalThis.fetch = (async () => reply({ content: [{ type: "text", text: "I am not sure." }] })) as unknown as typeof fetch;
    const ctx: Ctx = { log: [] };
    const r = await runAgent({ system: "sys", task: "task", tools, ctx, planner: scripted });
    assert.equal(r.finished, true);
    assert.match(r.note, /I am not sure/);
  }));

test("AGENT_PLANNER=scripted switches the model off without calling it", () =>
  withEnv({ LLM_PROVIDER: "cohere", LLM_API_KEY: "k", AGENT_PLANNER: "scripted" }, async () => {
    globalThis.fetch = (() => { throw new Error("must not call Cohere"); }) as unknown as typeof fetch;
    const ctx: Ctx = { log: [] };
    const r = await runAgent({ system: "sys", task: "task", tools, ctx, planner: scripted });
    assert.equal(r.planner, "scripted");
    assert.deepEqual(ctx.log, ["look:scripted", "propose:fallback"]);
  }));
