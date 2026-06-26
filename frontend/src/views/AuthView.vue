<template>
  <AuthPanel
    :auth-mode="authMode"
    :login-form="loginForm"
    :register-form="registerForm"
    :loading-action="loadingAction"
    :error-message="errorMessage"
    @update:authMode="$emit('update:authMode', $event)"
    @update:loginForm="$emit('update:loginForm', $event)"
    @update:registerForm="$emit('update:registerForm', $event)"
    @login="$emit('login')"
    @register="$emit('register')"
  />
</template>

<script>
import AuthPanel from "../components/AuthPanel.vue";

export default {
  name: "AuthView",
  components: {
    AuthPanel,
  },
  props: {
    authMode: { type: String, default: "login" },
    loginForm: { type: Object, required: true },
    registerForm: { type: Object, required: true },
    loadingAction: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
  },
  // view 层的职责是“承上启下”：
  // 上接 App.vue / store / composable，
  // 下接真正的展示组件 AuthPanel。
  emits: ["update:authMode", "update:loginForm", "update:registerForm", "login", "register"],
};
</script>
