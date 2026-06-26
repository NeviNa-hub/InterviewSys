<template>
  <!-- 初始化阶段：
       页面首次打开时，会先请求 /api/bootstrap，
       后端返回登录态、候选人工作态、天气、页面文案等基础数据。
       在此之前先显示骨架屏，避免白屏。 -->
  <div v-if="bootstrapping" class="app-loading-shell">
    <div class="app-loading-copy">正在加载智能面试辅导系统...</div>
    <PanelSkeleton :rows="5" />
  </div>

  <!-- 未登录阶段：
       只渲染认证页。这里把 authMode、loginForm、registerForm 继续往下传，
       由 AuthPanel 负责表单展示，由 useInterviewApp / Pinia 负责真正的状态和请求。 -->
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
    <OnboardingModal
      v-if="showOnboarding"
      @skip="handleSkipOnboarding"
      @choose="handleGuideChoose"
    />

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

    <!-- 已登录且进入工作台阶段：
         整体页面分为左侧边栏 + 右侧主工作台。 -->
    <div v-else class="app-shell">
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

    <main class="main-panel">
      <!-- 顶部固定信息栏：
           显示当前模式标题、天气和细粒度进度提示。
           比如“正在分析简历”“正在生成报告”等。 -->
      <ModeHeader :meta="activeModeMeta" :weather="weather" :progress-message="progressMessage" />

      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

      <!-- mode 是前端工作台的核心模式状态：
           qa -> 技术问答
           interview -> 模拟面试
           history -> 历史记录
           这里采用条件渲染，而不是前端路由，适合当前单工作台产品形态。 -->
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

<script>
import { computed, defineAsyncComponent, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { HISTORY_MODE, INTERVIEW_MODE, QA_MODE } from "./constants.js";
import AppSidebar from "./components/AppSidebar.vue";
import ModeHeader from "./components/ModeHeader.vue";
import OnboardingModal from "./components/OnboardingModal.vue";
import PanelSkeleton from "./components/PanelSkeleton.vue";
import { useInterviewApp } from "./composables/useInterviewApp.js";

// App.vue 只负责页面编排，具体展示层继续下沉到 views。
// 这样后续如果继续拆路由或页面级状态，入口层不用再频繁改动。
// 这里用 defineAsyncComponent 做轻量懒加载：
// 只有真正进入某个页面时，才去加载对应 view 代码。
const AuthView = defineAsyncComponent(() => import("./views/AuthView.vue"));
const HistoryView = defineAsyncComponent(() => import("./views/HistoryView.vue"));
const InterviewView = defineAsyncComponent(() => import("./views/InterviewView.vue"));
const LandingView = defineAsyncComponent(() => import("./views/LandingView.vue"));
const QaView = defineAsyncComponent(() => import("./views/QaView.vue"));

export default {
  name: "App",
  components: {
    AppSidebar,
    AuthView,
    HistoryView,
    InterviewView,
    LandingView,
    ModeHeader,
    OnboardingModal,
    PanelSkeleton,
    QaView,
  },
  setup() {
    // useInterviewApp 是前端的“页面编排层”：
    // 负责把 Pinia store、接口请求、流式处理和页面动作串起来。
    const app = useInterviewApp();
    const router = useRouter();
    const route = useRoute();

    const isLandingRoute = computed(() => route.name === "landing");
    const showOnboarding = computed(
      () => app.auth.value?.authenticated && !app.workspace.value?.onboarding_completed && route.name === "landing",
    );
    const conversationCount = computed(() =>
      (app.workspace.value?.projects || []).reduce((total, project) => total + (project.conversations?.length || 0), 0),
    );

    function syncModeFromRoute() {
      // 路由里记录的是当前工作台模式。
      // 所以页面刷新后，会先读 URL，再把模式同步回 Pinia。
      const nextMode = route.params.mode;
      if (typeof nextMode === "string" && [QA_MODE, INTERVIEW_MODE, HISTORY_MODE].includes(nextMode)) {
        app.setMode(nextMode);
      }
    }

    async function openMode(targetMode) {
      // 模式切换不只是前端页面切换。
      // 这里还会把当前会话 preferred_mode 同步给后端，方便之后恢复。
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

    async function handleSkipOnboarding() {
      await app.completeOnboarding(true);
    }

    async function handleGuideChoose(targetMode) {
      await app.completeOnboarding(true);
      await openMode(targetMode);
    }

    async function handleCreateProject(name) {
      await app.createProject(name);
      await router.push("/");
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
      if (!window.confirm("确认删除这个项目吗？项目下的会话状态会一起移除。")) {
        return;
      }
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
      // 切换会话时，后端会更新 active_conversation_id，
      // 然后前端再根据会话记录里保存的 preferred_mode 打开对应模式。
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
      if (!window.confirm("确认删除这个会话吗？该会话下的问答和面试状态会一并移除。")) {
        return;
      }
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
      // 页面一挂载就做 bootstrap，相当于前端启动时的初始化请求。
      // 这是首屏最核心的一次数据加载。
      app.bootstrap();
    });

    watch(
      () => route.fullPath,
      () => {
        syncModeFromRoute();
      },
      { immediate: true },
    );

    return {
      ...app,
      route,
      isLandingRoute,
      showOnboarding,
      conversationCount,
      openMode,
      goLanding,
      handleSkipOnboarding,
      handleGuideChoose,
      handleCreateProject,
      handleActivateProject,
      handleRenameProject,
      handleTogglePinProject,
      handleDeleteProject,
      handleCreateConversation,
      handleActivateConversation,
      handleRenameConversation,
      handleTogglePinConversation,
      handleDeleteConversation,
      handleOpenHistoryRecord,
      startQuickQuestion,
      startRoleInterview,
      HISTORY_MODE,
      QA_MODE,
      INTERVIEW_MODE,
    };
  },
};
</script>
