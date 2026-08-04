import axios from "axios";

// API_BASE 支持两种注入方式：
// 1. Vite 环境变量 `VITE_APP_API_BASE_URL`
// 2. 页面运行时注入的 `window.__APP_API_BASE_URL__`
//
// 这样做的好处是本地开发和部署环境都能灵活切换接口地址。
const explicitApiBase =
  (typeof window !== "undefined" && window.__APP_API_BASE_URL__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_API_BASE_URL) ||
  "";

function resolveDefaultApiBase() {
  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, port } = window.location;

  // 如果前端页面本身就是被 FastAPI 直接托管的，就走同源请求。
  if (port === "8080" || port === "8000") {
    return "";
  }

  // 本地开发时，如果前端跑在 Vite 端口上，就默认把请求打到 8080。
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//127.0.0.1:8080`;
  }

  return "";
}

export const API_BASE = String(explicitApiBase || resolveDefaultApiBase()).replace(/\/$/, "");

// 普通接口统一走 axios：
// - 自动拼接 baseURL
// - 自动控制超时
// - 统一错误处理
// - 自动携带 Cookie
const request = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  withCredentials: true,
});

request.interceptors.response.use(
  (response) => response,
  (error) => {
    // FastAPI 的错误通常会放在 detail 字段里，这里统一提取出来。
    const detail = error?.response?.data?.detail;
    throw new Error(detail || error.message || "请求失败，请稍后重试。");
  },
);

// GET：读取数据，比如 bootstrap、历史记录列表、历史详情。
export async function apiGet(path) {
  const response = await request.get(path);
  return response.data;
}

// POST + JSON：适合登录、注册、创建记录、切换状态等标准接口。
export async function apiPost(path, body) {
  const response = await request.post(path, body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function apiPatch(path, body) {
  const response = await request.patch(path, body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function apiDelete(path) {
  const response = await request.delete(path);
  return response.data;
}

// FormData：浏览器官方提供的文件上传数据结构。
// 例如：
// const formData = new FormData()
// formData.append("file", file)
// 然后交给后端作为 multipart/form-data 解析。
export async function apiFormPost(path, formData) {
  const response = await request.post(path, formData);
  return response.data;
}

// 流式请求保留 fetch。
// 原因是 fetch 更适合直接读取 ReadableStream，
// 后面可以通过 response.body.getReader() 一段一段拿后端数据。
export async function apiStreamPost(path, body, signal) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "流式请求失败，请稍后重试。");
  }

  return response;
}
