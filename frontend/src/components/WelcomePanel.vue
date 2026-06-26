<template>
  <div class="welcome-panel">
    <h2>{{ title }}</h2>
    <p v-for="line in lines" :key="line">{{ line }}</p>
  </div>
</template>

<script>
export default {
  name: "WelcomePanel",
  props: {
    // title + lines 的结构很适合做可配置空状态：
    // 不同模式只要传不同文案，就能复用同一套组件。
    title: {
      type: String,
      default: "",
    },
    lines: {
      type: Array,
      default: () => [],
    },
  },
};
</script>
