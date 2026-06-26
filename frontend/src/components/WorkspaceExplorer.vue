<template>
  <section class="sidebar-section workspace-section">
    <div class="workspace-header">
      <div>
        <h3>项目空间</h3>
      </div>
      <button class="text-button" @click="toggleProjectForm">{{ showProjectForm ? "收起" : "新建项目" }}</button>
    </div>

    <form v-if="showProjectForm" class="workspace-inline-form" @submit.prevent="submitProject">
      <input v-model.trim="projectName" class="text-input" placeholder="请输入项目名称" />
      <div class="workspace-inline-actions">
        <button class="primary-button compact-button" type="submit">创建项目</button>
      </div>
    </form>

    <div v-if="!projects.length" class="mini-empty-card">还没有项目，先创建一个项目再新建会话。</div>

    <div v-else class="workspace-tree">
      <article
        v-for="project in projects"
        :key="project.id"
        :class="[
          'workspace-project-card',
          activeProjectId === project.id ? 'active' : '',
          hoveredProjectId === project.id ? 'hovering' : '',
        ]"
        @mouseenter="hoveredProjectId = project.id"
        @mouseleave="hoveredProjectId = ''"
      >
        <!-- 项目更多是“会话容器”，
             当前交互里重点操作的是下面的会话列表。 -->
        <div class="workspace-item-row">
          <div class="workspace-item-main">
            <strong>{{ project.name }}</strong>
            <span>{{ project.conversation_count }} 个会话</span>
          </div>
        </div>

        <form
          v-if="editingProjectId === project.id"
          class="workspace-inline-form compact"
          @submit.prevent="submitProjectRename(project.id)"
        >
          <input v-model.trim="editingProjectName" class="text-input" placeholder="输入新的项目名称" />
          <div class="workspace-inline-actions">
            <button class="ghost-button compact-button" type="button" @click="cancelProjectEdit">取消</button>
            <button class="primary-button compact-button" type="submit">保存</button>
          </div>
        </form>

        <div class="workspace-conversations">
          <div class="workspace-conversations-top">
            <span>会话列表</span>
            <button class="text-button" @click="toggleConversationForm(project.id)">
              {{ showConversationFormFor === project.id ? "收起" : "新建会话" }}
            </button>
          </div>

          <form
            v-if="showConversationFormFor === project.id"
            class="workspace-inline-form compact"
            @submit.prevent="submitConversation(project.id)"
          >
            <input v-model.trim="conversationName" class="text-input" placeholder="请输入会话名称" />
            <div class="workspace-inline-actions">
              <button class="primary-button compact-button" type="submit">创建会话</button>
            </div>
          </form>

          <div
            v-for="conversation in project.conversations"
            :key="conversation.id"
            :class="['conversation-item', hoveredConversationId === conversation.id ? 'hovering' : '']"
            @mouseenter="hoveredConversationId = conversation.id"
            @mouseleave="hoveredConversationId = ''"
          >
            <!-- 点击会话卡片后，会触发 activate-conversation，
                 上层会去调用后端接口切换活动会话。 -->
            <button
              :class="['conversation-chip', activeConversationId === conversation.id ? 'active' : '']"
              @click="$emit('activate-conversation', conversation.id)"
            >
              <div class="conversation-chip-main">
                <strong>{{ conversation.name }}</strong>
                <span>
                  {{
                    conversation.preferred_mode === "interview"
                      ? "模拟面试"
                      : conversation.preferred_mode === "history"
                        ? "历史复盘"
                        : "技术问答"
                  }}
                </span>
              </div>
              <div class="conversation-chip-meta">
                <span>Q{{ conversation.qa_count }}</span>
                <span>I{{ conversation.interview_count }}</span>
              </div>
            </button>

            <div v-show="hoveredConversationId === conversation.id" class="conversation-tool-row workspace-tools-popover">
              <!-- 这里的按钮只负责抛事件，
                   实际的置顶 / 重命名 / 删除逻辑都在上层处理。 -->
              <button class="text-button" @click="$emit('toggle-pin-conversation', conversation.id)">
                {{ conversation.pinned ? "取消置顶" : "置顶会话" }}
              </button>
              <button class="text-button" @click="beginEditConversation(conversation)">重命名</button>
              <button class="text-button danger-text" @click="$emit('delete-conversation', conversation.id)">删除</button>
            </div>
          </div>

          <form
            v-if="editingConversationId && project.conversations.some((item) => item.id === editingConversationId)"
            class="workspace-inline-form compact"
            @submit.prevent="submitConversationRename(editingConversationId)"
          >
            <input v-model.trim="editingConversationName" class="text-input" placeholder="输入新的会话名称" />
            <div class="workspace-inline-actions">
              <button class="ghost-button compact-button" type="button" @click="cancelConversationEdit">取消</button>
              <button class="primary-button compact-button" type="submit">保存</button>
            </div>
          </form>

          <div v-show="hoveredProjectId === project.id" class="workspace-item-tools workspace-tools-popover">
            <button class="text-button" @click="$emit('toggle-pin-project', project.id)">
              {{ project.pinned ? "取消置顶" : "置顶项目" }}
            </button>
            <button class="text-button" @click="beginEditProject(project)">重命名</button>
            <button class="text-button danger-text" @click="$emit('delete-project', project.id)">删除</button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: "WorkspaceExplorer",
  props: {
    projects: {
      type: Array,
      default: () => [],
    },
    activeProjectId: {
      type: String,
      default: "",
    },
    activeConversationId: {
      type: String,
      default: "",
    },
  },
  emits: [
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
      // 这两个 hover 状态只控制前端悬停展开效果。
      showProjectForm: false,
      projectName: "",
      showConversationFormFor: "",
      conversationName: "",
      editingProjectId: "",
      editingProjectName: "",
      editingConversationId: "",
      editingConversationName: "",
      hoveredProjectId: "",
      hoveredConversationId: "",
    };
  },
  methods: {
    toggleProjectForm() {
      this.showProjectForm = !this.showProjectForm;
      if (!this.showProjectForm) {
        this.projectName = "";
      }
    },
    submitProject() {
      if (!this.projectName) {
        return;
      }
      this.$emit("create-project", this.projectName);
      this.projectName = "";
      this.showProjectForm = false;
    },
    beginEditProject(project) {
      this.editingProjectId = project.id;
      this.editingProjectName = project.name;
    },
    cancelProjectEdit() {
      this.editingProjectId = "";
      this.editingProjectName = "";
    },
    submitProjectRename(projectId) {
      if (!this.editingProjectName) {
        return;
      }
      this.$emit("rename-project", projectId, this.editingProjectName);
      this.cancelProjectEdit();
    },
    toggleConversationForm(projectId) {
      this.showConversationFormFor = this.showConversationFormFor === projectId ? "" : projectId;
      this.conversationName = "";
    },
    submitConversation(projectId) {
      if (!this.conversationName) {
        return;
      }
      this.$emit("create-conversation", projectId, this.conversationName);
      this.conversationName = "";
      this.showConversationFormFor = "";
    },
    beginEditConversation(conversation) {
      this.editingConversationId = conversation.id;
      this.editingConversationName = conversation.name;
    },
    cancelConversationEdit() {
      this.editingConversationId = "";
      this.editingConversationName = "";
    },
    submitConversationRename(conversationId) {
      if (!this.editingConversationName) {
        return;
      }
      this.$emit("rename-conversation", conversationId, this.editingConversationName);
      this.cancelConversationEdit();
    },
  },
};
</script>
