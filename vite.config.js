import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { demoMiddleware } from "./mock-server/demo.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const demo = mode === "development" || mode === "demo";
  const target = env.INTERVIEW_API_TARGET;
  if (mode === "server" && !target) throw new Error("请在 .env.server.local 配置 INTERVIEW_API_TARGET（后端服务器地址）");
  return {
    plugins: [vue(), ...(demo ? [{
      name: "interview-demo",
      configureServer(server) { server.middlewares.use(demoMiddleware()); },
      configurePreviewServer(server) { server.middlewares.use(demoMiddleware()); },
    }] : [])],
    define: { "import.meta.env.VITE_INTERVIEW_DEMO": JSON.stringify(demo) },
    server: { host: demo ? "127.0.0.1" : "localhost", port: 5173,
      proxy: !demo && target ? { "/api": { target, changeOrigin: true, cookieDomainRewrite: "" } } : undefined },
  };
});

