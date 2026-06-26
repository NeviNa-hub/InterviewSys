import { toRaw } from "vue";

function sanitizeForJson(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return value;
  }

  if (valueType === "function" || valueType === "symbol") {
    return undefined;
  }

  if (valueType !== "object") {
    return value;
  }

  const raw = toRaw(value);

  // 避免 structuredClone / JSON 在循环引用上直接报错。
  if (seen.has(raw)) {
    return undefined;
  }
  seen.add(raw);

  // Window、DOM 节点、File、AbortController 这类对象不适合作为业务状态深拷贝。
  // 对当前项目来说，candidate / history 等真正需要克隆的数据本来就应该是纯 JSON 数据。
  if (typeof Window !== "undefined" && raw instanceof Window) {
    return undefined;
  }
  if (typeof Element !== "undefined" && raw instanceof Element) {
    return undefined;
  }
  if (typeof File !== "undefined" && raw instanceof File) {
    return {
      name: raw.name,
      size: raw.size,
      type: raw.type,
      lastModified: raw.lastModified,
    };
  }

  if (Array.isArray(raw)) {
    return raw
      .map((item) => sanitizeForJson(item, seen))
      .filter((item) => item !== undefined);
  }

  const result = {};
  for (const [key, item] of Object.entries(raw)) {
    const sanitized = sanitizeForJson(item, seen);
    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }
  return result;
}

export function cloneValue(value) {
  // 这里优先尝试 structuredClone，
  // 但如果遇到 Window / DOM / File / Proxy 等不可直接克隆对象，
  // 就自动退化成“先清洗成纯数据，再做 JSON 深拷贝”。
  const raw = toRaw(value);

  if (typeof structuredClone === "function") {
    try {
      return structuredClone(raw);
    } catch (_) {
      // 忽略后走兜底分支
    }
  }

  return JSON.parse(JSON.stringify(sanitizeForJson(raw)));
}
