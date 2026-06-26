<template>
  <div class="entry-shell">
    <div class="entry-card auth-card">
      <div class="entry-eyebrow">智能面试辅导系统</div>
      <h1>先登录，再进入你的专属面试工作台</h1>
      <p>现在已经升级为正式登录体系，支持邮箱 + 密码登录、用户隔离、历史记录和报告留存。</p>

      <div class="auth-switcher">
        <!-- 这里只切换认证模式，不切换路由。
             当前项目的登录页和注册页共用同一块面板。 -->
        <button :class="['mode-button', authMode === 'login' ? 'active' : '']" @click="$emit('update:authMode', 'login')">
          登录
        </button>
        <button :class="['mode-button', authMode === 'register' ? 'active' : '']" @click="$emit('update:authMode', 'register')">
          注册
        </button>
      </div>

      <input
        v-if="authMode === 'register'"
        :value="registerForm.display_name"
        class="text-input entry-input"
        placeholder="请输入用户名"
        @input="$emit('update:registerForm', { ...registerForm, display_name: $event.target.value })"
      />
      <input
        :value="authMode === 'login' ? loginForm.email : registerForm.email"
        class="text-input entry-input"
        placeholder="请输入邮箱"
        @input="
          $emit(
            authMode === 'login' ? 'update:loginForm' : 'update:registerForm',
            authMode === 'login'
              ? { ...loginForm, email: $event.target.value }
              : { ...registerForm, email: $event.target.value },
          )
        "
      />
      <input
        :value="authMode === 'login' ? loginForm.password : registerForm.password"
        class="text-input entry-input"
        type="password"
        placeholder="请输入密码"
        @input="
          $emit(
            authMode === 'login' ? 'update:loginForm' : 'update:registerForm',
            authMode === 'login'
              ? { ...loginForm, password: $event.target.value }
              : { ...registerForm, password: $event.target.value },
          )
        "
        @keyup.enter="authMode === 'login' ? $emit('login') : $emit('register')"
      />

      <button
        class="primary-button entry-button"
        :disabled="loadingAction === 'login' || loadingAction === 'register'"
        @click="authMode === 'login' ? $emit('login') : $emit('register')"
      >
        {{
          authMode === "login"
            ? loadingAction === "login"
              ? "登录中..."
              : "登录系统"
            : loadingAction === "register"
              ? "注册中..."
              : "注册并进入"
        }}
      </button>

      <div v-if="errorMessage" class="error-banner entry-error">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: "AuthPanel",
  props: {
    // 表单数据都由上层状态层管理。
    // 这个组件只负责把用户输入通过 emits 往上传。
    authMode: {
      type: String,
      default: "login",
    },
    loginForm: {
      type: Object,
      required: true,
    },
    registerForm: {
      type: Object,
      required: true,
    },
    loadingAction: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  emits: ["update:authMode", "update:loginForm", "update:registerForm", "login", "register"],
};
</script>
