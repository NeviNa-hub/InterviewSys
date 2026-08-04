import { defineStore } from "pinia";
import { apiGet, apiPatch, apiPost } from "../api/client.js";

// 管理端使用独立 Store，避免候选人聊天状态和后台统计状态相互污染。
export const usePlatformStore = defineStore("platform", {
  state: () => ({
    summary: null,
    users: [],
    organizations: [],
    runs: [],
    interviewTasks: [],
    reports: [],
    metrics: [],
    charts: {
      run_status: [],
      latency_trend: [],
      score_trend: [],
      role_distribution: [],
      template_roles: [],
      question_dimensions: [],
    },
    configuration: { templates: [], questions: [], documents: [], prompts: [], models: [] },
    loading: false,
    error: "",
  }),
  actions: {
    async loadDashboard() {
      this.loading = true;
      this.error = "";
      try {
        const [dashboard, charts, users, organizations, runs, evaluations, configuration, tasks, reports] = await Promise.all([
          apiGet("/api/platform/dashboard"),
          apiGet("/api/platform/charts"),
          apiGet("/api/platform/users"),
          apiGet("/api/platform/organizations"),
          apiGet("/api/platform/agent-runs"),
          apiGet("/api/platform/evaluations"),
          apiGet("/api/platform/configuration"),
          apiGet("/api/platform/interview-tasks"),
          apiGet("/api/platform/reports"),
        ]);
        this.summary = dashboard.summary;
        this.charts = charts.charts || this.charts;
        this.users = users.users || [];
        this.organizations = organizations.organizations || [];
        this.runs = runs.runs || [];
        this.metrics = evaluations.metrics || [];
        this.configuration = configuration;
        this.interviewTasks = tasks.tasks || [];
        this.reports = reports.reports || [];
      } catch (error) {
        this.error = error.message || "管理台数据加载失败。";
      } finally {
        this.loading = false;
      }
    },
    async createOrganization(name) {
      await apiPost("/api/platform/organizations", { name });
      await this.loadDashboard();
    },
    async updateRole(userId, role, organizationId) {
      await apiPatch(`/api/platform/users/${userId}/role`, {
        role,
        organization_id: organizationId || null,
      });
      await this.loadDashboard();
    },
    async createTemplate(payload) {
      await apiPost("/api/platform/templates", payload);
      await this.loadDashboard();
    },
    async createQuestion(payload) {
      await apiPost("/api/platform/questions", payload);
      await this.loadDashboard();
    },
    async createPrompt(payload) {
      await apiPost("/api/platform/prompts", payload);
      await this.loadDashboard();
    },
  },
});
