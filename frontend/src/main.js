import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router/index.js";
import "./styles.css";

// 前端启动入口：
// 1. Vite 会先执行这个文件。
// 2. createApp(App) 创建 Vue 应用实例。
// 3. app.use(createPinia()) 注册全局状态管理。
// 4. mount("#app") 把整个应用挂到 index.html 里的 #app 节点。
const app = createApp(App);

// Pinia 作为当前项目的正式状态管理层：
// 统一承接登录态、模式、当前候选人工作态、历史记录和界面加载状态。
app.use(createPinia());
app.use(router);
app.mount("#app");
