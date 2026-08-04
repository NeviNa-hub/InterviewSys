import { onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { apiDelete, apiFormPost, apiGet, apiPatch, apiPost, apiStreamPost } from "../api/client.js";
import {
  ERROR_MESSAGES,
  LOADING_ACTIONS,
  MESSAGE_STATUS,
  MODES,
  STREAM_ACTIONS,
  UI_TEXT,
} from "../constants/app.js";
import { useAppStore } from "../stores/appStore.js";
import { cloneValue } from "../utils/clone.js";
import { debounce } from "../utils/timing.js";

export function useInterviewApp() {
  // 这是前端最核心的业务编排层。
  //
  // 你可以把它理解成：
  // - store 负责“存状态”
  // - api/client 负责“发请求”
  // - 当前这个 composable 负责“把页面动作串成完整业务流程”
  //
  // 例如“发送一条问答消息”，不是简单调一个接口，而是：
  // 1. 读取输入框
  // 2. 做乐观更新
  // 3. 发起流式请求
  // 4. 持续更新消息
  // 5. 处理停止、重试、报错
  const appStore = useAppStore();
  const {
    bootstrapping,
    auth,
    candidate,
    weather,
    meta,
    langsmith,
    langsmithStatus,
    historyRecords,
    selectedHistoryRecord,
    workspace,
    authMode,
    loginForm,
    registerForm,
    mode,
    selectedRole,
    knowledgeFiles,
    resumeFile,
    qaInput,
    interviewInput,
    loadingAction,
    progressMessage,
    typingState,
    stopRequested,
    errorMessage,
    themeMode,
    isTyping,
    activeModeMeta,
    currentHistory,
    showQaWelcome,
    showInterviewWelcome,
    activeProject,
    activeConversation,
    canResumeCurrentReply,
    canRetryCurrentReply,
    currentRunId,
  } = storeToRefs(appStore);

  // 历史记录列表切换时不需要每次都立刻请求，先做一次轻量防抖。
  const debouncedHistoryLoader = debounce(() => {
    loadHistoryRecordsImmediate();
  }, 260);

  onBeforeUnmount(() => {
    // 页面销毁前，如果还在流式回复，就主动中断。
    typingState.value?.controller?.abort();
  });

  async function bootstrap() {
    bootstrapping.value = true;
    appStore.setErrorMessage("");
    try {
      // 前后端同时启动时，FastAPI 可能仍在加载 Python 依赖。
      // 首屏对网络错误做有限重试，避免只因后端慢几秒就直接显示失败页。
      let data = null;
      let lastError = null;
      for (let attempt = 0; attempt < 15; attempt += 1) {
        try {
          data = await apiGet("/api/bootstrap");
          break;
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      if (!data) {
        throw lastError || new Error("后端服务尚未启动。");
      }
      appStore.applyBootstrapPayload(data);
      await refreshRoleOptions({ silent: true });
      const pendingRunId = data.candidate?.pending_run_id;
      if (pendingRunId) {
        const recovered = await recoverCompletedInterviewRun(pendingRunId);
        if (recovered?.candidate) {
          candidate.value = recovered.candidate;
          appStore.setCurrentCitations(recovered.evidence || []);
        }
      }
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.BOOTSTRAP));
    } finally {
      bootstrapping.value = false;
    }
  }

  async function refreshBootstrapData() {
    try {
      const data = await apiGet("/api/bootstrap");
      appStore.applyBootstrapPayload(data);
      return data;
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.BOOTSTRAP));
      return null;
    }
  }

  async function refreshRoleOptions(options = {}) {
    const silent = Boolean(options.silent);
    try {
      const data = await apiGet("/api/roles");
      appStore.setRoleOptions(data.role_options || []);
      return data.role_options || [];
    } catch (error) {
      if (!silent) {
        appStore.setErrorMessage(normalizeErrorMessage(error, "刷新岗位配置失败。"));
      }
      return meta.value.role_options || [];
    }
  }

  function syncAppPayload(data, options = {}) {
    // 后端很多接口都会返回“最新的全局状态”。
    // 所以前端通常不是只改一个字段，而是把整包 payload 再同步回 store。
    appStore.applyBootstrapPayload(data);
    if (options.mode) {
      appStore.setMode(options.mode);
    }
  }

  async function login() {
    appStore.setLoadingAction(LOADING_ACTIONS.LOGIN);
    appStore.setErrorMessage("");
    try {
      const data = await apiPost("/api/auth/login", loginForm.value);
      syncAppPayload(data);
      await refreshRoleOptions({ silent: true });
      appStore.setMode(MODES.QA);
      appStore.resetLoginForm();
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.LOGIN));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function register() {
    appStore.setLoadingAction(LOADING_ACTIONS.REGISTER);
    appStore.setErrorMessage("");
    try {
      const data = await apiPost("/api/auth/register", registerForm.value);
      syncAppPayload(data);
      await refreshRoleOptions({ silent: true });
      appStore.setMode(MODES.QA);
      appStore.resetRegisterForm();
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.REGISTER));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function logout() {
    appStore.setLoadingAction(LOADING_ACTIONS.LOGOUT);
    appStore.setErrorMessage("");
    try {
      await apiPost("/api/auth/logout", {});
      appStore.resetAfterLogout();
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.LOGOUT));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function importKnowledge() {
    // 典型文件上传链路：File[] -> FormData -> POST -> 后端解析入库
    appStore.setLoadingAction(LOADING_ACTIONS.KNOWLEDGE);
    appStore.setErrorMessage("");
    try {
      const formData = new FormData();
      knowledgeFiles.value.forEach((file) => formData.append("files", file));
      const result = await apiFormPost("/api/knowledge/import", formData);
      const namesText = result.names?.length ? `（${result.names.join("、")}）` : "";
      window.alert(result.message || `已导入 ${result.count || 0} 个文档${namesText}`);
      appStore.setKnowledgeFiles([]);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.KNOWLEDGE_IMPORT));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function saveLangSmith() {
    appStore.setLoadingAction(LOADING_ACTIONS.LANGSMITH);
    appStore.setErrorMessage("");
    try {
      const result = await apiPost("/api/langsmith/config", langsmith.value);
      appStore.setLangsmith({
        ...langsmith.value,
        enabled: result.enabled,
        project: result.project,
      });
      langsmithStatus.value = result.status_message;
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.LANGSMITH_SAVE));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function uploadResume(options = {}) {
    if (!resumeFile.value || !candidate.value) {
      return;
    }
    appStore.setLoadingAction(LOADING_ACTIONS.RESUME);
    appStore.setProgressMessage("正在分析简历...");
    appStore.setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("file", resumeFile.value);
      const result = await apiFormPost("/api/resume/upload", formData);
      candidate.value = result.candidate;
      appStore.setResumeFile(null);
      return result.candidate;
    } catch (error) {
      if (!options.silent) {
        appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.RESUME_UPLOAD));
      }
      throw error;
    } finally {
      appStore.setLoadingAction("");
      appStore.setProgressMessage("");
    }
  }

  async function clearResume() {
    if (!candidate.value) {
      return;
    }
    appStore.setLoadingAction(LOADING_ACTIONS.RESUME_CLEAR);
    appStore.setErrorMessage("");
    try {
      const result = await apiPost("/api/resume/clear", {});
      candidate.value = result.candidate;
      appStore.setResumeFile(null);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.RESUME_CLEAR));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function clearQaHistory() {
    if (!candidate.value) {
      return;
    }
    appStore.setLoadingAction(LOADING_ACTIONS.QA_CLEAR);
    appStore.setErrorMessage("");
    try {
      const result = await apiPost("/api/qa/clear", {});
      candidate.value = result.candidate;
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.QA_CLEAR));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function ensureCandidateReady() {
    // 页面刷新或切会话后，前端可能已经登录，但当前候选人状态还没同步回来。
    if (candidate.value || !auth.value.authenticated) {
      return candidate.value;
    }
    try {
      const data = await apiPost("/api/candidate/load", {});
      syncAppPayload(data);
      return candidate.value;
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "初始化当前会话状态失败。"));
      return null;
    }
  }

  async function startInterview() {
    await ensureCandidateReady();
    if (!candidate.value || isTyping.value) {
      return;
    }
    await refreshRoleOptions({ silent: true });
    appStore.setLoadingAction(LOADING_ACTIONS.INTERVIEW_START);
    appStore.setErrorMessage("");
    appStore.setProgressMessage(
      resumeFile.value || candidate.value.resume_text ? "正在分析简历..." : "正在生成首个问题..."
    );
    try {
      // 先在前端乐观清空上一轮结果，避免新一轮首题还没返回时，
      // 页面继续展示上一轮的得分、报告和“已结束”状态。
      const optimistic = cloneValue(candidate.value);
      optimistic.interview_history = [];
      optimistic.interview_questions = [];
      optimistic.interview_report = "";
      optimistic.interview_report_file = "";
      optimistic.latest_report_record_id = null;
      optimistic.interview_score = 0;
      optimistic.interview_finished = false;
      optimistic.interview_started = false;
      candidate.value = optimistic;

      if (resumeFile.value) {
        await uploadResume({ silent: true });
        const afterResumeUpload = cloneValue(candidate.value);
        afterResumeUpload.interview_history = [];
        afterResumeUpload.interview_questions = [];
        afterResumeUpload.interview_report = "";
        afterResumeUpload.interview_report_file = "";
        afterResumeUpload.latest_report_record_id = null;
        afterResumeUpload.interview_score = 0;
        afterResumeUpload.interview_finished = false;
        afterResumeUpload.interview_started = false;
        candidate.value = afterResumeUpload;
        appStore.setLoadingAction(LOADING_ACTIONS.INTERVIEW_START);
        appStore.setProgressMessage("正在生成首个问题...");
      }
      const result = await apiPost("/api/interview/start", { role: selectedRole.value });
      candidate.value = result.candidate;
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.INTERVIEW_START));
    } finally {
      appStore.setLoadingAction("");
      appStore.setProgressMessage("");
    }
  }

  async function endInterview() {
    if (!candidate.value) {
      return;
    }
    appStore.setLoadingAction(LOADING_ACTIONS.INTERVIEW_END);
    appStore.setErrorMessage("");
    try {
      const result = await apiPost("/api/interview/end", {});
      candidate.value = result.candidate;
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.INTERVIEW_END));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function generateReport() {
    if (!candidate.value) {
      return;
    }
    appStore.setLoadingAction(LOADING_ACTIONS.REPORT);
    appStore.setErrorMessage("");
    appStore.setProgressMessage("正在整理面试记录...");
    const timer = window.setTimeout(() => {
      appStore.setProgressMessage("正在生成报告...");
    }, 700);
    try {
      const result = await apiPost("/api/interview/report", {});
      candidate.value = result.candidate;
      await loadHistoryRecordsImmediate();
      appStore.setMode(MODES.INTERVIEW);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.REPORT));
    } finally {
      window.clearTimeout(timer);
      appStore.setLoadingAction("");
      appStore.setProgressMessage("");
    }
  }

  async function loadHistoryRecordsImmediate() {
    if (!auth.value.authenticated) {
      return;
    }
    appStore.setLoadingAction(LOADING_ACTIONS.HISTORY);
    appStore.setErrorMessage("");
    try {
      const result = await apiGet("/api/history/interviews");
      historyRecords.value = result.records || [];
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.HISTORY_LIST));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function completeOnboarding(completed = true) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiPost("/api/workspace/onboarding", { completed });
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "更新新手引导状态失败。"));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function createProject(name) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    appStore.setErrorMessage("");
    try {
      const data = await apiPost("/api/workspace/projects", { name });
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "创建项目失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function renameProject(projectId, name) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiPatch(`/api/workspace/projects/${projectId}`, { name });
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "重命名项目失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function activateProject(projectId) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiPost(`/api/workspace/projects/${projectId}/activate`, {});
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "切换项目失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function togglePinProject(projectId) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiPost(`/api/workspace/projects/${projectId}/pin`, {});
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "更新项目置顶状态失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function deleteProject(projectId) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiDelete(`/api/workspace/projects/${projectId}`);
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "删除项目失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function createConversation(projectId, name) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiPost(`/api/workspace/projects/${projectId}/conversations`, { name });
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "创建会话失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function renameConversation(conversationId, name) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiPatch(`/api/workspace/conversations/${conversationId}`, { name });
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "重命名会话失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function activateConversation(conversationId) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiPost(`/api/workspace/conversations/${conversationId}/activate`, {});
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "切换会话失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function togglePinConversation(conversationId) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiPost(`/api/workspace/conversations/${conversationId}/pin`, {});
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "更新会话置顶状态失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function updateConversationMode(conversationId, preferredMode) {
    try {
      const data = await apiPost(`/api/workspace/conversations/${conversationId}/mode`, { preferred_mode: preferredMode });
      syncAppPayload(data, { mode: preferredMode });
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "同步会话模式失败。"));
    }
  }

  async function deleteConversation(conversationId) {
    appStore.setLoadingAction(LOADING_ACTIONS.WORKSPACE);
    try {
      const data = await apiDelete(`/api/workspace/conversations/${conversationId}`);
      syncAppPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, "删除会话失败。"));
      throw error;
    } finally {
      appStore.setLoadingAction("");
    }
  }

  function loadHistoryRecords() {
    debouncedHistoryLoader();
  }

  async function openHistoryRecord(recordId) {
    appStore.setLoadingAction(LOADING_ACTIONS.HISTORY);
    appStore.setErrorMessage("");
    try {
      const result = await apiGet(`/api/history/interviews/${recordId}`);
      appStore.setSelectedHistoryRecord(result.record || null);
      appStore.setMode(MODES.HISTORY);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.HISTORY_DETAIL));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function restoreHistoryRecord(recordId) {
    appStore.setLoadingAction(LOADING_ACTIONS.HISTORY);
    appStore.setErrorMessage("");
    try {
      const result = await apiPost(`/api/history/interviews/${recordId}/restore`, {});
      candidate.value = result.candidate;
      appStore.setMode(MODES.INTERVIEW);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.HISTORY_RESTORE));
    } finally {
      appStore.setLoadingAction("");
    }
  }

  async function sendQaMessage() {
    await ensureCandidateReady();
    if (!candidate.value || !qaInput.value.trim() || isTyping.value) {
      return;
    }

    // 这里先做乐观更新：
    // 用户消息立刻显示，assistant 先插入一条“生成中”的占位消息。
    const message = qaInput.value.trim();
    qaInput.value = "";
    appStore.setErrorMessage("");

    const optimistic = cloneValue(candidate.value);
    optimistic.qa_history.push({ role: "user", content: message });
    optimistic.qa_history.push({
      role: "assistant",
      content: UI_TEXT.QA_PENDING_MESSAGE,
      status: MESSAGE_STATUS.GENERATING,
    });
    candidate.value = optimistic;

    await streamAssistantReply({
      path: "/api/qa/chat/stream",
      payload: { message, action: STREAM_ACTIONS.SEND },
      historyKey: "qa_history",
      assistantIndex: optimistic.qa_history.length - 1,
      pendingMessage: UI_TEXT.QA_PENDING_MESSAGE,
      fallbackErrorMessage: ERROR_MESSAGES.QA_STREAM,
      abortedMessage: "这次回答已被手动停止，你可以继续生成或重试本轮回答。",
    });
  }

  async function sendInterviewMessage() {
    await ensureCandidateReady();
    if (!candidate.value || !interviewInput.value.trim() || isTyping.value) {
      return;
    }
    const message = interviewInput.value.trim();
    interviewInput.value = "";
    appStore.setErrorMessage("");

    const optimistic = cloneValue(candidate.value);
    optimistic.interview_history.push({ role: "user", content: message });
    optimistic.interview_history.push({
      role: "assistant",
      content: UI_TEXT.INTERVIEW_PENDING_MESSAGE,
      status: MESSAGE_STATUS.GENERATING,
    });
    candidate.value = optimistic;

    await streamAssistantReply({
      path: "/api/interview/message/stream",
      payload: { message, action: STREAM_ACTIONS.SEND },
      historyKey: "interview_history",
      assistantIndex: optimistic.interview_history.length - 1,
      pendingMessage: UI_TEXT.INTERVIEW_PENDING_MESSAGE,
      fallbackErrorMessage: ERROR_MESSAGES.INTERVIEW_STREAM,
      abortedMessage: "这轮回复已被手动停止，你可以继续生成或重试本轮回答。",
    });
  }

  async function resumeQaReply() {
    await retryOrResumeHistory({
      path: "/api/qa/chat/stream",
      historyKey: "qa_history",
      pendingMessage: UI_TEXT.QA_PENDING_MESSAGE,
      action: STREAM_ACTIONS.RESUME,
      fallbackErrorMessage: ERROR_MESSAGES.STREAM_RESUME,
      abortedMessage: "继续生成已被停止。",
    });
  }

  async function retryQaReply() {
    await retryOrResumeHistory({
      path: "/api/qa/chat/stream",
      historyKey: "qa_history",
      pendingMessage: UI_TEXT.QA_PENDING_MESSAGE,
      action: STREAM_ACTIONS.RETRY,
      fallbackErrorMessage: ERROR_MESSAGES.STREAM_RETRY,
      abortedMessage: "重试已被停止。",
    });
  }

  async function resumeInterviewReply() {
    await retryOrResumeHistory({
      path: "/api/interview/message/stream",
      historyKey: "interview_history",
      pendingMessage: UI_TEXT.INTERVIEW_PENDING_MESSAGE,
      action: STREAM_ACTIONS.RESUME,
      fallbackErrorMessage: ERROR_MESSAGES.STREAM_RESUME,
      abortedMessage: "继续生成已被停止。",
    });
  }

  async function retryInterviewReply() {
    await retryOrResumeHistory({
      path: "/api/interview/message/stream",
      historyKey: "interview_history",
      pendingMessage: UI_TEXT.INTERVIEW_PENDING_MESSAGE,
      action: STREAM_ACTIONS.RETRY,
      fallbackErrorMessage: ERROR_MESSAGES.STREAM_RETRY,
      abortedMessage: "重试已被停止。",
    });
  }

  async function retryOrResumeHistory({ path, historyKey, pendingMessage, action, fallbackErrorMessage, abortedMessage }) {
    if (!candidate.value || isTyping.value) {
      return;
    }

    const optimistic = cloneValue(candidate.value);
    const history = optimistic[historyKey];
    if (!history?.length || history[history.length - 1]?.role !== "assistant") {
      return;
    }

    history[history.length - 1] = {
      ...history[history.length - 1],
      content: pendingMessage,
      status: MESSAGE_STATUS.GENERATING,
    };
    candidate.value = optimistic;

    await streamAssistantReply({
      path,
      payload: { action },
      historyKey,
      assistantIndex: history.length - 1,
      pendingMessage,
      fallbackErrorMessage,
      abortedMessage,
    });
  }

  async function streamAssistantReply({
    path,
    payload,
    historyKey,
    assistantIndex,
    pendingMessage,
    fallbackErrorMessage,
    abortedMessage,
  }) {
    // 真流式链路可以直接记这 5 步：
    // 1. fetch 请求后端流式接口
    // 2. getReader() 循环读取字节流
    // 3. TextDecoder 解码成字符串
    // 4. 解析每一行 JSON 事件
    // 5. 把最新文本写回 Pinia，让 Vue 自动更新页面
    const controller = new AbortController();
    let partialText = "";
    appStore.setTypingState({ historyKey, messageIndex: assistantIndex, controller });
    appStore.setStopRequested(false);
    appStore.setProgressMessage("");

    try {
      const response = await apiStreamPost(path, payload, controller.signal);
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("当前环境不支持流式读取。");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        buffer = handleStreamBuffer(buffer, historyKey, assistantIndex, pendingMessage, (chunkText, nextCandidate) => {
          partialText = chunkText;
          if (nextCandidate) {
            candidate.value = nextCandidate;
          }
        });
      }

      buffer += decoder.decode();
      handleStreamBuffer(buffer, historyKey, assistantIndex, pendingMessage, (chunkText, nextCandidate) => {
        partialText = chunkText;
        if (nextCandidate) {
          candidate.value = nextCandidate;
        }
      });
      const finalMessage = candidate.value?.[historyKey]?.[assistantIndex];
      if (!finalMessage || finalMessage.status === MESSAGE_STATUS.GENERATING) {
        throw new Error("流式连接提前结束，正在尝试恢复本轮结果。");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        const interruptedText = partialText ? `${partialText}${UI_TEXT.INTERRUPTED_SUFFIX}` : abortedMessage;
        appStore.updateHistoryMessage(historyKey, assistantIndex, interruptedText, MESSAGE_STATUS.INTERRUPTED);
      } else {
        const recovered = path.includes("/api/interview/")
          ? await recoverCompletedInterviewRun(currentRunId.value)
          : null;
        if (recovered?.candidate) {
          candidate.value = recovered.candidate;
          appStore.setCurrentCitations(recovered.evidence || []);
          appStore.setErrorMessage("");
        } else {
          appStore.setErrorMessage(normalizeErrorMessage(error, fallbackErrorMessage));
          appStore.updateHistoryMessage(
            historyKey,
            assistantIndex,
            partialText || error.message || "回复失败，请稍后重试。",
            MESSAGE_STATUS.INTERRUPTED,
          );
        }
      }
    } finally {
      appStore.setTypingState(null);
      appStore.setStopRequested(false);
      appStore.setProgressMessage("");
    }
  }

  function handleStreamBuffer(buffer, historyKey, assistantIndex, pendingMessage, onProgress) {
    // buffer 里可能已经积累了多行，也可能最后一行还没收完整。
    // 所以这里只处理完整行，把半行内容留给下一轮 read。
    const lines = buffer.split("\n");
    const remainder = lines.pop() ?? "";
    let currentText = getHistoryMessageContent(historyKey, assistantIndex);
    if (currentText === pendingMessage) {
      currentText = "";
    }

    lines.forEach((line) => {
      const raw = line.trim();
      if (!raw) {
        return;
      }
      const event = JSON.parse(raw);
      if (event.type === "run_started") {
        appStore.beginAgentRun(event.run_id);
        appStore.recordAgentEvent(event);
        return;
      }
      if (["node_started", "node_finished", "tool_called", "retrieval_finished", "run_finished"].includes(event.type)) {
        appStore.recordAgentEvent(event);
        if (event.content) appStore.setProgressMessage(event.content);
        return;
      }
      if (event.type === "status") {
        appStore.setProgressMessage(event.content || "");
        return;
      }
      if (event.type === "chunk" || event.type === "token") {
        currentText += event.content || "";
        appStore.updateHistoryMessage(historyKey, assistantIndex, currentText, MESSAGE_STATUS.GENERATING);
        onProgress(currentText);
        return;
      }
      if (event.type === "done") {
        appStore.setCurrentCitations(event.evidence || []);
        if (event.candidate) {
          candidate.value = event.candidate;
        } else {
          appStore.updateHistoryMessage(historyKey, assistantIndex, currentText, MESSAGE_STATUS.DONE);
        }
        onProgress(event.reply || currentText, event.candidate || null);
        return;
      }
      if (event.type === "error") {
        throw new Error(event.detail || "流式请求失败，请稍后重试。");
      }
      if (event.type === "run_error") {
        appStore.recordAgentEvent(event);
        throw new Error(event.detail || "Agent 工作流执行失败。");
      }
    });

    return remainder;
  }

  function getHistoryMessageContent(historyKey, messageIndex) {
    if (!candidate.value) {
      return "";
    }
    const history = candidate.value[historyKey];
    return history?.[messageIndex]?.content || "";
  }

  async function requestStopTyping() {
    // 主动停止先通知后端写入取消标记，再中断浏览器的流读取。
    // 这和网络意外断开不同：断网时后台任务会继续，以便稍后恢复结果。
    appStore.setStopRequested(true);
    if (currentRunId.value && typingState.value?.historyKey === "interview_history") {
      await apiPost(`/api/platform/agent-runs/${currentRunId.value}/cancel`, {}).catch(() => null);
    }
    typingState.value?.controller?.abort();
  }

  async function recoverCompletedInterviewRun(runId) {
    if (!runId) {
      return null;
    }
    // 模型线程可能比网络请求晚几秒结束，因此进行有限次数轮询。
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        return await apiPost(`/api/interview/runs/${runId}/recover`, {});
      } catch (error) {
        if (!String(error.message || "").includes("仍在生成")) {
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
    return null;
  }

  function normalizeErrorMessage(error, fallback) {
    const text = String(error?.message || fallback || "操作失败，请稍后重试。").trim();
    if (text.includes("401") || text.includes("未登录") || text.includes("登录已失效")) {
      return "登录状态已失效，请重新登录后再继续操作。";
    }
    if (text.includes("Network") || text.includes("Failed to fetch")) {
      return "网络连接失败，请检查后端服务或网络状态。";
    }
    if (text.includes("timeout")) {
      return "请求超时，请稍后重试。";
    }
    if (text.includes("简历")) {
      return text || "简历处理失败，请检查文件格式。";
    }
    return text || fallback || "操作失败，请稍后重试。";
  }

  // 这些包装函数显式把参数转交给 Pinia action。
  // 这样模板层拿到的是稳定的函数调用入口。
  function setAuthMode(nextMode) {
    appStore.setAuthMode(nextMode);
  }

  function setLoginForm(payload) {
    appStore.setLoginForm(payload);
  }

  function setRegisterForm(payload) {
    appStore.setRegisterForm(payload);
  }

  function setSelectedRole(role) {
    appStore.setSelectedRole(role);
  }

  function setKnowledgeFiles(files) {
    appStore.setKnowledgeFiles(files);
  }

  function setResumeFile(file) {
    appStore.setResumeFile(file);
  }

  function setQaInput(value) {
    appStore.setQaInput(value);
  }

  function setInterviewInput(value) {
    appStore.setInterviewInput(value);
  }

  function setLangsmith(payload) {
    appStore.setLangsmith(payload);
  }

  function setMode(nextMode) {
    appStore.setMode(nextMode);
  }

  function setWorkspace(payload) {
    appStore.setWorkspace(payload);
  }

  function setThemeMode(nextMode) {
    appStore.setThemeMode(nextMode);
  }

  return {
    // 页面层最终拿到两类东西：
    // 1. 响应式状态
    // 2. 可以触发的业务动作
    ...storeToRefs(appStore),
    bootstrap,
    refreshBootstrapData,
    refreshRoleOptions,
    syncAppPayload,
    login,
    register,
    logout,
    importKnowledge,
    saveLangSmith,
    uploadResume,
    clearResume,
    clearQaHistory,
    startInterview,
    endInterview,
    generateReport,
    loadHistoryRecords,
    openHistoryRecord,
    restoreHistoryRecord,
    sendQaMessage,
    sendInterviewMessage,
    resumeQaReply,
    retryQaReply,
    resumeInterviewReply,
    retryInterviewReply,
    completeOnboarding,
    createProject,
    renameProject,
    activateProject,
    togglePinProject,
    deleteProject,
    createConversation,
    renameConversation,
    activateConversation,
    togglePinConversation,
    updateConversationMode,
    deleteConversation,
    requestStopTyping,
    setAuthMode,
    setLoginForm,
    setRegisterForm,
    setSelectedRole,
    setKnowledgeFiles,
    setResumeFile,
    setQaInput,
    setInterviewInput,
    setLangsmith,
    setMode,
    setWorkspace,
    setThemeMode,
  };
}
