import axios from "axios";

/*
 * 前端接口层总览
 * ---------------------------------------------------------------------------
 * 这个文件是所有普通 HTTP 请求的统一入口，页面组件不要到处直接写 fetch/axios。
 *
 * 为什么要单独封装？
 * 1. 统一 baseURL：本地开发、服务器部署时接口地址可能不同。
 * 2. 统一携带 Cookie：后端使用 Cookie Session 鉴权，前端请求必须带上 Cookie。
 * 3. 统一错误处理：FastAPI 报错通常在 detail 字段里，这里提前整理成 Error。
 * 4. 区分普通请求和流式请求：普通 JSON 用 axios，聊天流式响应用 fetch。
 *
 * 面试里可以这样讲：
 * “我把接口请求统一封装在 api 层，页面只调用 apiGet/apiPost 这些方法，
 * 这样如果后端地址、错误处理、登录态携带方式变化，只需要改这一处。”
 */

// API_BASE 支持两种注入方式：
// 1. Vite 环境变量 `VITE_APP_API_BASE_URL`
// 2. 页面运行时注入的 `window.__APP_API_BASE_URL__`
//
// 这样做的好处是本地开发和部署环境都能灵活切换接口地址。
const explicitApiBase =
  (typeof window !== "undefined" && window.__APP_API_BASE_URL__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_API_BASE_URL) ||
  "";

export const API_BASE = String(explicitApiBase).replace(/\/$/, "");

// 普通接口统一走 axios：
// - 自动拼接 baseURL
// - 自动控制超时
// - 统一错误处理
// - 自动携带 Cookie
const request = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  // withCredentials=true 表示跨端口请求时也携带 Cookie。
  // 当前项目登录态在后端 HttpOnly Cookie 里，不是 localStorage token。
  withCredentials: true,
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // FastAPI 的错误通常会放在 detail 字段里，这里统一提取出来。
    const detail = error?.response?.data?.detail;
    throw new Error(detail || error.message || "请求失败，请稍后重试。");
  },
);

export const apiUrl = (path) => {
  return API_BASE + path;
};

export const apiGet = (path) => {
  return request.get(path);
};

export const apiPost = (path, data) => {
  return request.post(path, data);
};

export const apiPut = (path, data) => {
  return request.put(path, data);
};

export const apiDelete = (path) => {
  return request.delete(path);
};

// 流式请求保留 fetch。
// 原因是 fetch 更适合直接读取 ReadableStream，
// 后面可以通过 response.body.getReader() 一段一段拿后端数据。
export async function apiStreamPost(path, body, signal) {
  /*
   * 真实流式请求为什么不用 axios？
   * -------------------------------------------------------------------------
   * 浏览器 fetch 原生暴露 response.body，也就是 ReadableStream。
   * 前端可以通过 getReader().read() 不断读取后端一点点 yield 出来的数据。
   *
   * signal 来自 AbortController：
   * - 用户点击“停止”时，前端调用 controller.abort()
   * - fetch 会抛出 AbortError
   * - composable 再把当前 assistant 消息标记为 interrupted
   */
  const response = await fetch(apiUrl(path), {
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
