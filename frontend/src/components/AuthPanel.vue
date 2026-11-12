<template>
  <div class="auth-page">
    <!-- 左侧品牌区：纯展示 -->
    <aside class="auth-hero">
      <div class="auth-brand">
        <span class="auth-brand-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4.2 3.15A.6.6 0 0 1 4 18.75V5.5Z"
              fill="#fff"
            />
            <circle cx="9" cy="9.5" r="1.1" fill="#173a5e" />
            <circle cx="12.5" cy="9.5" r="1.1" fill="#173a5e" />
            <circle cx="16" cy="9.5" r="1.1" fill="#173a5e" />
          </svg>
        </span>
        <span class="auth-brand-name">智能面试辅导系统</span>
      </div>

      <div class="auth-hero-copy">
        <h1>先登录，<br />进入你的专属面试工作台</h1>
        <p>邮箱 + 密码登录，用户隔离，历史记录与面试报告完整留存。</p>
      </div>

      <div class="auth-hero-footer">© 2026 智能面试辅导系统</div>
    </aside>

    <!-- 右侧表单区 -->
    <main class="auth-main">
      <div class="auth-card">
        <h2>{{ authMode === "login" ? "登录账号" : "注册账号" }}</h2>
        <p class="auth-subtitle">
          {{
            authMode === "login"
              ? "欢迎回来，请使用你的账号登录。"
              : "创建一个账号，开始你的面试训练。"
          }}
        </p>

        <div class="auth-tabs">
          <button
            :class="['auth-tab', authMode === 'login' ? 'active' : '']"
            @click="emit('update:authMode', 'login')"
          >
            登录
          </button>
          <button
            :class="['auth-tab', authMode === 'register' ? 'active' : '']"
            @click="emit('update:authMode', 'register')"
          >
            注册
          </button>
        </div>

        <label v-if="authMode === 'register'" class="auth-field">
          <span class="auth-field-label">用户名</span>
          <span class="auth-field-control">
            <svg
              class="auth-field-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <circle cx="12" cy="8" r="3.4" />
              <path d="M5 19.5c.9-3.4 3.8-5 7-5s6.1 1.6 7 5" />
            </svg>
            <input
              :value="registerForm.display_name"
              placeholder="请输入用户名"
              @input="
                emit('update:registerForm', {
                  ...registerForm,
                  display_name: $event.target.value,
                })
              "
            />
          </span>
        </label>

        <label class="auth-field">
          <span class="auth-field-label">邮箱</span>
          <span class="auth-field-control">
            <svg
              class="auth-field-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
              <path d="m4.5 7 7.5 5.5L19.5 7" />
            </svg>
            <input
              :value="authMode === 'login' ? loginForm.email : registerForm.email"
              placeholder="请输入邮箱"
              @input="handleEmailInput"
            />
          </span>
        </label>

        <label class="auth-field">
          <span class="auth-field-label">密码</span>
          <span class="auth-field-control">
            <svg
              class="auth-field-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <rect x="5" y="10.5" width="14" height="9" rx="2" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </svg>
            <input
              :value="authMode === 'login' ? loginForm.password : registerForm.password"
              type="password"
              placeholder="请输入密码"
              @input="handlePasswordInput"
              @keyup.enter="authMode === 'login' ? emit('login') : emit('register')"
            />
          </span>
        </label>

        <div v-if="authMode === 'login'" class="auth-options">
          <!-- “记住我”仅为界面展示，不涉及登录逻辑变更 -->
          <label class="auth-remember">
            <input v-model="rememberMe" type="checkbox" />
            <span>记住我</span>
          </label>
          <span class="auth-forgot">忘记密码?</span>
        </div>

        <button
          class="auth-submit"
          :disabled="loadingAction === 'login' || loadingAction === 'register'"
          @click="authMode === 'login' ? emit('login') : emit('register')"
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

        <div v-if="errorMessage" class="auth-error">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          >
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8v5" />
            <circle cx="12" cy="16.2" r="0.4" fill="currentColor" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <div class="auth-alt">
          <template v-if="authMode === 'login'">
            还没有账号？<button
              class="auth-alt-link"
              @click="emit('update:authMode', 'register')"
            >
              立即注册
            </button>
          </template>
          <template v-else>
            已有账号？<button
              class="auth-alt-link"
              @click="emit('update:authMode', 'login')"
            >
              直接登录
            </button>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
// <script setup> 是 Vue 3 里更现代的写法。
// 相比 export default，它更适合把模板直接用到的变量和函数平铺暴露出来，
// 写起来更简洁，也更符合现在多数 Vue 3 工程的风格。
import { ref } from "vue";

const props = defineProps({
  // 这是一个“受控表单组件”：
  // 表单值不在组件内部长期保存，而是由上层 store 统一管理。
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
});

// 组件通信方式：
// - defineProps：父传子
// - defineEmits：子传父
const emit = defineEmits([
  "update:authMode",
  "update:loginForm",
  "update:registerForm",
  "login",
  "register",
]);

// “记住我”仅作界面展示，不改变原有登录逻辑
const rememberMe = ref(false);

function handleEmailInput(event) {
  const value = event.target.value;
  if (props.authMode === "login") {
    emit("update:loginForm", { ...props.loginForm, email: value });
    return;
  }
  emit("update:registerForm", { ...props.registerForm, email: value });
}

function handlePasswordInput(event) {
  const value = event.target.value;
  if (props.authMode === "login") {
    emit("update:loginForm", { ...props.loginForm, password: value });
    return;
  }
  emit("update:registerForm", { ...props.registerForm, password: value });
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  gap: clamp(2.5rem, 6vw, 6rem);
  min-height: 100vh;
  background: #fff;
  color: #1c2b3a;
}

/* ---------- 左侧品牌区 ---------- */
.auth-hero {
  flex: none;
  width: min(480px, 100%);
  display: flex;
  flex-direction: column;
  padding: 2.2rem 0;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.auth-brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #173a5e;
}

.auth-brand-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1c2b3a;
}

.auth-hero-copy {
  margin: auto 0;
  max-width: 460px;
}

.auth-hero-copy h1 {
  margin: 0;
  font-size: clamp(1.9rem, 3.2vw, 2.6rem);
  font-weight: 800;
  line-height: 1.3;
  color: #14273c;
}

.auth-hero-copy p {
  margin: 1rem 0 0;
  color: #6b7a89;
  font-size: 0.95rem;
  line-height: 1.7;
}

.auth-hero-footer {
  color: #9aa7b4;
  font-size: 0.8rem;
}

/* ---------- 右侧表单区 ---------- */
.auth-main {
  flex: none;
  width: min(440px, 100%);
  display: grid;
  place-items: center;
  padding: 2rem 0;
}

.auth-card {
  width: min(400px, 100%);
}

.auth-card h2 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #14273c;
}

.auth-subtitle {
  margin: 0.55rem 0 0;
  color: #6b7a89;
  font-size: 0.88rem;
}

.auth-tabs {
  display: flex;
  gap: 1.6rem;
  margin-top: 1.4rem;
  border-bottom: 1px solid #edf1f5;
}

.auth-tab {
  position: relative;
  padding: 0 0 0.7rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  color: #7a8896;
  transition: color 120ms ease;
}

.auth-tab.active {
  color: #14273c;
}

.auth-tab.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: #173a5e;
}

.auth-field {
  display: block;
  margin-top: 1.1rem;
}

.auth-field-label {
  display: block;
  margin-bottom: 0.45rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #3d4f61;
}

.auth-field-control {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.85rem;
  border: 1px solid #e3e9ef;
  border-radius: 10px;
  background: #fff;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.auth-field-control:focus-within {
  border-color: #173a5e;
  box-shadow: 0 0 0 3px rgba(23, 58, 94, 0.08);
}

.auth-field-icon {
  flex: none;
  color: #9aa7b4;
}

.auth-field-control input {
  flex: 1;
  min-width: 0;
  padding: 0.72rem 0;
  border: none;
  outline: none;
  background: transparent;
  color: #1c2b3a;
  font-size: 0.92rem;
}

.auth-field-control input::placeholder {
  color: #b3bec9;
}

.auth-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  font-size: 0.85rem;
}

.auth-remember {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #3d4f61;
  cursor: pointer;
}

.auth-remember input {
  accent-color: #173a5e;
  cursor: pointer;
}

.auth-forgot {
  color: #3d4f61;
}

.auth-submit {
  width: 100%;
  margin-top: 1.4rem;
  padding: 0.78rem 0;
  border: none;
  border-radius: 10px;
  background: #173a5e;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease, opacity 120ms ease;
}

.auth-submit:hover:not(:disabled) {
  background: #102c48;
  transform: translateY(-1px);
}

.auth-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: #fdeeee;
  color: #c04545;
  font-size: 0.85rem;
  line-height: 1.5;
}

.auth-alt {
  margin-top: 1.6rem;
  text-align: center;
  font-size: 0.85rem;
  color: #7a8896;
}

.auth-alt-link {
  border: none;
  background: transparent;
  padding: 0;
  color: #173a5e;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.auth-alt-link:hover {
  text-decoration: underline;
}

/* ---------- 窄屏适配：上下堆叠 ---------- */
@media (max-width: 860px) {
  .auth-page {
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 0 1.5rem;
  }

  .auth-hero {
    width: 100%;
    padding: 1.6rem 0;
  }

  .auth-hero-copy {
    margin: 2.5rem 0;
  }

  .auth-hero-footer {
    display: none;
  }
}
</style>
