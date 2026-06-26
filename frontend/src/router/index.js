import { createRouter, createWebHistory } from "vue-router";

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
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
