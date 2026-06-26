import { defineStore } from "pinia";
import {
  DEFAULT_AUTH,
  DEFAULT_HISTORY_DETAIL,
  DEFAULT_LANGSMITH,
  DEFAULT_LOGIN_FORM,
  DEFAULT_META,
  DEFAULT_REGISTER_FORM,
  DEFAULT_WEATHER,
  DEFAULT_WORKSPACE,
  MESSAGE_STATUS,
  MODES,
  THEME_MODES,
} from "../constants/app.js";
import { cloneValue } from "../utils/clone.js";

export const useAppStore = defineStore("app", {
  // state 只负责“存数据”。
  // 真正的请求、流式处理、重试逻辑都放在 composable 里。
  state: () => ({
    // 页面初始化阶段控制位。
    bootstrapping: true,

    // 认证信息：是否已登录、当前用户是谁。
    auth: { ...DEFAULT_AUTH },

    // 当前候选人的完整工作态：
    // 后端会把问答历史、面试历史、简历、分数、报告等都集中返回到这里。
    candidate: null,

    // 右上角天气模块。
    weather: { ...DEFAULT_WEATHER },

    // 页面文案配置。
    // 例如问答模式欢迎语、面试模式说明、岗位选项等。
    meta: { ...DEFAULT_META },

    // LangSmith 调试配置。
    langsmith: { ...DEFAULT_LANGSMITH },
    langsmithStatus: "",

    // 历史面试列表和当前展开的历史详情。
    historyRecords: [],
    selectedHistoryRecord: DEFAULT_HISTORY_DETAIL,
    workspace: { ...DEFAULT_WORKSPACE },

    // 登录页状态。
    authMode: "login",
    loginForm: { ...DEFAULT_LOGIN_FORM },
    registerForm: { ...DEFAULT_REGISTER_FORM },

    // 当前工作台模式和输入态。
    mode: MODES.QA,
    selectedRole: "通用技术岗位",
    knowledgeFiles: [],
    resumeFile: null,
    qaInput: "",
    interviewInput: "",
    loadingAction: "",
    progressMessage: "",
    typingState: null,
    stopRequested: false,
    errorMessage: "",
    themeMode:
      (typeof window !== "undefined" && window.localStorage.getItem("interview-theme-mode")) || THEME_MODES.SERIOUS,
  }),
  getters: {
    // getters 可以理解为“派生状态”。
    // 它们根据已有 state 计算出页面更关心的结果。
    isTyping: (state) => Boolean(state.typingState),
    activeModeMeta(state) {
      if (state.mode === MODES.QA) {
        return state.meta.qa;
      }
      if (state.mode === MODES.INTERVIEW) {
        return state.meta.interview;
      }
      return state.meta.history;
    },
    // currentHistory 把不同模式下要展示的消息统一抽象成一个“当前消息列表”，
    // 这样 ChatHistory 组件不需要关心自己此刻是在问答还是面试。
    currentHistory(state) {
      if (state.mode === MODES.QA) {
        return state.candidate?.qa_history || [];
      }
      if (state.mode === MODES.INTERVIEW) {
        return state.candidate?.interview_history || [];
      }
      return [];
    },
    showQaWelcome(state) {
      return state.mode === MODES.QA && (state.candidate?.qa_history || []).length === 0;
    },
    showInterviewWelcome(state) {
      return (
        state.mode === MODES.INTERVIEW &&
        (state.candidate?.interview_history || []).length === 0 &&
        !state.candidate?.interview_started
      );
    },
    activeProject(state) {
      return (state.workspace.projects || []).find((item) => item.id === state.workspace.active_project_id) || null;
    },
    activeConversation() {
      return this.activeProject?.conversations?.find((item) => item.id === this.workspace.active_conversation_id) || null;
    },
    canResumeCurrentReply() {
      const history = this.currentHistory;
      return Boolean(history.length && history[history.length - 1]?.status === MESSAGE_STATUS.INTERRUPTED);
    },
    canRetryCurrentReply() {
      const history = this.currentHistory;
      if (!history.length) {
        return false;
      }
      const lastAssistant = history[history.length - 1];
      const hasLastUser = [...history].reverse().some((item) => item.role === "user");
      return Boolean(hasLastUser && lastAssistant?.role === "assistant");
    },
  },
  actions: {
    // 以下 setXxx 都是“同步状态写入动作”。
    // 好处是页面组件不直接改深层数据，后面如果要加埋点、校验、日志会更容易。
    setLoadingAction(action) {
      this.loadingAction = action;
    },
    setErrorMessage(message) {
      this.errorMessage = message;
    },
    setProgressMessage(message) {
      this.progressMessage = message;
    },
    setWorkspace(payload) {
      this.workspace = payload || { ...DEFAULT_WORKSPACE };
    },
    setMode(mode) {
      this.mode = mode;
    },
    setAuthMode(mode) {
      this.authMode = mode;
    },
    setLoginForm(payload) {
      this.loginForm = payload;
    },
    setRegisterForm(payload) {
      this.registerForm = payload;
    },
    setSelectedRole(role) {
      this.selectedRole = role;
    },
    setKnowledgeFiles(files) {
      this.knowledgeFiles = files;
    },
    setResumeFile(file) {
      this.resumeFile = file;
    },
    setQaInput(value) {
      this.qaInput = value;
    },
    setInterviewInput(value) {
      this.interviewInput = value;
    },
    setLangsmith(payload) {
      this.langsmith = payload;
    },
    setSelectedHistoryRecord(record) {
      this.selectedHistoryRecord = record;
    },
    setTypingState(payload) {
      this.typingState = payload;
    },
    setStopRequested(value) {
      this.stopRequested = value;
    },
    setThemeMode(mode) {
      this.themeMode = mode;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("interview-theme-mode", mode);
      }
    },
    // bootstrap 后端返回的数据会在这里一次性灌入前端状态。
    // 这一步相当于前端和后端完成一次“全局状态同步”。
    applyBootstrapPayload(data) {
      this.auth = data.auth || { ...DEFAULT_AUTH };
      this.candidate = data.candidate || null;
      this.weather = data.weather || { ...DEFAULT_WEATHER };
      this.meta = data.meta || { ...DEFAULT_META };
      this.langsmith = {
        enabled: Boolean(data.langsmith?.enabled),
        api_key: data.langsmith?.api_key || "",
        project: data.langsmith?.project || "interview-coach-debug",
      };
      this.langsmithStatus = data.langsmith?.enabled
        ? `LangSmith 调试已开启，当前项目：${data.langsmith.project || "interview-coach-debug"}`
        : "LangSmith 调试当前未开启。";
      this.historyRecords = data.history_records || [];
      this.workspace = data.workspace || { ...DEFAULT_WORKSPACE };
      this.selectedRole = data.candidate?.interview_state?.target_role || data.meta?.role_options?.[0] || "通用技术岗位";
      if (!this.auth.authenticated) {
        this.mode = MODES.QA;
      } else if (data.candidate?.conversation_preferred_mode) {
        this.mode = data.candidate.conversation_preferred_mode;
      }
    },
    // 退出登录后，前端要把和用户强相关的状态全部清掉，
    // 否则会把上一个用户的临时数据残留在页面上。
    resetAfterLogout() {
      this.auth = { ...DEFAULT_AUTH };
      this.candidate = null;
      this.historyRecords = [];
      this.selectedHistoryRecord = DEFAULT_HISTORY_DETAIL;
      this.workspace = { ...DEFAULT_WORKSPACE };
      this.mode = MODES.QA;
      this.loginForm = { ...DEFAULT_LOGIN_FORM };
      this.registerForm = { ...DEFAULT_REGISTER_FORM };
      this.errorMessage = "";
      this.progressMessage = "";
      this.loadingAction = "";
      this.typingState = null;
      this.stopRequested = false;
    },
    resetLoginForm() {
      this.loginForm = { ...DEFAULT_LOGIN_FORM };
    },
    resetRegisterForm() {
      this.registerForm = { ...DEFAULT_REGISTER_FORM };
    },
    // updateHistoryMessage 是流式消息更新的关键辅助函数：
    // 当后端分片返回 chunk 时，前端会不断把“最后一条 assistant 消息”改写成最新文本。
    // 这里先做深拷贝，是为了避免直接改原对象时出现响应式追踪不稳定的问题。
    updateHistoryMessage(historyKey, messageIndex, content, status) {
      if (!this.candidate) {
        return;
      }
      const nextCandidate = cloneValue(this.candidate);
      const history = nextCandidate[historyKey];
      if (!history?.[messageIndex]) {
        return;
      }
      history[messageIndex].content = content;
      history[messageIndex].status = status;
      this.candidate = nextCandidate;
    },
  },
});
