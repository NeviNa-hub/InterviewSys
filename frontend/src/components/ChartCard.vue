<template>
  <article class="platform-card chart-card">
    <div class="platform-card-heading">
      <h3>{{ title }}</h3>
      <span>{{ subtitle }}</span>
    </div>
    <div v-if="hasData" ref="chartRef" class="chart-canvas"></div>
    <div v-else class="platform-empty chart-empty">{{ emptyText }}</div>
  </article>
</template>

<script setup>
import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  type: { type: String, default: "bar" },
  data: { type: Array, default: () => [] },
  emptyText: { type: String, default: "暂无可视化数据。" },
});

const chartRef = ref(null);
let chart = null;

const hasData = computed(() => props.data.some((item) => Number(item.value ?? item.score ?? item.latency_ms ?? 0) > 0));

function buildOption() {
  const textColor = "#38516c";
  if (props.type === "pie") {
    return {
      tooltip: { trigger: "item" },
      color: ["#2f8fe8", "#75c6a7", "#f0a35a", "#e56f63", "#8b9cff"],
      series: [
        {
          type: "pie",
          radius: ["48%", "72%"],
          data: props.data,
          label: { color: textColor },
        },
      ],
    };
  }
  if (props.type === "line") {
    return {
      tooltip: { trigger: "axis" },
      grid: { left: 34, right: 20, top: 24, bottom: 30 },
      xAxis: { type: "category", data: props.data.map((item) => item.label || item.name), axisLabel: { color: textColor } },
      yAxis: { type: "value", axisLabel: { color: textColor } },
      series: [
        {
          type: "line",
          smooth: true,
          symbolSize: 7,
          areaStyle: { opacity: 0.14 },
          lineStyle: { width: 3 },
          data: props.data.map((item) => item.score ?? item.latency_ms ?? item.value ?? 0),
          color: "#2f8fe8",
        },
      ],
    };
  }
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 34, right: 20, top: 24, bottom: 30 },
    xAxis: { type: "category", data: props.data.map((item) => item.name || item.label), axisLabel: { color: textColor } },
    yAxis: { type: "value", axisLabel: { color: textColor } },
    series: [
      {
        type: "bar",
        barWidth: 22,
        data: props.data.map((item) => item.value ?? item.score ?? 0),
        itemStyle: { borderRadius: [9, 9, 2, 2], color: "#2f8fe8" },
      },
    ],
  };
}

function renderChart() {
  if (!chartRef.value || !hasData.value) return;
  chart ||= echarts.init(chartRef.value);
  chart.setOption(buildOption(), true);
}

watch(() => [props.type, props.data], () => nextTick(renderChart), { deep: true });

onMounted(() => {
  nextTick(renderChart);
  window.addEventListener("resize", renderChart);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", renderChart);
  chart?.dispose();
  chart = null;
});
</script>
