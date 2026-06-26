<template>
  <InterviewPanel
    :candidate="candidate"
    :role-options="roleOptions"
    :selected-role="selectedRole"
    :theme-mode="themeMode"
    :resume-file="resumeFile"
    :history="history"
    :meta="meta"
    :show-welcome="showWelcome"
    :input-value="inputValue"
    :is-typing="isTyping"
    :loading-action="loadingAction"
    :can-resume="canResume"
    :can-retry="canRetry"
    @update:selectedRole="$emit('update:selectedRole', $event)"
    @update:themeMode="$emit('update:themeMode', $event)"
    @resume-file-change="$emit('resume-file-change', $event)"
    @clear-resume="$emit('clear-resume')"
    @start-interview="$emit('start-interview')"
    @end-interview="$emit('end-interview')"
    @generate-report="$emit('generate-report')"
    @cancel-setup="$emit('cancel-setup')"
    @send="$emit('send')"
    @update:inputValue="$emit('update:inputValue', $event)"
    @stop="$emit('stop')"
    @resume-last="$emit('resume-last')"
    @retry-last="$emit('retry-last')"
  />
</template>

<script>
import InterviewPanel from "../components/InterviewPanel.vue";

export default {
  name: "InterviewView",
  components: {
    InterviewPanel,
  },
  props: {
    candidate: { type: Object, default: null },
    roleOptions: { type: Array, default: () => [] },
    selectedRole: { type: String, default: "" },
    themeMode: { type: String, default: "serious" },
    resumeFile: { type: [Object, null], default: null },
    history: { type: Array, default: () => [] },
    meta: { type: Object, default: () => ({}) },
    showWelcome: { type: Boolean, default: false },
    inputValue: { type: String, default: "" },
    isTyping: { type: Boolean, default: false },
    loadingAction: { type: String, default: "" },
    canResume: { type: Boolean, default: false },
    canRetry: { type: Boolean, default: false },
  },
  // InterviewView 是页面级中间层：
  // 让 App.vue 不必直接和大型展示组件耦合太深。
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
};
</script>
