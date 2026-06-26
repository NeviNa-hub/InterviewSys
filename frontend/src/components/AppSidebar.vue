<template>
  <aside class="sidebar">
    <div class="sidebar-brand-row">
      <div class="sidebar-brand">智能面试辅导系统</div>
      <button class="text-button" @click="$emit('go-landing')">首页</button>
    </div>

    <section class="sidebar-section">
      <div class="user-card sidebar-brand-row">
        <div>
          <div class="user-name">{{ auth.user?.display_name || "未登录" }}</div>
          <div class="user-email">{{ auth.user?.email || "" }}</div>
        </div>
        <button class="text-button" :disabled="loadingAction === 'logout'" @click="$emit('logout')">
          {{ loadingAction === "logout" ? "退出中..." : "退出登录" }}
        </button>
      </div>
    </section>

    <section class="sidebar-section">
      <div class="sidebar-brand-row">
        <h3>知识库</h3>
        <button class="primary-button" :disabled="loadingAction === 'knowledge'" @click="$emit('import-knowledge')">
          {{ loadingAction === "knowledge" ? "导入中..." : "导入知识库" }}
        </button>
      </div>

      <input
        class="file-input"
        type="file"
        multiple
        accept=".pdf,.txt,.md,.docx"
        @change="$emit('knowledge-files-change', Array.from($event.target.files || []))"
      />
    </section>

    <!-- WorkspaceExplorer 只负责“展示项目和会话树 + 抛事件”，
         真正的增删改查请求在上层 composable 里处理。 -->
    <WorkspaceExplorer
      :projects="workspace.projects"
      :active-project-id="workspace.active_project_id"
      :active-conversation-id="workspace.active_conversation_id"
      @create-project="$emit('create-project', $event)"
      @activate-project="$emit('activate-project', $event)"
      @rename-project="forwardRenameProject"
      @toggle-pin-project="$emit('toggle-pin-project', $event)"
      @delete-project="$emit('delete-project', $event)"
      @create-conversation="forwardCreateConversation"
      @activate-conversation="$emit('activate-conversation', $event)"
      @rename-conversation="forwardRenameConversation"
      @toggle-pin-conversation="$emit('toggle-pin-conversation', $event)"
      @delete-conversation="$emit('delete-conversation', $event)"
    />

    <section class="sidebar-section">
      <h3>工作台模式</h3>
      <div class="mode-switcher">
        <button :class="['mode-button', mode === qaMode ? 'active' : '']" @click="$emit('open-mode', qaMode)">
          问答模式
        </button>
        <button :class="['mode-button', mode === interviewMode ? 'active' : '']" @click="$emit('open-mode', interviewMode)">
          模拟面试
        </button>
        <button :class="['mode-button', mode === historyMode ? 'active' : '']" @click="$emit('open-mode', historyMode)">
          历史记录
        </button>
      </div>
    </section>

    <section
      class="sidebar-section langsmith-hover-panel"
      @mouseenter="langsmithExpanded = true"
      @mouseleave="langsmithExpanded = false"
    >
      <!-- LangSmith 采用悬停展开，减少侧边栏常驻高度。 -->
      <div class="sidebar-brand-row">
        <h3>LangSmith</h3>
        <label class="checkbox-row">
          <input
            type="checkbox"
            :checked="langsmith.enabled"
            @change="$emit('update:langsmith', { ...langsmith, enabled: $event.target.checked })"
          />
          <span>开启调试</span>
        </label>
      </div>

      <div v-show="langsmithExpanded" class="langsmith-hover-content">
        <input
          class="text-input"
          type="password"
          placeholder="LangSmith API Key"
          :value="langsmith.api_key"
          @input="$emit('update:langsmith', { ...langsmith, api_key: $event.target.value })"
        />
        <input
          class="text-input"
          placeholder="LangSmith Project"
          :value="langsmith.project"
          @input="$emit('update:langsmith', { ...langsmith, project: $event.target.value })"
        />
        <button class="primary-button-2" :disabled="loadingAction === 'langsmith'" @click="$emit('save-langsmith')">
          {{ loadingAction === "langsmith" ? "应用中..." : "应用 LangSmith 设置" }}
        </button>
        <div class="mini-tip">{{ langsmithStatus }}</div>
      </div>
    </section>

    <section class="sidebar-section">
      <h3>历史概览</h3>
      <div class="mini-tip">累计历史面试记录：{{ historyCount }} 条</div>
    </section>
  </aside>
</template>

<script>
import { HISTORY_MODE, INTERVIEW_MODE, QA_MODE } from "../constants.js";
import WorkspaceExplorer from "./WorkspaceExplorer.vue";

export default {
  name: "AppSidebar",
  components: {
    WorkspaceExplorer,
  },
  props: {
    auth: {
      type: Object,
      required: true,
    },
    workspace: {
      type: Object,
      required: true,
    },
    langsmith: {
      type: Object,
      required: true,
    },
    langsmithStatus: {
      type: String,
      default: "",
    },
    loadingAction: {
      type: String,
      default: "",
    },
    mode: {
      type: String,
      default: QA_MODE,
    },
    historyCount: {
      type: Number,
      default: 0,
    },
    themeMode: {
      type: String,
      default: "serious",
    },
  },
  emits: [
    "logout",
    "go-landing",
    "open-mode",
    "knowledge-files-change",
    "import-knowledge",
    "update:langsmith",
    "save-langsmith",
    "create-project",
    "activate-project",
    "rename-project",
    "toggle-pin-project",
    "delete-project",
    "create-conversation",
    "activate-conversation",
    "rename-conversation",
    "toggle-pin-conversation",
    "delete-conversation",
  ],
  data() {
    return {
      // 只控制当前组件里的展开/收起效果，不需要持久化。
      langsmithExpanded: false,
    };
  },
  methods: {
    forwardRenameProject(projectId, name) {
      this.$emit("rename-project", projectId, name);
    },
    forwardCreateConversation(projectId, name) {
      this.$emit("create-conversation", projectId, name);
    },
    forwardRenameConversation(conversationId, name) {
      this.$emit("rename-conversation", conversationId, name);
    },
  },
  setup() {
    return {
      qaMode: QA_MODE,
      interviewMode: INTERVIEW_MODE,
      historyMode: HISTORY_MODE,
    };
  },
};
</script>
