<template>
  <QaPanel
    :history="history"
    :meta="meta"
    :show-welcome="showWelcome"
    :input-value="inputValue"
    :is-typing="isTyping"
    :loading-action="loadingAction"
    :can-resume="canResume"
    :can-retry="canRetry"
    @clear-history="$emit('clear-history')"
    @send="$emit('send')"
    @update:inputValue="$emit('update:inputValue', $event)"
    @stop="$emit('stop')"
    @resume-last="$emit('resume-last')"
    @retry-last="$emit('retry-last')"
  />
</template>

<script>
import QaPanel from "../components/QaPanel.vue";

export default {
  name: "QaView",
  components: {
    QaPanel,
  },
  props: {
    history: { type: Array, default: () => [] },
    meta: { type: Object, default: () => ({}) },
    showWelcome: { type: Boolean, default: false },
    inputValue: { type: String, default: "" },
    isTyping: { type: Boolean, default: false },
    loadingAction: { type: String, default: "" },
    canResume: { type: Boolean, default: false },
    canRetry: { type: Boolean, default: false },
  },
  // 当前 view 仍然是轻量透传层。
  // 如果后续需要单独给问答模式加页面级 watch、路由守卫或埋点，
  // 就可以优先放在这一层，而不是污染更底层组件。
  emits: ["clear-history", "send", "update:inputValue", "stop", "resume-last", "retry-last"],
};
</script>
