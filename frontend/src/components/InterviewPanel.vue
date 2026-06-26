<template>
  <section class="interview-page-shell">
    <section v-if="showSetupPanel" class="interview-setup-shell">
      <!-- 先配置本轮面试：
           选岗位、可选上传简历、选择主题模式。 -->
      <div class="interview-setup-card">
        <div class="interview-setup-copy">
          <span class="setup-eyebrow">
            模拟面试配置
          </span>
          <h2>
            先确定本轮面试设置
          </h2>
          <p>
            先选岗位，可选上传简历，再选择主题模式。点击开始后，页面会切换成专注的面试工作台。
          </p>
        </div>

        <div class="config-grid">
          <div class="config-item">
            <label>
              目标岗位
            </label>
            <select class="text-input" :value="selectedRole" @change="$emit('update:selectedRole', $event.target.value)">
              <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
            </select>
          </div>

          <div class="config-item">
            <label>
              上传简历（可选）
            </label>
            <input
              class="file-input"
              type="file"
              accept=".pdf,.docx,.txt,.md"
              @change="$emit('resume-file-change', $event.target.files?.[0] || null)"
            />
            <div class="config-file-meta">
              <span v-if="resumeFile">
                待上传：{{ resumeFile.name }}
              </span>
              <span v-else-if="candidate && candidate.resume_filename">
                当前简历：{{ candidate.resume_filename }}
              </span>
              <span v-else>
                未选择简历，本轮将按岗位通用能力进行面试。
              </span>
            </div>
            <div v-if="candidate && candidate.resume_filename" class="config-actions">
              <button class="text-button" :disabled="loadingAction === 'resume-clear'" @click="$emit('clear-resume')">
                清除当前简历
              </button>
            </div>
          </div>
        </div>

        <div class="config-item interview-theme-picker">
          <label>
            主题模式
          </label>
          <div class="theme-mode-list interview-theme-list">
            <button
              v-for="item in themeCards"
              :key="item.value"
              :class="['theme-mode-card', themeMode === item.value ? 'active' : '']"
              @click="$emit('update:themeMode', item.value)"
            >
              <strong>{{ item.title }}</strong>
              <span>{{ item.subtitle }}</span>
            </button>
          </div>
        </div>

        <div class="setup-info-banner">
          {{
            candidate && candidate.resume_filename
              ? "检测到当前会话已有简历，开始后会优先结合简历经历和岗位要求提问。"
              : "如果不上传简历，系统会按岗位通用能力推进本轮面试。"
          }}
        </div>

        <div class="interview-setup-actions">
          <button
            class="primary-button"
            :disabled="loadingAction === 'interview-start' || loadingAction === 'resume' || isTyping"
            @click="$emit('start-interview')"
          >
            {{ hasInterviewSession ? "开始 / 重置面试" : "开始本轮面试" }}
          </button>
          <button class="ghost-button" @click="handleCancelSetup">
            {{ hasInterviewSession ? "返回当前面试" : "取消" }}
          </button>
        </div>
      </div>
    </section>

    <template v-else>
      <!-- 真正开始面试后，页面切换成“顶部信息栏 + 中间聊天区 + 底部输入区” -->
      <section class="interview-session-bar">
        <div class="interview-session-meta">
          <span class="session-chip role">
            岗位：{{ currentRoleLabel }}
          </span>
          <span class="session-chip resume">
            {{ hasResume ? "简历：已上传" : "简历：未上传" }}
          </span>
          <span v-if="candidate && candidate.interview_score" class="session-chip score">
            得分：{{ candidate.interview_score }} / 100
          </span>
        </div>

        <div class="interview-session-actions">
          <button class="text-button" @click="showSetupPanel = true">
            重新配置
          </button>
          <button
            v-if="candidate && !candidate.interview_finished"
            class="ghost-button interview-end-button"
            :disabled="loadingAction === 'interview-end'"
            @click="$emit('end-interview')"
          >
            {{ loadingAction === "interview-end" ? "结束中..." : "结束本次面试" }}
          </button>
        </div>
      </section>

      <section class="interview-stage-shell">
        <div class="interview-chat-stage">
          <!-- 还没有正式开始聊天时，先显示欢迎文案。 -->
          <WelcomePanel
            v-if="showWelcome"
            :title="meta.empty_title || '欢迎开始模拟面试'"
            :lines="meta.empty_description || []"
          />
          <ChatHistory v-else :messages="history" />
        </div>

        <div v-if="candidate && candidate.interview_finished" class="interview-report-stage">
          <section class="report-panel">
            <div class="score-card">本次模拟面试得分：{{ candidate.interview_score }} / 100</div>
            <button class="primary-button report-button" :disabled="loadingAction === 'report'" @click="$emit('generate-report')">
              {{ loadingAction === "report" ? "生成中..." : "生成面试报告" }}
            </button>
            <div v-if="candidate.interview_report_file" class="report-file-meta">
              <div>
                报告文件：{{ candidate.interview_report_file }}
              </div>
              <a class="text-button report-download-link" href="/api/interview/report/download" download>
                下载最新报告
              </a>
            </div>
            <article v-if="candidate.interview_report" class="report-content">{{ candidate.interview_report }}</article>
          </section>
        </div>

        <footer v-else class="chat-input-shell interview-input-shell">
          <div v-if="isTyping" class="typing-action-bar">
            <!-- 流式生成过程中，不再显示普通输入框，而是让用户可以中断生成。 -->
            <button class="stop-button" @click="$emit('stop')">停止当前回复</button>
          </div>
          <div v-else-if="canResume || canRetry" class="typing-action-bar">
            <button v-if="canResume" class="ghost-button compact-button" @click="$emit('resume-last')">继续生成</button>
            <button v-if="canRetry" class="ghost-button compact-button" @click="$emit('retry-last')">重试本轮回答</button>
          </div>
          <form class="chat-form" @submit.prevent="$emit('send')">
            <!-- 这个组件本身不直接调后端，
                 只把 send / update:inputValue 事件继续往上抛。 -->
            <input
              :value="inputValue"
              class="chat-input"
              :disabled="!candidate || !candidate.interview_started || isTyping"
              placeholder="请输入你的回答"
              @input="$emit('update:inputValue', $event.target.value)"
            />
            <button class="send-button" type="submit" :disabled="!candidate || !candidate.interview_started || isTyping">
              发送
            </button>
          </form>
        </footer>
      </section>
    </template>
  </section>
</template>

<script>
import { THEME_LABELS, THEME_MODES } from "../constants/app.js";
import ChatHistory from "./ChatHistory.vue";
import WelcomePanel from "./WelcomePanel.vue";

export default {
  name: "InterviewPanel",
  components: {
    ChatHistory,
    WelcomePanel,
  },
  props: {
    candidate: {
      type: Object,
      default: null,
    },
    roleOptions: {
      type: Array,
      default: () => [],
    },
    selectedRole: {
      type: String,
      default: "",
    },
    themeMode: {
      type: String,
      default: THEME_MODES.SERIOUS,
    },
    resumeFile: {
      type: [Object, null],
      default: null,
    },
    history: {
      type: Array,
      default: () => [],
    },
    meta: {
      type: Object,
      default: () => ({}),
    },
    showWelcome: {
      type: Boolean,
      default: false,
    },
    inputValue: {
      type: String,
      default: "",
    },
    isTyping: {
      type: Boolean,
      default: false,
    },
    loadingAction: {
      type: String,
      default: "",
    },
    canResume: {
      type: Boolean,
      default: false,
    },
    canRetry: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "update:selectedRole",
    "update:themeMode",
    "resume-file-change",
    "clear-resume",
    "start-interview",
    "end-interview",
    "generate-report",
    "cancel-setup",
    "send",
    "update:inputValue",
    "stop",
    "resume-last",
    "retry-last",
  ],
  data() {
    return {
      // 只控制“配置面板是否显示”，不代表 interview_state 是否已经存在。
      showSetupPanel: !(this.candidate && this.candidate.interview_started),
    };
  },
  computed: {
    hasInterviewSession() {
      return Boolean(this.candidate && this.candidate.interview_started);
    },
    hasResume() {
      return Boolean(this.resumeFile || this.candidate?.resume_filename || this.candidate?.resume_text);
    },
    currentRoleLabel() {
      return this.candidate?.interview_state?.target_role || this.selectedRole || "未设置岗位";
    },
    themeCards() {
      return [
        { value: THEME_MODES.SERIOUS, ...THEME_LABELS[THEME_MODES.SERIOUS] },
        { value: THEME_MODES.LIGHT, ...THEME_LABELS[THEME_MODES.LIGHT] },
        { value: THEME_MODES.SPRINT, ...THEME_LABELS[THEME_MODES.SPRINT] },
      ];
    },
  },
  watch: {
    "candidate.interview_started": {
      immediate: true,
      handler(nextValue) {
        if (nextValue) {
          this.showSetupPanel = false;
        } else {
          this.showSetupPanel = true;
        }
      },
    },
  },
  methods: {
    handleCancelSetup() {
      if (this.hasInterviewSession) {
        this.showSetupPanel = false;
        return;
      }
      this.$emit("cancel-setup");
    },
  },
};
</script>
