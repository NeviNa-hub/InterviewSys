<template>
  <header class="mode-header-shell">
    <div class="mode-header">
      <div class="mode-header-copy">
        <!-- meta 决定当前模式的标题和说明文案。 -->
        <h1>{{ meta.title || "智能面试辅导系统" }}</h1>
        <p>{{ meta.caption || "" }}</p>
        <div v-if="progressMessage" class="progress-banner">{{ progressMessage }}</div>
      </div>
      <div class="weather-cloud">
        <!-- weather 是启动阶段或后端接口返回的天气信息。 -->
        <p class="weather-city">📍 当前城市：{{ weather.city }}</p>
        <p class="weather-text">{{ weather.text }}</p>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: "ModeHeader",
  props: {
    // progressMessage 是顶部的细粒度状态提示。
    // 它通常来自流式请求过程中的 status 事件。
    meta: {
      type: Object,
      default: () => ({}),
    },
    weather: {
      type: Object,
      default: () => ({
        city: "未知城市",
        text: "天气获取中...",
      }),
    },
    progressMessage: {
      type: String,
      default: "",
    },
  },
};
</script>
