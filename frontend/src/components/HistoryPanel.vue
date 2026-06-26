<template>
  <section class="history-shell">
    <!-- 左侧：历史记录列表 -->
    <div class="history-list-card">
      <div class="history-header">
        <h2>历史面试记录</h2>
        <button class="ghost-button compact-button" :disabled="loadingAction === 'history'" @click="$emit('refresh-history')">
          {{ loadingAction === "history" ? "刷新中..." : "刷新列表" }}
        </button>
      </div>

      <PanelSkeleton v-if="loadingAction === 'history' && !records.length" :rows="3" compact />

      <div v-else-if="!records.length" class="welcome-panel compact-empty">
        <h2>还没有历史面试记录</h2>
        <p>完成一轮模拟面试并生成报告后，这里会自动沉淀成历史记录。</p>
      </div>

      <div v-else class="history-list">
        <button
          v-for="record in records"
          :key="record.id"
          :class="['history-item', selectedRecord?.id === record.id ? 'active' : '']"
          @click="$emit('open-record', record.id)"
        >
          <div class="history-item-top">
            <strong>{{ record.role_name || "未命名岗位" }}</strong>
            <span>{{ record.score }} / 100</span>
          </div>
          <div class="history-item-meta">{{ record.created_at }}</div>
          <div class="history-item-meta">
            {{ record.resume_filename ? `简历：${record.resume_filename}` : "未上传简历" }}
          </div>
        </button>
      </div>
    </div>

    <!-- 右侧：当前选中记录的详情
         包括报告正文、历史对话、恢复按钮、下载按钮。 -->
    <div class="history-detail-card">
      <PanelSkeleton v-if="loadingAction === 'history' && !selectedRecord" :rows="4" />

      <div v-else-if="!selectedRecord" class="welcome-panel compact-empty">
        <h2>选择一条历史记录</h2>
        <p>你可以查看完整报告，也可以一键恢复到当前面试面板里继续复盘。</p>
      </div>

      <template v-else>
        <div class="history-header">
          <h2>{{ selectedRecord.role_name }}</h2>
          <div class="history-actions">
            <button class="ghost-button compact-button" @click="$emit('restore-record', selectedRecord.id)">恢复到当前会话</button>
            <a class="text-button" :href="`/api/history/interviews/${selectedRecord.id}/download`" download>下载报告</a>
          </div>
        </div>

        <div class="info-banner history-meta-banner">
          <span>时间：{{ selectedRecord.created_at }}</span>
          <span>得分：{{ selectedRecord.score }} / 100</span>
          <span>{{ selectedRecord.resume_filename ? `简历：${selectedRecord.resume_filename}` : "未上传简历" }}</span>
        </div>

        <article class="report-content history-report">{{ selectedRecord.report_text }}</article>
        <!-- 历史记录详情也复用 ChatHistory，说明该组件是通用消息渲染层。 -->
        <ChatHistory :messages="selectedRecord.history || []" />
      </template>
    </div>
  </section>
</template>

<script>
// 历史记录面板：
// 1. 左侧列表展示历史面试摘要
// 2. 右侧查看报告详情和完整对话
// 3. 支持恢复到当前工作台继续复盘
// 这里体现的是一个很典型的“主从视图”设计：
// 左侧选中某条记录，右侧展示对应详情。
import ChatHistory from "./ChatHistory.vue";
import PanelSkeleton from "./PanelSkeleton.vue";

export default {
  name: "HistoryPanel",
  components: {
    ChatHistory,
    PanelSkeleton,
  },
  props: {
    records: {
      type: Array,
      default: () => [],
    },
    selectedRecord: {
      type: Object,
      default: null,
    },
    loadingAction: {
      type: String,
      default: "",
    },
  },
  emits: ["refresh-history", "open-record", "restore-record"],
};
</script>
