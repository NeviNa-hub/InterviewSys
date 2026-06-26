<template>
  <!-- 聊天记录容器：
       统一渲染问答模式、模拟面试模式、历史记录详情里的消息列表。 -->
  <div ref="historyShellRef" class="chat-history-shell" @scroll="handleScroll">
    <div class="chat-history">
      <button v-if="hasMoreMessages" class="text-button load-more-button" @click="showMoreMessages">加载更早消息</button>

      <div
        v-for="(message, index) in visibleMessages"
        :key="`${startIndex + index}-${message.role}-${String(message.content || '').slice(0, 12)}`"
        :class="['chat-row', message.role === 'user' ? 'user' : 'assistant']"
      >
        <!-- role 决定气泡左右布局和头像：
             user -> 用户消息
             assistant -> AI / 面试官消息 -->
        <div class="avatar">{{ message.role === "user" ? "👤" : "🤖" }}</div>
        <div class="bubble">
          <div class="bubble-content">{{ message.content }}</div>
          <div v-if="message.status === 'interrupted'" class="bubble-status interrupted">已中断，可继续生成或重试</div>
          <div v-else-if="message.status === 'generating'" class="bubble-status">生成中...</div>
        </div>
      </div>

      <div ref="bottomAnchorRef" class="history-bottom-anchor"></div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { debounce, throttle } from "../utils/timing.js";

// 长列表策略：
// 不是一上来就渲染全部消息，而是先渲染最近一段，再让用户按需加载更早内容。
const INITIAL_VISIBLE_COUNT = 80;
const LOAD_MORE_STEP = 60;
const AUTO_SCROLL_THRESHOLD = 120;

export default {
  name: "ChatHistory",
  props: {
    // 完整消息数组由父组件传入。
    // 长列表优化在当前组件里做渐进展示，避免一次性渲染过多节点。
    messages: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    const historyShellRef = ref(null);
    const bottomAnchorRef = ref(null);
    const visibleCount = ref(INITIAL_VISIBLE_COUNT);
    const shouldStickToBottom = ref(true);

    // visibleMessages 是派生状态：
    // 只截取最近 visibleCount 条消息给模板渲染。
    const visibleMessages = computed(() => props.messages.slice(-visibleCount.value));
    const hasMoreMessages = computed(() => props.messages.length > visibleCount.value);
    const startIndex = computed(() => Math.max(0, props.messages.length - visibleCount.value));

    // 根据当前滚动位置判断用户是不是还停留在底部附近。
    // 只有接近底部时，新增消息才自动滚到底，避免用户回看历史时被强制拉走。
    const updateStickState = () => {
      const shell = historyShellRef.value;
      if (!shell) {
        return;
      }
      const distanceToBottom = shell.scrollHeight - shell.scrollTop - shell.clientHeight;
      shouldStickToBottom.value = distanceToBottom <= AUTO_SCROLL_THRESHOLD;
    };

    const throttledScroll = throttle(updateStickState, 100);
    const debouncedResize = debounce(() => {
      if (shouldStickToBottom.value) {
        scrollToBottom("auto");
      }
    }, 120);

    function handleScroll() {
      throttledScroll();
    }

    function showMoreMessages() {
      // 每次点击“加载更早消息”，逐步增加渲染数量。
      // 这样可以避免聊天记录很多时一次性渲染太多 DOM 节点。
      visibleCount.value += LOAD_MORE_STEP;
    }

    function scrollToBottom(behavior = "smooth") {
      // 如果用户本来就在底部附近，新消息到来时就自动滚动到底部。
      nextTick(() => {
        bottomAnchorRef.value?.scrollIntoView({ behavior, block: "end" });
      });
    }

    watch(
      () => props.messages.length,
      (nextLength, previousLength) => {
        // 新消息到来时，如果用户原本就在底部附近，则自动滚到底部。
        // 这能兼顾“新消息跟随”与“查看历史时不被打断”。
        if (nextLength <= previousLength) {
          return;
        }

        if (shouldStickToBottom.value) {
          scrollToBottom(previousLength === 0 ? "auto" : "smooth");
        }
      },
    );

    watch(
      () => props.messages,
      () => {
        // 如果消息总量不大，就恢复默认可见条数，避免切换会话后保留上次“展开很多条”的状态。
        if (props.messages.length <= INITIAL_VISIBLE_COUNT) {
          visibleCount.value = INITIAL_VISIBLE_COUNT;
        }
      },
      { deep: true },
    );

    onMounted(() => {
      scrollToBottom("auto");
      window.addEventListener("resize", debouncedResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", debouncedResize);
    });

    return {
      historyShellRef,
      bottomAnchorRef,
      visibleMessages,
      hasMoreMessages,
      startIndex,
      handleScroll,
      showMoreMessages,
    };
  },
};
</script>
