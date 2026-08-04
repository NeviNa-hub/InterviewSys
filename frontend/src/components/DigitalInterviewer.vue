<template>
  <aside v-if="enabled" class="digital-interviewer" :class="[`state-${visualState}`]">
    <div class="digital-header">
      <div>
        <strong>数字面试官</strong>
        <span>{{ statusText }}</span>
      </div>
      <button class="sidebar-icon-button" type="button" title="关闭数字人" @click="emit('update:enabled', false)">×</button>
    </div>

    <div class="digital-stage">
      <!-- 如果配置了 VITE_LIVE2D_URL，就嵌入 Live2D-web。
           例如把 Live2D-web 跑在 http://127.0.0.1:5174 后，设置 VITE_LIVE2D_URL=http://127.0.0.1:5174/。 -->
      <iframe
        v-if="live2dUrl"
        class="digital-live2d-frame"
        :class="{ loaded: live2dLoaded }"
        :src="live2dUrl"
        title="Live2D interviewer"
        @load="live2dLoaded = true"
      ></iframe>

      <!--
        轻量兜底形象：不依赖第三方库，保证主系统一定能跑。
        如果 Live2D 地址没配、服务没启动或 iframe 还没加载完成，就先显示这个形象，
        避免用户只听到声音却看不到“面试官画面”。
      -->
      <div v-if="!live2dUrl || !live2dLoaded" class="digital-avatar-figure">
        <div class="avatar-head">
          <span class="avatar-eye left"></span>
          <span class="avatar-eye right"></span>
          <span class="avatar-mouth"></span>
        </div>
        <div class="avatar-body"></div>
      </div>
    </div>

    <div class="digital-actions">
      <button class="ghost-button compact-button" type="button" :disabled="!speechSupported" @click="speakLatest">
        播放语音
      </button>
      <button
        :class="['primary-button', 'compact-button', recognizing ? 'stop-mode' : '']"
        type="button"
        :disabled="!recognitionSupported"
        @click="toggleRecognition"
      >
        {{ recognizing ? "停止录音" : "语音回答" }}
      </button>
    </div>

    <div class="digital-agent-status">
      <strong>{{ agentStageTitle }}</strong>
      <span>{{ agentStageDetail }}</span>
      <div v-if="interviewPlan.length" class="digital-plan-tags">
        <i v-for="item in interviewPlan.slice(0, 4)" :key="item.name || item.focus">{{ item.name || "能力维度" }}</i>
      </div>
    </div>

    <p class="digital-tip">{{ helperText }}</p>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  enabled: { type: Boolean, default: false },
  speaking: { type: Boolean, default: false },
  latestText: { type: String, default: "" },
  agentEvents: { type: Array, default: () => [] },
  interviewPlan: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:enabled", "voice-input"]);

const live2dUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_LIVE2D_URL) ||
  "";
const recognizing = ref(false);
const lastSpokenText = ref("");
const live2dLoaded = ref(false);
let recognition = null;

const speechSupported = computed(() => typeof window !== "undefined" && "speechSynthesis" in window);
const recognitionSupported = computed(
  () => typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
);
const visualState = computed(() => {
  if (recognizing.value) return "listening";
  if (props.speaking) return "speaking";
  return "idle";
});
const statusText = computed(() => {
  if (recognizing.value) return "正在聆听你的回答";
  if (props.speaking) return "正在提问";
  return "待机中";
});
const helperText = computed(() => {
  if (!recognitionSupported.value) return "当前浏览器不支持语音识别，可以继续使用文字输入。";
  if (!speechSupported.value) return "当前浏览器不支持语音播报，可以继续使用文字输入。";
  return "支持语音播报和语音回答，结果会自动填入回答框。";
});
const latestAgentEvent = computed(() => [...props.agentEvents].reverse().find((event) => event?.content || event?.node));
const agentStageTitle = computed(() => {
  if (recognizing.value) return "候选人语音输入中";
  if (props.speaking) return "面试官正在组织问题";
  return "Agent 面试流程待命";
});
const agentStageDetail = computed(() => {
  const event = latestAgentEvent.value;
  if (event?.content) return event.content;
  if (event?.node) return `当前节点：${event.node}`;
  if (props.interviewPlan.length) return `已加载 ${props.interviewPlan.length} 个能力维度的面试计划`;
  return "开启后会展示分析简历、规划题目、检索知识、评估回答等状态。";
});

function speakLatest() {
  if (!speechSupported.value || !props.latestText.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(props.latestText.replace(/\s+/g, " ").slice(0, 260));
  utterance.lang = "zh-CN";
  // rate 控制语速。1 是默认语速，这里略微调快，让面试官反馈更利落。
  utterance.rate = 1.22;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  lastSpokenText.value = props.latestText;
}

function buildRecognition() {
  if (!recognitionSupported.value) return null;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const instance = new Recognition();
  instance.lang = "zh-CN";
  instance.interimResults = false;
  instance.continuous = false;
  instance.onresult = (event) => {
    const transcript = Array.from(event.results || [])
      .map((result) => result?.[0]?.transcript || "")
      .join("")
      .trim();
    if (transcript) emit("voice-input", transcript);
  };
  instance.onend = () => {
    recognizing.value = false;
  };
  instance.onerror = () => {
    recognizing.value = false;
  };
  return instance;
}

function toggleRecognition() {
  if (!recognitionSupported.value) return;
  if (recognizing.value) {
    recognition?.stop();
    recognizing.value = false;
    return;
  }
  recognition = buildRecognition();
  if (!recognition) return;
  recognizing.value = true;
  recognition.start();
}

watch(
  () => props.latestText,
  (text) => {
    if (!props.enabled || props.speaking || !text || text === lastSpokenText.value) return;
    speakLatest();
  },
);

onBeforeUnmount(() => {
  recognition?.stop?.();
  if (speechSupported.value) window.speechSynthesis.cancel();
});
</script>
