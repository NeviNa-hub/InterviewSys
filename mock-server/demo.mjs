import { randomUUID } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";

const conversation = (name = "新会话") => ({ id: randomUUID(), name, preferred_mode: "qa" });
const project = (name = "面试准备") => ({ id: randomUUID(), name, conversations: [conversation()] });
const candidate = () => ({ qa_history: [], interview_history: [], interview_state: {}, conversation_preferred_mode: "qa" });
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

function newSession() {
  const first = project();
  return {
    user: { id: 1, role: "admin", display_name: "演示用户", email: "demo@example.test" },
    workspace: { projects: [first], active_project_id: first.id, active_conversation_id: first.conversations[0].id, onboarding_completed: false },
    candidates: {}, records: [], runs: [], organizations: [], roles: ["前端开发", "后端开发", "数据分析"],
    configuration: { templates: [], questions: [], prompts: [], documents: [], models: [] },
  };
}

function editWorkspace(w, method, path, data) {
  const [, kind, id, action] = path.split("/");
  const projects = w.projects;
  const pick = (p, c = p.conversations[0]) => {
    w.active_project_id = p.id;
    w.active_conversation_id = c.id;
  };
  if (kind === "onboarding") { w.onboarding_completed = data.completed; return; }
  if (kind === "projects" && !id) {
    const p = project(data.name); projects.push(p); pick(p); return;
  }
  const p = projects.find(item => kind === "projects" ? item.id === id : item.conversations.some(c => c.id === id));
  if (!p) fail(404, "项目或会话不存在");
  const item = kind === "projects" ? p : p.conversations.find(c => c.id === id);
  if (action === "conversations") {
    const c = conversation(data.name); p.conversations.push(c); pick(p, c);
  } else if (action === "activate") pick(p, kind === "projects" ? undefined : item);
  else if (action === "pin") item.pinned = !item.pinned;
  else if (action === "mode") item.preferred_mode = data.preferred_mode;
  else if (method === "PUT") item.name = data.name;
  else if (method === "DELETE") {
    const list = kind === "projects" ? projects : p.conversations;
    list.splice(list.indexOf(item), 1);
    if (!list.length) list.push(kind === "projects" ? project() : conversation());
    if (w.active_project_id === id || w.active_conversation_id === id) pick(kind === "projects" ? projects[0] : p);
  } else fail(404, "操作不存在");
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024 * 1024) fail(413, "演示文件最大 16 MB");
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    const form = await new Response(bytes, { headers: { "Content-Type": req.headers["content-type"] } }).formData();
    return { names: [...form.values()].filter(v => typeof v.name === "string").map(v => v.name) };
  }
  return bytes.length ? JSON.parse(bytes.toString()) : {};
}

async function dispatch(path, method, data, s, res) {
  const w = s.workspace;
  const current = () => {
    const c = s.candidates[w.active_conversation_id] ??= candidate();
    c.conversation_preferred_mode = w.projects.flatMap(p => p.conversations).find(v => v.id === w.active_conversation_id)?.preferred_mode || "qa";
    return c;
  };
  const bootstrap = () => ({ auth: { authenticated: !!s.user, user: s.user }, workspace: w, candidate: s.user ? current() : null, history_records: s.records, meta: { role_options: s.roles, qa: {}, interview: {}, history: {} }, langsmith: s.tracing });
  if (path === "bootstrap") return bootstrap();
  if (path === "auth/logout") { Object.assign(s, newSession(), { user: null }); return {}; }
  if (path === "auth/login" || path === "auth/register") {
    s.user = { id: 1, role: "admin", email: data.email, display_name: data.display_name || "演示用户" };
    return bootstrap();
  }
  if (!s.user) fail(401, "请进入演示账户");
  if (path.startsWith("workspace/")) { editWorkspace(w, method, path, data); return bootstrap(); }
  const c = current();
  if (path === "roles") return { role_options: s.roles };
  if (path === "candidate/load") return bootstrap();
  if (path === "langsmith/config") return s.tracing = { enabled: data.enabled, project: data.project, status_message: "已更新演示配置" };
  if (path === "knowledge/import") {
    data.names.forEach(name => s.configuration.documents.push({ id: randomUUID(), filename: name }));
    return { count: data.names.length, names: data.names };
  }
  if (path.startsWith("resume/")) {
    c.resume_filename = data.names?.[0] || ""; c.resume_text = c.resume_filename ? "模拟简历" : "";
  } else if (path === "qa/clear") c.qa_history = [];
  else if (path === "interview/start") {
    Object.assign(c, { interview_started: true, interview_finished: false, interview_state: { target_role: data.role }, interview_report: "", interview_report_file: "", interview_history: [{ role: "assistant", content: "请结合你的项目，介绍一次技术选型。" }] });
  } else if (path === "interview/end") { c.interview_finished = true; c.interview_score = 80; }
  else if (path === "interview/report") {
    c.interview_report = "模拟面试报告：建议补充方案对比、指标和复盘。"; c.interview_report_file = "demo.md"; c.interview_score = 80;
    s.records.unshift({ id: randomUUID(), role_name: c.interview_state.target_role, score: 80, created_at: new Date().toISOString(), report_text: c.interview_report, history: structuredClone(c.interview_history), snapshot: structuredClone(c) });
  } else if (path.endsWith("/download")) {
    const text = path.startsWith("history/") ? s.records.find(r => r.id === path.split("/")[2])?.report_text : c.interview_report;
    if (!text) fail(404, "尚未生成报告");
    res.writeHead(200, { "Content-Disposition": 'attachment; filename="interview.md"', "Content-Type": "text/markdown; charset=utf-8" }); res.end(text); return;
  } else if (path.startsWith("history/interviews")) {
    const [, , id, action] = path.split("/");
    if (!id) return { records: s.records };
    const record = s.records.find(r => r.id === id);
    if (!record) fail(404, "记录不存在");
    if (action === "restore") Object.assign(c, structuredClone(record.snapshot));
    else return { record };
  } else if (path.endsWith("/stream")) {
    const qa = path.startsWith("qa/");
    const history = qa ? c.qa_history : c.interview_history;
    if (data.message) history.push({ role: "user", content: data.message });
    else if (history.at(-1)?.role === "assistant") history.pop();
    const reply = qa ? "可以先说明问题的背景，再给出方案与取舍，最后用一个指标说明效果。" : "你提到了方案选择。请具体说明如何验证它在高并发下的效果？";
    const run = { id: randomUUID(), status: "running" }; s.runs.unshift(run);
    res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" });
    const emit = event => res.write(JSON.stringify(event) + "\n");
    emit({ type: "run_started", run_id: run.id });
    let output = "";
    for (const chunk of reply.match(/.{1,4}/gu)) {
      await pause(75);
      if (res.destroyed || run.status === "cancelled") break;
      output += chunk; emit({ type: "token", content: chunk });
    }
    history.push({ role: "assistant", content: output });
    run.status = output === reply ? "completed" : "cancelled";
    if (!res.destroyed) { emit({ type: "done", candidate: c, reply: output }); res.end(); }
    return;
  } else if (path.startsWith("interview/runs/")) {
    if (!s.runs.some(run => run.id === path.split("/")[2] && run.status === "completed")) fail(409, "运行尚未完成");
  } else if (path.startsWith("platform/")) {
    const [, key, id, action] = path.split("/");
    if (action === "cancel") { const run = s.runs.find(r => r.id === id); if (run) run.status = "cancelled"; return {}; }
    if (action === "role") { Object.assign(s.user, { role: data.role, organization_id: data.organization_id }); return {}; }
    if (method === "POST") {
      const list = key === "organizations" ? s.organizations : s.configuration[key];
      if (!Array.isArray(list)) fail(404, "未知配置");
      list.push({ ...data, id: randomUUID() });
      if (key === "templates" && data.role_name && !s.roles.includes(data.role_name)) s.roles.push(data.role_name);
      return {};
    }
    const tables = { configuration: s.configuration, users: { users: [s.user] }, organizations: { organizations: s.organizations }, "agent-runs": { runs: s.runs }, reports: { reports: s.records }, evaluations: { metrics: [] }, "interview-tasks": { tasks: [] }, charts: { charts: { run_status: [], latency_trend: [], score_trend: [], role_distribution: [], template_roles: [], question_dimensions: [] } }, dashboard: { summary: { users: 1, organizations: s.organizations.length, reports: s.records.length } } };
    if (tables[key]) return tables[key];
    fail(404, "未知管理接口");
  } else fail(404, "未知演示接口");
  return { candidate: c };
}

export function demoMiddleware() {
  const sessions = new Map();
  return async (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) return next();
    let id = /(?:^|; )interview_demo=([^;]+)/.exec(req.headers.cookie || "")?.[1];
    if (!sessions.has(id)) {
      id = randomUUID(); sessions.set(id, newSession());
      res.setHeader("Set-Cookie", "interview_demo=" + id + "; Path=/; HttpOnly; SameSite=Lax");
    }
    try {
      const result = await dispatch(url.pathname.slice(5), req.method, await readBody(req), sessions.get(id), res);
      if (!res.writableEnded && !res.destroyed) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(result)); }
    } catch (error) {
      if (res.headersSent) return res.end();
      res.writeHead(error.status || 400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ detail: error.message }));
    }
  };
}

