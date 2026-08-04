<template>
  <aside v-if="events.length" class="agent-execution-panel">
    <button class="agent-execution-heading" type="button" @click="expanded = !expanded">
      <span><i :class="['run-pulse', running ? 'running' : '']"></i>Agent 执行过程</span>
      <small>{{ running ? "执行中" : `${events.length} 个事件` }} · {{ expanded ? "收起" : "展开" }}</small>
    </button>
    <ol v-show="expanded" class="agent-step-list">
      <li v-for="event in visibleEvents" :key="event.__key || `${event.run_id}-${event.sequence}-${event.type}`">
        <span :class="['agent-step-dot', `event-${event.type}`]"></span>
        <div><strong>{{ nodeLabel(event.node, event.type) }}</strong><p>{{ event.content || event.detail || event.type }}</p></div>
        <time>{{ formatTime(event.timestamp) }}</time>
      </li>
    </ol>
    <div v-if="citations.length" v-show="expanded" class="citation-strip">
      <strong>本轮引用</strong>
      <span v-for="item in citations" :key="item.id || item.chunk_id">{{ item.source }} · {{ item.id || item.chunk_id }}</span>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({ events: { type: Array, default: () => [] }, running: { type: Boolean, default: false }, citations: { type: Array, default: () => [] } });
const expanded = ref(true);
const visibleEvents = computed(() => props.events.filter((event) => event.type !== "token").slice(-12));
const labels = { workflow: "工作流", router: "Router Agent", resume_analyst: "Resume Analyst", planner: "Interview Planner", knowledge_retrieval: "知识库检索", evidence_judge: "Evidence Judge", evaluation_agent: "Evaluation Agent", state_machine: "面试状态机", interview_agent: "Interview Agent", report_agent: "Report Agent" };
function nodeLabel(node, type) { return labels[node] || ({ run_started: "任务启动", run_finished: "任务完成", run_error: "任务失败" }[type] || node || type); }
function formatTime(value) { return value ? new Date(value).toLocaleTimeString("zh-CN", { hour12: false }) : ""; }
</script>
