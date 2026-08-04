<template>
  <div class="qa-workspace">
    <section class="conversation-shell">
      <WelcomePanel
        v-if="showWelcome && !history.length"
        :title="meta.empty_title || '欢迎使用问答模式'"
        :lines="meta.empty_description || []"
      />
      <ChatHistory
        v-else
        :messages="history"
        :can-resume="canResume"
        :can-retry="canRetry"
        @resume-last="emit('resume-last')"
        @retry-last="emit('retry-last')"
      />
    </section>

    <footer class="chat-input-shell">
      <div class="toolbar-row qa-input-toolbar">
        <button class="ghost-button compact-button" :disabled="loadingAction === 'qa-clear'" @click="emit('clear-history')">
          {{ loadingAction === "qa-clear" ? "清空中..." : "清空问答历史" }}
        </button>
        <div v-if="isTyping" class="qa-inline-status">
          <i class="run-pulse running"></i>
          <span>正在组织回答...</span>
        </div>
      </div>
      <!-- 生成中时不额外占一行，而是把原来的发送按钮切换成“停止”。 -->
      <form class="chat-form" @submit.prevent="isTyping ? emit('stop') : emit('send')">
        <input
          :value="inputValue"
          class="chat-input"
          :disabled="isTyping"
          placeholder="请输入你想咨询的问题"
          @input="emit('update:inputValue', $event.target.value)"
        />
        <button :class="['send-button', isTyping ? 'stop-mode' : '']" type="submit">
          {{ isTyping ? "停止" : "发送" }}
        </button>
      </form>
    </footer>
  </div>
</template>

<script setup>
import ChatHistory from "./ChatHistory.vue";
import WelcomePanel from "./WelcomePanel.vue";

defineProps({
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
  agentEvents: { type: Array, default: () => [] },
  currentCitations: { type: Array, default: () => [] },
});

// 这个组件本身不直接请求后端。
// 它更像纯视图层，所有接口请求和状态更新都在 composable 里统一处理。
const emit = defineEmits(["clear-history", "send", "update:inputValue", "stop", "resume-last", "retry-last"]);
</script>
