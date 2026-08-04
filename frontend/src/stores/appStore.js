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
  // Pinia store 负责统一存前端全局状态。
  //
  // 你可以把这里理解成“页面内存里的总仓库”：
  // - state：原始状态
  // - getters：派生状态，思想上类似 computed
  // - actions：更新状态的方法
  state: () => ({
    bootstrapping: true,

    // 登录状态。
    auth: { ...DEFAULT_AUTH },

    // 当前会话完整状态。
    // 问答历史、面试历史、简历、分数、报告等都放这里。
    candidate: null,

    weather: { ...DEFAULT_WEATHER },
    meta: { ...DEFAULT_META },

    langsmith: { ...DEFAULT_LANGSMITH },
    langsmithStatus: "",

    historyRecords: [],
    selectedHistoryRecord: DEFAULT_HISTORY_DETAIL,
    workspace: { ...DEFAULT_WORKSPACE },

    authMode: "login",
    loginForm: { ...DEFAULT_LOGIN_FORM },
    registerForm: { ...DEFAULT_REGISTER_FORM },

    mode: MODES.QA,
    selectedRole: "通用技术岗位",
    knowledgeFiles: [],
    resumeFile: null,
    qaInput: "",
    interviewInput: "",
    loadingAction: "",
    progressMessage: "",

    // typingState 用来记录当前是否处于流式回复中，
    // 以及这条流式请求的 AbortController。
    typingState: null,
    stopRequested: false,
    errorMessage: "",
    currentRunId: "",
    agentEvents: [],
    currentCitations: [],

    // 主题模式保存到 localStorage，页面刷新后还能记住。
    themeMode:
      (typeof window !== "undefined" && window.localStorage.getItem("interview-theme-mode")) || THEME_MODES.SERIOUS,
  }),
  getters: {
    // getters 可以理解成基于 state 推导出来的“好用结果”。
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

    // 统一抽象出“当前聊天历史”，让展示组件少关心业务分支。
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
      return Boolean(hasLastUser && lastAssistant?.role === "assistant" && lastAssistant.status !== MESSAGE_STATUS.GENERATING);
    },
  },
  actions: {
    // 统一的同步写状态方法。
    // 好处是页面层不直接乱改深层对象，后面排查和扩展会更清晰。
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
    setRoleOptions(roleOptions) {
      const nextOptions = Array.isArray(roleOptions) ? roleOptions.filter(Boolean) : [];
      this.meta = {
        ...this.meta,
        role_options: nextOptions,
      };
      if (nextOptions.length && !nextOptions.includes(this.selectedRole)) {
        this.selectedRole = nextOptions[0];
      }
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
    beginAgentRun(runId) {
      this.currentRunId = runId || "";
      this.agentEvents = [];
      this.currentCitations = [];
    },
    recordAgentEvent(event) {
      if (!event?.type) return;
      if (event.run_id && this.currentRunId && event.run_id !== this.currentRunId) return;
      if (event.run_id && !this.currentRunId) this.currentRunId = event.run_id;
      const key = `${event.run_id || ""}:${event.sequence || ""}:${event.type}:${event.node || ""}`;
      if (!this.agentEvents.some((item) => item.__key === key)) {
        this.agentEvents = [...this.agentEvents, { ...event, __key: key }].slice(-100);
      }
    },
    setCurrentCitations(citations) {
      this.currentCitations = Array.isArray(citations) ? citations : [];
    },
    setThemeMode(mode) {
      this.themeMode = mode;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("interview-theme-mode", mode);
      }
    },

    // bootstrap 完成后，后端会返回一大包初始化数据。
    // 这里统一把它灌进前端 store。
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
      this.currentRunId = "";
      this.agentEvents = [];
      this.currentCitations = [];
    },

    resetLoginForm() {
      this.loginForm = { ...DEFAULT_LOGIN_FORM };
    },

    resetRegisterForm() {
      this.registerForm = { ...DEFAULT_REGISTER_FORM };
    },

    // 流式渲染时，前端会不断改写最后一条 assistant 消息。
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
