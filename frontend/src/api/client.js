import axios from "axios";

// API_BASE 支持两种注入方式：
// 1. 构建时环境变量 import.meta.env.VITE_APP_API_BASE_URL
// 2. 运行时 window.__APP_API_BASE_URL__
// 这样后端托管静态资源或前后端分离部署时都能适配。
const explicitApiBase =
  (typeof window !== "undefined" && window.__APP_API_BASE_URL__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_API_BASE_URL) ||
  "";

function resolveDefaultApiBase() {
  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, port } = window.location;

  // 如果前端本身已经由 8000 端口的 FastAPI 托管，就直接走同源。
  if (port === "8080" || port === "8000") {
    return "";
  }

  // 开发时如果前端跑在其他端口（例如 5173 / 8080），但又没有显式配置 API_BASE，
  // 默认把接口请求打到本地 FastAPI，避免误打到静态资源服务器上。
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//127.0.0.1:8080`;
  }

  return "";
}

export const API_BASE = String(explicitApiBase || resolveDefaultApiBase()).replace(/\/$/, "");

// 普通请求统一走 axios：
// - 自动处理 baseURL
// - 统一超时
// - withCredentials=true 让浏览器自动携带 Cookie
//   当前项目的登录态就是通过 Cookie 维持的
const request = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  withCredentials: true,
});

request.interceptors.response.use(
  (response) => response,
  (error) => {
    // 后端 FastAPI 通常会把可读错误信息放在 detail 字段里，
    // 这里统一抽出来，避免每个页面重复写错误解析逻辑。
    const detail = error?.response?.data?.detail;
    throw new Error(detail || error.message || "请求失败，请稍后重试。");
  },
);

// GET：读取数据，例如初始化信息、历史记录列表、历史记录详情。
export async function apiGet(path) {
  const response = await request.get(path);
  return response.data;
}

// POST + JSON：适合登录、注册、开始面试、结束面试等标准业务接口。
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

// FormData：适合文件上传。
// 浏览器会自动把请求编码成 multipart/form-data。
export async function apiFormPost(path, formData) {
  const response = await request.post(path, formData);
  return response.data;
}

// 流式请求保留 fetch：
// 原因是当前浏览器原生 fetch 更适合拿到 ReadableStream，
// 前端后续可以通过 response.body.getReader() 持续读取后端返回的数据块。
//
// 当前项目的问答流式回复、模拟面试流式回复就是这样做的。
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
    // 流式接口失败时，尽量把 FastAPI 返回的 detail 也交给上层处理。
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "流式请求失败，请稍后重试。");
  }

  return response;
}
