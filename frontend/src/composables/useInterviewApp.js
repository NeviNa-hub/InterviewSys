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
  // useInterviewApp 是“前端业务编排层”：
  // - store 负责存状态
  // - api/client 负责发请求
  // - 这里负责把页面动作、接口、状态更新、流式处理串成一条完整链路
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
  } = storeToRefs(appStore);

  // 历史记录列表一般不需要用户每次切换都立刻狂刷接口，
  // 所以这里用 debounce 做一个轻量防抖。
  const debouncedHistoryLoader = debounce(() => {
    loadHistoryRecordsImmediate();
  }, 260);

  onBeforeUnmount(() => {
    // 页面卸载时主动中断还在进行中的流式请求，
    // 避免组件销毁后 reader 还在继续推数据。
    typingState.value?.controller?.abort();
  });

  async function bootstrap() {
    // 启动流程：
    // 前端打开后先请求 /api/bootstrap，
    // 后端返回当前登录态、候选人状态、天气、文案、历史记录摘要。
    bootstrapping.value = true;
    appStore.setErrorMessage("");
    try {
      const data = await apiGet("/api/bootstrap");
      appStore.applyBootstrapPayload(data);
    } catch (error) {
      appStore.setErrorMessage(normalizeErrorMessage(error, ERROR_MESSAGES.BOOTSTRAP));
    } finally {
      bootstrapping.value = false;
    }
  }

  function syncAppPayload(data, options = {}) {
    appStore.applyBootstrapPayload(data);
    if (options.mode) {
      appStore.setMode(options.mode);
    }
  }

  async function login() {
    // 登录成功后，后端除了 auth，还会一并返回该用户当前工作态。
    // 所以前端可以直接刷新整个工作台，而不是只改一个 token。
    appStore.setLoadingAction(LOADING_ACTIONS.LOGIN);
    appStore.setErrorMessage("");
    try {
      const data = await apiPost("/api/auth/login", loginForm.value);
      syncAppPayload(data);
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
    // 知识库导入是典型的文件上传流程：
    // File[] -> FormData -> POST /api/knowledge/import -> 后端解析与入库
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
    // 简历上传后，后端会抽取文本并更新 candidate.resume_text / resume_filename。
    // 前端只需要用返回的新 candidate 覆盖旧状态即可。
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
    // 开始面试时，前端传 role，后端决定首题内容、面试状态机初始状态等。
    appStore.setLoadingAction(LOADING_ACTIONS.INTERVIEW_START);
    appStore.setErrorMessage("");
    appStore.setProgressMessage(
      resumeFile.value || candidate.value.resume_text ? "正在分析简历..." : "正在生成首个问题..."
    );
    try {
      if (resumeFile.value) {
        await uploadResume({ silent: true });
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
    // 这里的 progressMessage 是细粒度 loading 文案，
    // 用来告诉用户当前不是“卡住”，而是在生成报告。
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
    // 发送消息前先做“乐观更新”：
    // 1. 立即把用户消息插入本地历史
    // 2. 再插入一条 assistant 占位消息
    // 这样用户会立刻看到自己的输入和“AI 正在回答”的状态，而不是等后端返回后才出现。
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
    // 继续生成 / 重试本轮回答：
    // 都是拿最后一条 assistant 消息做复写，然后重新发起流式请求。
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
    // 真流式链路核心：
    // 1. fetch 请求后端流式接口
    // 2. getReader() 循环读取字节流
    // 3. TextDecoder 把字节流解码成字符串
    // 4. handleStreamBuffer 解析每一行 JSON 事件
    // 5. 持续把最新文本写回 Pinia -> Vue 自动刷新页面
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

      // 后端当前协议是“按行返回 JSON 事件”：
      // {"type":"status","content":"正在分析简历..."}
      // {"type":"chunk","content":"第一段文本"}
      // {"type":"done","reply":"完整文本","candidate":{...}}
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
    } catch (error) {
      // AbortError 一般来自用户手动点击“停止当前回复”。
      // 此时不算真正失败，而是把消息状态标记为 interrupted，便于后续继续生成。
      if (error?.name === "AbortError") {
        const interruptedText = partialText ? `${partialText}${UI_TEXT.INTERRUPTED_SUFFIX}` : abortedMessage;
        appStore.updateHistoryMessage(historyKey, assistantIndex, interruptedText, MESSAGE_STATUS.INTERRUPTED);
      } else {
        appStore.setErrorMessage(normalizeErrorMessage(error, fallbackErrorMessage));
        appStore.updateHistoryMessage(
          historyKey,
          assistantIndex,
          partialText || error.message || "回复失败，请稍后重试。",
          MESSAGE_STATUS.INTERRUPTED,
        );
      }
    } finally {
      appStore.setTypingState(null);
      appStore.setStopRequested(false);
      appStore.setProgressMessage("");
    }
  }

  function handleStreamBuffer(buffer, historyKey, assistantIndex, pendingMessage, onProgress) {
    // buffer 里可能同时拼着多行事件，也可能最后半行还没接收完。
    // 所以这里按换行切分，只处理完整行，把最后残余半行继续留给下一轮 reader.read()。
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
      // 这里约定前后端的通信协议是“每行一个 JSON 事件对象”。
      // 这是当前项目的前端流式渲染核心知识点之一。
      const event = JSON.parse(raw);
      if (event.type === "status") {
        // status 事件只更新顶部文案，不写入聊天气泡正文。
        appStore.setProgressMessage(event.content || "");
        return;
      }
      if (event.type === "chunk") {
        // chunk 事件表示模型又生成了一小段文本。
        // 前端把它不断拼到最后一条 assistant 消息里，就形成“边生成边显示”的效果。
        currentText += event.content || "";
        appStore.updateHistoryMessage(historyKey, assistantIndex, currentText, MESSAGE_STATUS.GENERATING);
        onProgress(currentText);
        return;
      }
      if (event.type === "done") {
        // done 事件表示后端已经生成完毕。
        // 有些接口会直接把完整 candidate 一并回传，这样前端不仅拿到文本，还拿到最新状态机结果、分数等。
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

  function requestStopTyping() {
    // 点击“停止当前回复”时，本质上是中断 fetch。
    // 中断后 catch 里会收到 AbortError，然后把消息标记成 interrupted。
    appStore.setStopRequested(true);
    typingState.value?.controller?.abort();
  }

  function normalizeErrorMessage(error, fallback) {
    // 把技术错误尽量转成更可读的业务提示，避免把底层异常原样甩给用户。
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

  // 这些包装函数显式把参数转交给 Pinia action，
  // 避免把 store action 当成“裸函数回调”传给模板时出现 this / 上下文丢失。
  function setAuthMode(mode) {
    appStore.setAuthMode(mode);
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

  function setMode(mode) {
    appStore.setMode(mode);
  }

  function setWorkspace(payload) {
    appStore.setWorkspace(payload);
  }

  function setThemeMode(mode) {
    appStore.setThemeMode(mode);
  }

  return {
    // 对页面层暴露两类东西：
    // 1. 所有响应式状态（storeToRefs）
    // 2. 所有页面可触发的动作（login/sendQaMessage/requestStopTyping 等）
    ...storeToRefs(appStore),
    bootstrap,
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
