<template>
  <HistoryPanel
    :records="records"
    :selected-record="selectedRecord"
    :loading-action="loadingAction"
    @refresh-history="$emit('refresh-history')"
    @open-record="$emit('open-record', $event)"
    @restore-record="$emit('restore-record', $event)"
  />
</template>

<script>
import HistoryPanel from "../components/HistoryPanel.vue";

export default {
  name: "HistoryView",
  components: {
    HistoryPanel,
  },
  props: {
    records: { type: Array, default: () => [] },
    selectedRecord: { type: Object, default: null },
    loadingAction: { type: String, default: "" },
  },
  // 这里本身不写业务逻辑，主要负责把事件继续向上透传。
  emits: ["refresh-history", "open-record", "restore-record"],
};
</script>
