<template>
  <div v-if="bootstrapping" class="app-loading-shell">
    <div class="app-loading-copy">正在加载智能面试辅导系统...</div>
    <PanelSkeleton :rows="5" />
  </div>

  <AuthView
    v-else-if="!auth.authenticated"
    :auth-mode="authMode"
    :login-form="loginForm"
    :register-form="registerForm"
    :loading-action="loadingAction"
    :error-message="errorMessage"
    @update:authMode="setAuthMode"
    @update:loginForm="setLoginForm"
    @update:registerForm="setRegisterForm"
    @login="login"
    @register="register"
  />

  <div v-else :class="['app-theme-shell', `theme-${themeMode}`]">
    <OnboardingModal v-if="showOnboarding" @skip="handleSkipOnboarding" @choose="handleGuideChoose" />

    <LandingView
      v-if="isLandingRoute"
      :auth="auth"
      :history-count="historyRecords.length"
      :project-count="workspace.projects.length"
      :conversation-count="conversationCount"
      :role-options="meta.role_options"
      @open-mode="openMode"
      @quick-question="startQuickQuestion"
      @open-role="startRoleInterview"
    />

    <PlatformView
      v-else-if="isPlatformRoute"
      :auth="auth"
      @back="openMode(QA_MODE)"
      @roles-updated="handleRolesUpdated"
    />

    <div v-else class="app-shell" :style="{ '--sidebar-width': `${sidebarWidth}px` }">
      <AppSidebar
        :auth="auth"
        :workspace="workspace"
        :langsmith="langsmith"
        :langsmith-status="langsmithStatus"
        :loading-action="loadingAction"
        :mode="mode"
        :history-count="historyRecords.length"
        :theme-mode="themeMode"
        @go-landing="goLanding"
        @open-mode="openMode"
        @open-platform="openPlatform"
        @logout="logout"
        @create-project="handleCreateProject"
        @activate-project="handleActivateProject"
        @rename-project="handleRenameProject"
        @toggle-pin-project="handleTogglePinProject"
        @delete-project="handleDeleteProject"
        @create-conversation="handleCreateConversation"
        @activate-conversation="handleActivateConversation"
        @rename-conversation="handleRenameConversation"
        @toggle-pin-conversation="handleTogglePinConversation"
        @delete-conversation="handleDeleteConversation"
        @knowledge-files-change="setKnowledgeFiles"
        @import-knowledge="importKnowledge"
        @update:langsmith="setLangsmith"
        @save-langsmith="saveLangSmith"
      />

      <div class="sidebar-resizer" title="拖动调整侧边栏宽度" @pointerdown="startSidebarResize"></div>

      <main class="main-panel">
        <ModeHeader :meta="activeModeMeta" :weather="weather" :progress-message="mode === QA_MODE ? '' : progressMessage" />

        <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

        <QaView
          v-if="mode === QA_MODE"
          :history="candidate?.qa_history || []"
          :meta="meta.qa"
          :show-welcome="(candidate?.qa_history || []).length === 0"
          :input-value="qaInput"
          :is-typing="isTyping"
          :loading-action="loadingAction"
          :can-resume="canResumeCurrentReply"
          :can-retry="canRetryCurrentReply"
          :agent-events="agentEvents"
          :current-citations="currentCitations"
          @clear-history="clearQaHistory"
          @send="sendQaMessage"
          @update:inputValue="setQaInput"
          @stop="requestStopTyping"
          @resume-last="resumeQaReply"
          @retry-last="retryQaReply"
        />

        <InterviewView
          v-else-if="mode === INTERVIEW_MODE"
          :candidate="candidate"
          :role-options="meta.role_options"
          :selected-role="selectedRole"
          :theme-mode="themeMode"
          :resume-file="resumeFile"
          :history="candidate?.interview_history || []"
          :meta="meta.interview"
          :show-welcome="(candidate?.interview_history || []).length === 0 && !candidate?.interview_started"
          :input-value="interviewInput"
          :is-typing="isTyping"
          :loading-action="loadingAction"
          :can-resume="canResumeCurrentReply"
          :can-retry="canRetryCurrentReply"
          :agent-events="agentEvents"
          :current-citations="currentCitations"
          @update:selectedRole="setSelectedRole"
          @update:themeMode="setThemeMode"
          @resume-file-change="setResumeFile"
          @clear-resume="clearResume"
          @start-interview="startInterview"
          @end-interview="endInterview"
          @generate-report="generateReport"
          @cancel-setup="goLanding"
          @send="sendInterviewMessage"
          @update:inputValue="setInterviewInput"
          @stop="requestStopTyping"
          @resume-last="resumeInterviewReply"
          @retry-last="retryInterviewReply"
        />

        <HistoryView
          v-else
          :records="historyRecords"
          :selected-record="selectedHistoryRecord"
          :loading-action="loadingAction"
          @refresh-history="loadHistoryRecords"
          @open-record="handleOpenHistoryRecord"
          @restore-record="restoreHistoryRecord"
        />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { HISTORY_MODE, INTERVIEW_MODE, QA_MODE } from "./constants.js";
import AppSidebar from "./components/AppSidebar.vue";
import ModeHeader from "./components/ModeHeader.vue";
import OnboardingModal from "./components/OnboardingModal.vue";
import PanelSkeleton from "./components/PanelSkeleton.vue";
import { useInterviewApp } from "./composables/useInterviewApp.js";

// App.vue 是整个前端应用的入口编排层。
// 这里最重要的职责不是写细节逻辑，而是：
// 1. 决定当前该显示哪个大页面
// 2. 把状态和动作分发给下层页面
// 3. 同步路由和工作台模式
const AuthView = defineAsyncComponent(() => import("./views/AuthView.vue"));
const HistoryView = defineAsyncComponent(() => import("./views/HistoryView.vue"));
const InterviewView = defineAsyncComponent(() => import("./views/InterviewView.vue"));
const LandingView = defineAsyncComponent(() => import("./views/LandingView.vue"));
const QaView = defineAsyncComponent(() => import("./views/QaView.vue"));
const PlatformView = defineAsyncComponent(() => import("./views/PlatformView.vue"));

const app = useInterviewApp();
const router = useRouter();
const route = useRoute();

const {
  bootstrapping,
  auth,
  historyRecords,
  workspace,
  meta,
  authMode,
  loginForm,
  registerForm,
  loadingAction,
  errorMessage,
  themeMode,
  langsmith,
  langsmithStatus,
  mode,
  activeModeMeta,
  weather,
  progressMessage,
  candidate,
  qaInput,
  isTyping,
  canResumeCurrentReply,
  canRetryCurrentReply,
  interviewInput,
  selectedRole,
  resumeFile,
  selectedHistoryRecord,
  agentEvents,
  currentCitations,
  refreshBootstrapData,
  refreshRoleOptions,
} = app;

// computed 适合表达“由已有状态推出来的结果”。
const isLandingRoute = computed(() => route.name === "landing");
const isPlatformRoute = computed(() => route.name === "platform");
const showOnboarding = computed(
  () => app.auth.value?.authenticated && !app.workspace.value?.onboarding_completed && route.name === "landing",
);
const conversationCount = computed(() =>
  (app.workspace.value?.projects || []).reduce((total, project) => total + (project.conversations?.length || 0), 0),
);
const sidebarWidth = ref(
  typeof window !== "undefined" ? Number(window.localStorage.getItem("interview-sidebar-width")) || 268 : 268,
);

function getSidebarBounds() {
  if (typeof window === "undefined") {
    return { minWidth: 220, maxWidth: 320 };
  }
  const maxWidth = Math.floor(window.innerWidth * 0.25);
  const minWidth = Math.min(220, maxWidth);
  return { minWidth, maxWidth };
}

function normalizeSidebarWidth(width) {
  const { minWidth, maxWidth } = getSidebarBounds();
  return Math.min(Math.max(width, minWidth), maxWidth);
}

function startSidebarResize(event) {
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  const onMove = (moveEvent) => {
    sidebarWidth.value = normalizeSidebarWidth(moveEvent.clientX);
  };
  const onUp = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("interview-sidebar-width", String(sidebarWidth.value));
    }
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function syncModeFromRoute() {
  const nextMode = route.params.mode;
  if (typeof nextMode === "string" && [QA_MODE, INTERVIEW_MODE, HISTORY_MODE].includes(nextMode)) {
    app.setMode(nextMode);
  }
}

async function openMode(targetMode) {
  if (targetMode === INTERVIEW_MODE) {
    await refreshRoleOptions({ silent: true });
  }
  await router.push(`/workspace/${targetMode}`);
  app.setMode(targetMode);
  if (app.workspace.value?.active_conversation_id) {
    app.updateConversationMode(app.workspace.value.active_conversation_id, targetMode);
  }
  if (targetMode === HISTORY_MODE) {
    app.loadHistoryRecords();
  }
}

async function goLanding() {
  await router.push("/");
}

async function openPlatform(consoleType = auth.value?.user?.role === "admin" ? "admin" : "interviewer") {
  const defaultSection = consoleType === "admin" ? "overview" : "workspace";
  await router.push(`/platform/${consoleType}/${defaultSection}`);
}

async function handleRolesUpdated() {
  await refreshRoleOptions({ silent: true });
  await refreshBootstrapData();
}

async function handleSkipOnboarding() {
  await app.completeOnboarding(true);
}

async function handleGuideChoose(targetMode) {
  await app.completeOnboarding(true);
  await openMode(targetMode);
}

async function handleCreateProject(name) {
  await app.createProject(name);
  if (route.name === "landing") {
    await openMode(QA_MODE);
  }
}

async function handleActivateProject(projectId) {
  await app.activateProject(projectId);
  await router.push(`/workspace/${app.mode.value}`);
}

async function handleRenameProject(projectId, name) {
  await app.renameProject(projectId, name);
}

async function handleTogglePinProject(projectId) {
  await app.togglePinProject(projectId);
}

async function handleDeleteProject(projectId) {
  if (!window.confirm("确认删除这个项目吗？项目下的会话状态会一起移除。")) return;
  await app.deleteProject(projectId);
  if (route.name !== "landing") {
    await router.push(`/workspace/${app.mode.value}`);
  }
}

async function handleCreateConversation(projectId, name) {
  await app.createConversation(projectId, name);
  if (!route.params.mode) {
    await openMode(QA_MODE);
  }
}

async function handleActivateConversation(conversationId) {
  await app.activateConversation(conversationId);
  const preferredMode = app.activeConversation.value?.preferred_mode || QA_MODE;
  await openMode(preferredMode);
}

async function handleRenameConversation(conversationId, name) {
  await app.renameConversation(conversationId, name);
}

async function handleTogglePinConversation(conversationId) {
  await app.togglePinConversation(conversationId);
}

async function handleDeleteConversation(conversationId) {
  if (!window.confirm("确认删除这个会话吗？该会话下的问答和面试状态会一并移除。")) return;
  await app.deleteConversation(conversationId);
  if (route.name !== "landing") {
    await router.push(`/workspace/${app.mode.value}`);
  }
}

async function handleOpenHistoryRecord(recordId) {
  await openMode(HISTORY_MODE);
  await app.openHistoryRecord(recordId);
}

async function startQuickQuestion(question) {
  app.setQaInput(question);
  await openMode(QA_MODE);
}

async function startRoleInterview(role) {
  app.setSelectedRole(role);
  await openMode(INTERVIEW_MODE);
}

onMounted(() => {
  // 首屏初始化请求。
  sidebarWidth.value = normalizeSidebarWidth(sidebarWidth.value);
  app.bootstrap();
});

watch(
  () => route.fullPath,
  () => {
    if (route.name === "platform" && !["interviewer", "admin"].includes(app.auth.value?.user?.role)) {
      router.replace("/");
      return;
    }
    if (route.name === "platform" && route.params.console === "admin" && app.auth.value?.user?.role !== "admin") {
      router.replace("/platform/interviewer/workspace");
      return;
    }
    syncModeFromRoute();
  },
  { immediate: true },
);

const {
  login,
  register,
  setAuthMode,
  setLoginForm,
  setRegisterForm,
  logout,
  setKnowledgeFiles,
  importKnowledge,
  setLangsmith,
  saveLangSmith,
  clearQaHistory,
  sendQaMessage,
  requestStopTyping,
  resumeQaReply,
  retryQaReply,
  setSelectedRole,
  setThemeMode,
  setResumeFile,
  clearResume,
  startInterview,
  endInterview,
  generateReport,
  sendInterviewMessage,
  setInterviewInput,
  resumeInterviewReply,
  retryInterviewReply,
  loadHistoryRecords,
  restoreHistoryRecord,
  setQaInput,
} = app;
</script>
