import { createRouter, createWebHistory } from "vue-router";

// 当前项目的路由比较轻。
// URL 主要承担“页面入口”和“当前模式”这两个职责，
// 真正的大页面切换仍然在 App.vue 里按 mode 来控制。
const RouteStub = {
  template: "<div></div>",
};

const routes = [
  {
    path: "/",
    name: "landing",
    component: RouteStub,
  },
  {
    path: "/workspace/:mode(qa|interview|history)",
    name: "workspace",
    component: RouteStub,
    props: true,
  },
  {
    path: "/platform/:console(admin|interviewer)/:section(overview|runs|users|organizations|prompts|workspace|candidates|interviews|configuration|reports)?",
    name: "platform",
    component: RouteStub,
    meta: { roles: ["interviewer", "admin"] },
  },
  {
    path: "/platform/:section(overview|runs|users|organizations|interviews|configuration)?",
    redirect: "/platform/interviewer/workspace",
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

export const router = createRouter({
  // createWebHistory 使用浏览器原生 History API。
  // 这样 URL 更干净，不会带 #。
  history: createWebHistory(),
  routes,
});
