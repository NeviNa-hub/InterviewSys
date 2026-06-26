<template>
  <div>
    <!-- 顶部工具条：
         放轻量级动作，例如清空历史、继续生成、重试回答。 -->
    <div class="toolbar-row">
      <button class="ghost-button compact-button" :disabled="loadingAction === 'qa-clear'" @click="$emit('clear-history')">
        {{ loadingAction === "qa-clear" ? "清空中..." : "清空问答历史" }}
      </button>
      <div v-if="canResume || canRetry" class="retry-actions">
        <button v-if="canResume" class="ghost-button compact-button" @click="$emit('resume-last')">继续生成</button>
        <button v-if="canRetry" class="ghost-button compact-button" @click="$emit('retry-last')">重试本轮回答</button>
      </div>
    </div>

    <section class="conversation-shell">
      <!-- showWelcome=true 时显示空状态欢迎区，
           否则复用 ChatHistory 展示真实消息列表。 -->
      <WelcomePanel
        v-if="showWelcome && !history.length"
        :title="meta.empty_title || '欢迎使用问答模式'"
        :lines="meta.empty_description || []"
      />
      <ChatHistory v-else :messages="history" />
    </section>

    <footer class="chat-input-shell">
      <!-- 当前正在流式返回时，输入框切换成“停止当前回复”按钮。
           这是防止用户在同一轮回复未完成时继续发送新问题。 -->
      <button v-if="isTyping" class="stop-button" @click="$emit('stop')">停止当前回复</button>
      <form v-else class="chat-form" @submit.prevent="$emit('send')">
        <input
          :value="inputValue"
          class="chat-input"
          placeholder="请输入你想咨询的问题"
          @input="$emit('update:inputValue', $event.target.value)"
        />
        <button class="send-button" type="submit">发送</button>
      </form>
    </footer>
  </div>
</template>

<script>
// 问答模式面板：
// 1. 展示欢迎语或聊天历史
// 2. 负责发送问题、停止流式输出、继续生成和重试
// 3. 顶部保留轻量工具栏，便于后续继续扩展搜索或筛选能力
// 这类组件是“展示组件”：
// 它不直接碰接口，只通过 emits 把用户动作告诉上层。
import ChatHistory from "./ChatHistory.vue";
import WelcomePanel from "./WelcomePanel.vue";

export default {
  name: "QaPanel",
  components: {
    ChatHistory,
    WelcomePanel,
  },
  props: {
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
  emits: ["clear-history", "send", "update:inputValue", "stop", "resume-last", "retry-last"],
};
</script>
