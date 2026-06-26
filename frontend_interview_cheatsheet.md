# 前端面试速记版

## 1. TypeScript 基础高频题

### interface 和 type 有什么区别

可以直接记：

- `interface` 更常用于定义对象结构、组件 `props`、类的约束。
- `type` 更灵活，除了对象，还能定义联合类型、、组合类型、函数类型这些、别名。
- 如果是日常组件开发，二者很多场景都能互换。


### 什么是泛型

可以直接记：

- 泛型就是“先不写死类型，等使用时再指定类型”。
- 作用是提高复用性，同时保留类型检查能力。

口语回答：

泛型可以理解成“参数化的类型”。比如一个请求函数，返回的数据结构可能不一样，这时就可以把返回值类型写成泛型，这样同一个函数可以复用，但每次调用又能拿到准确的类型提示。

### Props 类型定义怎么做

Props 可以理解为组件之间传递数据的参数，类似函数参数。对 Props 进行类型定义，明确字段类型、是否必填以及默认值。
父组件通过 Props 向子组件传值，子组件通过类型定义约束参数格式，提高组件复用性和代码可维护性。

### TS 在组件开发里的好处（TS 提升可维护性）
TS 对组件开发最大的帮助是类型约束，“约束输入和输出”。组件接收什么参数、接口返回什么结构、抛出什么事件、内部状态是什么结构，都能提前定义清楚。后面改功能时更容易知道哪些地方会受影响，不容易改崩。。

## 2. 组件封装与状态管理

### 组件怎么抽象和复用

可以直接记：

- 先看这个 UI 或交互是不是会重复出现（我做组件抽象时，一般会先判断这个功能是不是重复出现，或者未来会不会扩展）。
- 把通用结构、通用样式、通用事件抽出来。
- 可变的内容/差异部分通过 属性`props`、插槽、事件暴露出去。
- 这样既能复用，又不会把组件写死。

### 状态怎么拆分

按“作用范围”来分
- 页面公共状态放上层（多个组件共享的状态，放父组件或者统一状态层）。
- 组件私有状态留在组件内部(只在当前组件用的状态，就放组件内部)
- 复用逻辑抽到 composable（如果是一段可复用的业务逻辑，比如请求、流式处理、面试状态维护，我会抽到 composable，方便复用和测试）

### 父子组件通信怎么设计
- 父传子：`props`
- 子传父：`emits`
- 父组件负责数据，子组件负责展示和局部交互

父子通信最常见的方式就是父组件通过 `props` 把数据传给子组件，子组件通过 `emits` 把事件抛给父组件。一般我会让父组件负责核心状态和业务编排，子组件更偏展示和局部交互，这样职责会更清晰。

### 为什么用 composable
- 复用逻辑，不复用模板。
- 比 mixin 更清晰。
- 便于拆分复杂页面逻辑。

Composable 是 Vue3 中用于复用业务逻辑的一种方式，本质上就是把请求处理、状态管理、事件逻辑等抽离成独立的 useXXX 函数，让多个组件共享逻辑而不共享模板，相比以前的 Mixin 更清晰、更容易维护。
（把多个组件都会用到的业务逻辑，抽成一个独立 JS 文件）

### ref / computed / watch 分别怎么理解

可以直接记：

- `ref`：存核心状态。
- `computed`：根据已有状态计算派生结果。
- `watch`：监听状态变化后执行副作用。

口语回答：

我一般这样理解：`ref` 用来放真正会变化的数据，比如输入框内容、请求结果；`computed` 用来放由其他状态推导出来的结果，比如按钮是否可点、当前标题文案；`watch` 则是当某个状态变化后，需要额外做一件事，比如重新请求、同步外部状态、触发日志记录。

### 条件渲染、列表渲染、表单绑定

可以直接记：

- 条件渲染：根据状态决定显示哪个区域。
- 列表渲染：把数组数据循环渲染成列表。
- 表单绑定：输入变化自动同步到状态。

口语回答：

这几个其实都是前端页面最基础的能力。条件渲染就是根据状态切换 UI，列表渲染就是把接口数据映射成页面列表，表单绑定就是把用户输入实时同步到前端状态里，后续再拿这些状态去提交请求。

### 页面状态更新链路怎么讲

可以直接记这 5 步：

1. 核心状态通过 `ref` 定义，派生状态通过 `computed` 管理  
2. 用户操作触发事件函数  
3. 事件函数调用接口，请求后端数据  
4. 前端把返回结果写回响应式状态  
5. Vue 自动通知依赖这些状态的组件重新渲染

口语回答：

前端页面的状态更新，本质上依赖 Vue 的响应式系统。像输入框内容、候选人信息、聊天消息、加载状态这些数据，通常通过 `ref` 管理；像按钮是否禁用、当前显示文案这些派生结果，通过 `computed` 处理。用户点击按钮或提交表单后，会触发事件函数，请求后端接口。后端返回数据后，前端把结果写回这些响应式状态，Vue 就会自动更新对应组件。

## 3. 页面性能优化

### 页面性能怎么优化

可以直接记：

- 减少不必要渲染
- 大列表做分页或虚拟列表
- 输入搜索做防抖
- 高频事件做节流
- 图片和模块按需加载

口语回答：

页面性能优化我一般从几个方面看。第一是减少不必要的重复渲染，避免把所有状态都堆在一个大组件里；第二是大列表场景做分页、懒加载或者虚拟列表；第三是输入搜索、滚动监听这类高频操作做防抖节流；第四是静态资源按需加载，减少首屏压力。

### 什么是大列表、懒加载、防抖、节流

可以直接记：

- 大列表：页面一次渲染很多数据，容易卡顿。
- 懒加载：需要时再加载资源或内容。
- 防抖：用户停下来后再触发。
- 节流：一段时间内只执行一次。

口语回答：

大列表问题本质上是一次性渲染太多 DOM，浏览器压力大。懒加载是把不着急加载的内容延后。防抖适合搜索框这种连续输入场景，避免每打一个字都请求；节流适合滚动、拖拽这类高频事件，控制触发频率。

## 4. Vue3 组件通信和状态管理

### Vue 2 和 Vue 3 有什么区别

可以直接记：

- `Vue 2` 更偏传统，常见写法是 `Options API`
- `Vue 3` 在保留原写法的同时，新增了 `Composition API`
- `Vue 3` 响应式底层改成了 `Proxy`
- `Vue 3` 对复杂逻辑复用、性能优化、TypeScript 支持更友好

口语回答：

`Vue 2` 更偏传统，常见写法是把 `data`、`methods`、`computed`、`watch` 分开写；`Vue 3` 在保留这些写法的同时，新增了 `Composition API`，也就是组合式 API，更适合把复杂业务逻辑按功能拆出去复用。像我现在这个项目里的 `composable` 和 `Pinia` 状态管理，就更接近 Vue 3 的工程化写法。

### Composition API 是什么，有没有中文说法

可以直接记：

- `Composition API` 中文一般叫 `组合式 API`
- 核心思想：按“功能”组织代码，不是按 `data`、`methods` 这些选项分散组织
- 更适合复杂页面、复用逻辑、多人协作

口语回答：

`Composition API` 中文一般叫组合式 API。它的核心思想是把同一个功能相关的状态、计算逻辑、方法收在一起，而不是像以前那样分散写在 `data`、`methods`、`computed` 里。这样做的好处是逻辑更集中，复用更方便，也更适合复杂业务场景。

### Vue 2 的 Options API 和 Vue 3 的 Composition API 怎么理解

可以直接记：

- `Options API`：按配置项拆代码
- `Composition API`：按功能拆代码
- 页面越复杂，组合式 API 的优势越明显

#### 例子 1：登录表单

`Vue 2 / Options API` 的思路大概是：

```js
export default {
  data() {
    return {
      email: "",
      password: "",
      loading: false,
    };
  },
  computed: {
    canSubmit() {
      return this.email && this.password;
    },
  },
  methods: {
    async login() {
      this.loading = true;
      // 发请求
      this.loading = false;
    },
  },
};
```

这里“登录功能”的代码被拆散在：

- `data`
- `computed`
- `methods`

`Vue 3 / Composition API` 的思路大概是：

```js
import { ref, computed } from "vue";

export function useLogin() {
  const email = ref("");
  const password = ref("");
  const loading = ref(false);

  const canSubmit = computed(() => email.value && password.value);

  async function login() {
    loading.value = true;
    // 发请求
    loading.value = false;
  }

  return {
    email,
    password,
    loading,
    canSubmit,
    login,
  };
}
```

这里“登录功能”相关的状态、方法、派生结果都被收在一起了，这就是“组合式”的意思。

#### 例子 2：结合你项目里的理解

你这个项目里可以对应到：

- 登录注册
- 问答发送
- 模拟面试发送
- 流式回复处理
- 中断恢复
- 历史记录加载

这些逻辑现在都集中在：

- `frontend/src/composables/useInterviewApp.js`

你可以这样理解：

如果是传统写法，这些逻辑可能会散落在很多组件的 `methods`、`computed`、`watch` 里；现在用组合式思路，是把“同一块业务能力”集中管理，所以结构更清晰。

#### 例子 3：流式回复功能

比如“流式回复”这块，你可以把它看成一整组能力：

- `typingState`
- `progressMessage`
- `requestStopTyping()`
- `streamAssistantReply()`
- `handleStreamBuffer()`

它们都属于“流式交互”这个功能域，所以放在一起更好维护。

### Proxy 是什么

可以直接记：

- `Proxy` 可以理解成“对象外面包了一层代理壳”
- 对象被读取、修改、删除时，都可以被拦截
- Vue 3 用它来实现更自然的响应式追踪

口语回答：

`Proxy` 你可以先把它理解成给一个对象加了一层代理。以后这个对象的读取、修改、删除操作，系统都能感知到。Vue 3 的响应式底层主要就是基于 `Proxy` 来做的，所以当状态变化时，Vue 能更自然地知道“哪个数据变了”，再去更新页面。

#### Proxy 例子

```js
const user = { name: "Tom" };

const proxyUser = new Proxy(user, {
  get(target, key) {
    console.log("读取了", key);
    return target[key];
  },
  set(target, key, value) {
    console.log("修改了", key, value);
    target[key] = value;
    return true;
  },
});

proxyUser.name; // 读取了 name
proxyUser.name = "Jerry"; // 修改了 name Jerry
```

这个例子想说明的是：

- 你读数据时，代理知道
- 你改数据时，代理也知道

Vue 3 就是利用这种“知道数据什么时候被访问、什么时候被修改”的能力来做响应式更新。

### Vue 3 为什么说性能和响应式更好

可以直接记：

- `Vue 3` 响应式底层改成了 `Proxy`
- 对对象属性变化的追踪更自然
- 更适合复杂状态和大项目

口语回答：

Vue 3 说性能和响应式更好，核心原因之一就是底层从早期方案升级成了 `Proxy`。你可以把它理解成 Vue 对数据变化的感知能力更强、更自然了，所以在复杂页面和复杂状态场景下更容易维护，也更适合现代工程化项目。

### ref 和 reactive 有什么区别

可以直接记：

- `ref` 常用来包基础类型，也可以包对象
- `reactive` 主要用来包对象或数组
- `ref` 取值要用 `.value`
- `reactive` 一般直接用对象属性

口语回答：

我一般这样理解：`ref` 更适合定义单个核心状态，比如输入框内容、loading 状态、当前模式；`reactive` 更适合定义一整个对象，比如表单对象、用户信息对象。`ref` 的特点是访问时要通过 `.value`，而 `reactive` 更像直接操作普通对象属性。

#### 例子 1：ref

```js
import { ref } from "vue";

const count = ref(0);
const loading = ref(false);
const qaInput = ref("");

count.value++;
loading.value = true;
qaInput.value = "请解释一下 Redis 持久化";
```

这个例子里：

- `count` 是一个数字状态
- `loading` 是一个布尔状态
- `qaInput` 是一个输入框字符串状态

这些都很适合用 `ref`。

#### 例子 2：reactive

```js
import { reactive } from "vue";

const loginForm = reactive({
  email: "",
  password: "",
});

loginForm.email = "test@example.com";
loginForm.password = "123456";
```

这个例子里：

- `loginForm` 是一个完整表单对象
- 里面有多个字段
- 这种场景更适合 `reactive`

#### 例子 3：结合你项目怎么理解

你项目里现在很多状态是这种思路：

- 单个状态适合 `ref`
  - 比如当前输入框内容、加载状态、天气文案、模式切换
- 一组关联状态适合对象化管理
  - 比如登录表单、注册表单、候选人状态、LangSmith 配置

现在项目里又引入了 `Pinia`，所以很多对象状态被统一放进 store 里了。你面试时可以说：

“如果是单个核心值，我通常会优先想到 `ref`；如果是一整组有结构的数据，我会考虑 `reactive` 或者直接放到 store 里统一管理。”

#### 怎么选更稳

可以直接记：

- 基础类型优先 `ref`
- 简单对象可以用 `reactive`
- 复杂业务状态如果需要跨组件共享，可以放 `Pinia`

### computed 和 watch 有什么区别

可以直接记：

- `computed` 是“算结果”
- `watch` 是“看变化后做事”:watch监听某个数据的变化，当数据发生变化时，自动执行指定的逻辑。它的重点不是"计算数据"，而是在数据变化后做一些额外的事情（副作用）。watch 会一直"盯着" keyword，只要它发生变化，就执行回调函数。
- `computed` 偏派生状态
- `watch` 偏副作用处理

口语回答：

我一般把 `computed` 理解成“根据已有状态自动算出一个结果”，比如按钮能不能点、当前标题怎么显示；而 `watch` 是“当某个状态变化后，再额外执行一个动作”，比如重新请求数据、打印日志、同步本地存储。一个偏结果推导，一个偏变化后的副作用。

#### 例子 1：computed

```js
import { ref, computed } from "vue";

const email = ref("");
const password = ref("");

const canSubmit = computed(() => {
  return email.value.trim() !== "" && password.value.trim() !== "";
});
```

这里的 `canSubmit` 就是一个典型的派生状态：

- 它不是用户直接输入的
- 它是根据 `email` 和 `password` 计算出来的

所以适合用 `computed`。

#### 例子 2：watch

```js
import { ref, watch } from "vue";

const selectedRole = ref("Java 后端");

watch(selectedRole, async (newRole, oldRole) => {
  console.log("岗位切换了", oldRole, "->", newRole);
  // 可以在这里重新请求数据
});
```

这里的重点不是“算出一个值”，而是：

- 当 `selectedRole` 变化了
- 我要执行一段额外逻辑

这种就适合 `watch`。

#### 例子 3：结合你项目怎么理解

在你的项目场景里可以这样理解：

- `computed`
  - 当前按钮是否可点击
  - 当前模式标题显示什么
  - 当前欢迎区要不要展示
  - 当前是否还有“继续生成”按钮

- `watch`
  - 某个状态变化后自动刷新数据
  - 某个输入变化后触发防抖请求
  - 某个模式切换后做埋点、日志或额外同步

#### 一句话区分

可以直接记：

- 只是想“得到一个值” -> `computed`
- 想“状态一变就做一件事” -> `watch`

#### 面试口语版

“`computed` 和 `watch` 的区别，我一般从用途来区分。`computed` 是根据已有状态推导出新结果，适合派生状态；`watch` 是监听状态变化后执行副作用，适合请求、日志、同步这类动作。简单说，一个是算结果，一个是做事情。”

### props / emits

可以直接记：

- `props` 是父传子
- `emits` 是子传父

口语回答：

`props` 和 `emits` 是最基础的父子通信方式。父组件把数据通过 `props` 传给子组件，子组件在交互发生时通过 `emits` 把事件通知父组件。这样数据流向会比较清晰，也符合单向数据流的思路。

### composable 为什么好

可以直接记：

- 抽离可复用逻辑
- 降低单个组件复杂度
- 便于维护

口语回答：

composable 的核心价值，是把复杂页面里的业务逻辑抽出来。这样模板层只负责展示，逻辑层集中处理状态、请求、交互流程，代码结构会更清楚，也更适合多人协作。

## 5. 安全性表层高频题

### token 存哪里更安全

可以直接记：

- 更安全的常见方案是 `HttpOnly Cookie`
- `localStorage` 使用方便，但更容易被 XSS 读到

口语回答：

如果从安全性看，通常 `HttpOnly Cookie` 会更安全，因为前端 JavaScript 不能直接读取它，能降低 token 被脚本窃取的风险。`localStorage` 使用更直接，但如果页面存在 XSS 漏洞，token 就可能被拿到。

### cookie 和 localStorage 区别

可以直接记：

- `cookie` 会跟随请求自动发送
- `localStorage` 不会自动带给后端
- `cookie` 适合认证场景
- `localStorage` 适合存非敏感前端数据

口语回答：

`cookie` 和 `localStorage` 都能存数据，但用途不太一样。`cookie` 会自动随着请求带给后端，适合登录态这类场景；`localStorage` 更像浏览器本地存储，前端自己取自己用，不会自动发给后端。安全性上，如果是敏感认证信息，通常更倾向 Cookie 配合安全属性去做。

### XSS 是什么

可以直接记：

- 恶意脚本被注入页面并执行
- 风险是窃取用户信息、token、页面数据

口语回答：

XSS 就是跨站脚本攻击，本质上是把恶意脚本注入到页面里执行。前端常见的防护思路是避免随意渲染不可信 HTML、对用户输入做过滤和转义、减少敏感信息暴露给前端脚本。

### CSRF 是什么

可以直接记：

- 借用户登录状态发起伪造请求
- 常见防护是 `SameSite Cookie`、CSRF Token、二次校验

口语回答：

CSRF 可以理解成攻击者借用了用户已经登录的身份，诱导浏览器替用户发请求。常见的防护方式包括使用 `SameSite Cookie`、加 CSRF Token，以及对关键操作做额外校验。

### 文件上传有什么风险

可以直接记：

- 恶意文件上传
- 文件类型伪装
- 超大文件占资源
- 路径和脚本执行风险

口语回答：

文件上传的风险主要包括恶意脚本文件上传、文件类型伪装、超大文件拖垮服务，以及服务端处理不当带来的路径或执行风险。所以一般要做前后端双重校验，包括类型、大小、后缀、内容限制，并且把上传目录和执行环境隔离开。

### 用户输入怎么做校验

可以直接记：

- 前端先做格式校验，提升体验
- 后端再做一次严格校验，保证安全

口语回答：

用户输入校验不能只靠前端。前端主要负责及时提示，比如不能为空、格式不对；后端要做真正的严格校验，因为前端校验可以被绕过。工程上一般都会做前后端双校验。

## 6. 部署和工程化

### let、const、var 有什么区别

可以直接记：

- `var` 是旧写法，现在还能用，但不推荐
- `let` 用来声明“会变化”的变量
- `const` 用来声明“不希望重新赋值”的变量
- `let` 和 `const` 都是块级作用域
- `var` 是函数作用域，而且有变量提升问题

口语回答：

`var`、`let`、`const` 都能声明变量，但现在开发里更常用 `let` 和 `const`。`var` 不是 Vue 3 弃用了，而是 JavaScript 里这个写法本身比较老，容易带来作用域和变量提升问题，所以现代前端项目里通常不推荐。一般不会变的引用我会优先用 `const`，会变化的状态或中间变量再用 `let`。

#### 例子

```js
var a = 1;
let mode = "qa";
const API_BASE = "/api";

mode = "interview"; // 可以
// API_BASE = "/v2/api"; // 不可以，const 不能重新赋值
```

#### 一句话理解

- `const`：优先默认使用
- `let`：确实需要变时再用
- `var`：能看懂，但新项目里尽量少用

### ES6+ 新特性有哪些

可以直接记：

- `let / const`
- 箭头函数
- 模板字符串
- 解构赋值
- 展开运算符
- Promise / async await
- 模块化 import / export
- 类 class

口语回答：

ES6+ 新特性很多，但前端开发里最常用的是 `let/const`、箭头函数、模板字符串、解构赋值、展开运算符、`Promise`、`async/await` 以及 `import/export` 模块化。像我现在这个项目里，组件和工具函数就大量用到了这些写法。

#### 例子 1：解构赋值

```js
const user = { name: "Tom", role: "frontend" };
const { name, role } = user;
```

#### 例子 2：展开运算符

```js
const langsmith = { enabled: true, project: "demo" };
const nextLangsmith = { ...langsmith, enabled: false };
```

#### 例子 3：async / await

```js
async function loadHistory() {
  const data = await apiGet("/api/history/interviews");
  return data;
}
```

### git 常见命令有哪些

可以直接记：

- `git clone`
- `git status`
- `git add`
- `git commit`
- `git pull`
- `git push`
- `git branch`
- `git checkout` / `git switch`
- `git log`

口语回答：

Git 是我日常管理代码最常用的工具。常见流程一般是先 `clone` 项目，开发时用 `status` 看改动，确认后用 `add` 和 `commit` 提交，本地和远程同步时用 `pull`、`push`。如果多人协作或者开发新功能，也会用 `branch` 和 `switch` 切分支。

#### 一个常见提交流程

```bash
git status
git add .
git commit -m "feat: 完成前端流式回复优化"
git pull
git push
```

#### 面试口语版

“我平时最常用的 Git 命令有 clone、status、add、commit、pull、push、branch、switch。日常开发里一般就是先看改动，再提交本地 commit，最后同步到远程仓库。”

### 网络通信有哪些

可以直接记：

- HTTP / HTTPS
- AJAX
- fetch / axios
- SSE
- WebSocket
- 文件上传 `multipart/form-data`

口语回答：

前端常见的网络通信方式主要还是基于 HTTP，比如普通的 `GET`、`POST` 请求；在代码层面常通过 `fetch` 或 `axios` 发起。除此之外，还有适合服务端持续推送的 `SSE`，以及适合双向实时通信的 `WebSocket`。如果是文件上传，则常用 `multipart/form-data`。

#### 结合你项目怎么说

你这个项目里主要有两类：

- 普通请求
  - 例如登录、加载历史记录、生成报告
  - 现在主要通过 `axios` 发起
- 流式请求
  - 例如问答流式回复、模拟面试流式回复
  - 现在通过 `fetch + ReadableStream + getReader()` 读取后端流数据

你可以这样说：

“我这个项目里主要用了 HTTP 通信。普通接口走 axios，比如登录、历史记录、文件上传；流式回复场景走 fetch，然后通过 `response.body.getReader()` 持续读取后端返回的数据块，再实时更新页面。”

### 网络通信方式怎么结合例子讲

#### 例子 1：普通 JSON 请求

```js
const data = await apiPost("/api/auth/login", {
  email: "test@example.com",
  password: "123456",
});
```

这个例子里：

- 前端发的是 HTTP `POST`
- 请求体是 JSON
- 后端返回 JSON
- 前端拿到后更新登录状态

#### 例子 2：文件上传

```js
const formData = new FormData();
formData.append("file", resumeFile);
await apiFormPost("/api/resume/upload", formData);
```

这个例子里：

- 前端用 `FormData`
- 请求类型通常是 `multipart/form-data`
- 适合上传简历、知识库文档

#### 例子 3：流式通信

```js
const response = await fetch("/api/qa/chat/stream", {
  method: "POST",
  body: JSON.stringify({ message: "解释一下 Redis 持久化" }),
  headers: {
    "Content-Type": "application/json",
  },
});

const reader = response.body.getReader();
```

这个例子里：

- 前端先发起 HTTP 请求
- 后端不是一次性返回完整结果
- 前端通过 `getReader()` 不断读数据块
- 页面看起来就像模型在实时输出

### 如果给你一个任务去完成，你怎么去跟 AI 工具输入指令去完成

可以直接记：

- 先明确目标
- 再补上下文
- 再限定范围
- 再要求输出格式
- 最后自己验证结果

口语回答：

如果我要借助 AI 工具完成一个任务，我不会只给一句很模糊的话，而是会把目标、上下文、限制条件和期望输出说清楚。比如我要改一个前端模块，我会先说明项目技术栈、涉及文件、希望保留的样式和逻辑，再要求它给出修改方案或者直接生成代码。生成后我还会自己做校验，包括看代码结构、跑页面、看控制台报错、测接口联调，而不是直接照搬。

#### 一个更好的提示词结构

可以直接记这 5 步：

1. 任务目标是什么
2. 项目技术栈是什么
3. 允许改哪些文件
4. 哪些逻辑和样式不能破坏
5. 最终希望输出什么

#### 例子

```text
请帮我把这个 Vue 3 页面里的登录表单拆成独立组件。
项目使用 Vue 3 + Vite。
只修改 frontend/src/components 和 frontend/src/views 下的文件。
保持现有样式和接口调用逻辑不变。
输出修改后的代码，并说明父子组件如何通信。
```

#### 面试口语版

“我用 AI 工具时，比较重视提示词的结构化表达。一般会先说清楚任务目标、技术栈、修改范围、约束条件和输出要求。生成结果后我还会自己验证，比如看代码逻辑、跑页面、查控制台和 Network 请求，确保不是只依赖工具。”

### 前端怎么部署

可以直接记：

- 本地开发：`npm install`、`npm run dev`
- 生产打包：`npm run build`
- 把打包产物部署到静态服务器或 Nginx

口语回答：

前端开发时一般先 `npm install` 安装依赖，再通过 `npm run dev` 启动本地开发环境。上线前执行 `npm run build` 生成静态资源，然后把打包后的文件部署到 Nginx 或其他静态资源服务器上。

### 后端怎么部署

可以直接记：

- 安装依赖
- 配置环境变量
- 启动服务进程
- 用反向代理对外提供访问

口语回答：

后端部署通常包括安装依赖、配置环境变量、启动应用服务，然后通过 Nginx 这类反向代理把接口暴露出去。如果是 Python 项目，常见方式是用 `uvicorn` 或 `gunicorn` 启动服务进程。

### 怎么保证环境一致

可以直接记：

- 依赖版本固定
- 环境变量规范化
- 用 Docker 或部署脚本统一环境

口语回答：

环境一致性的核心，是尽量减少“每台机器都不一样”的情况。常见方法包括固定依赖版本、统一环境变量配置、编写部署脚本，或者直接用 Docker 把运行环境打包起来，这样开发、测试、上线环境更容易保持一致。

### Docker 是什么

可以直接记：

- Docker 是容器化工具
- 可以把应用和运行环境一起打包

口语回答：

Docker 可以理解成一种轻量化容器方案。它的价值是把应用代码、依赖、运行环境一起打包，减少“我本地能跑、服务器跑不了”的问题，部署和迁移都会更方便。

### CI/CD 是什么

可以直接记：

- CI：持续集成
- CD：持续交付 / 持续部署
- 作用是自动化测试、打包、发布

口语回答：

CI/CD 就是把代码提交后的测试、构建、发布流程尽量自动化。CI 重点在持续集成，确保代码合并后能快速验证；CD 更偏发布和部署，让上线流程更稳定、更少人工操作。

### 自动化部署脚本是做什么的

可以直接记：

- 自动执行安装、构建、上传、重启服务这些步骤
- 减少人工失误

口语回答：

自动化部署脚本，本质上就是把原本人工一条条敲的命令固化下来，比如拉代码、装依赖、构建、复制文件、重启服务。这样可以减少漏步骤、输错命令这类低级错误，也方便团队协作。

## 7. 面试时不会很深怎么办

### 遇到不会的问题怎么回答

可以直接记这 3 句：

- “这个点我先结合我项目里的实际实现来回答。”
- “我目前主要做到业务开发这一层，更底层原理我还在继续补。”
- “如果继续优化，我会从安全性、性能和工程化这几个方向完善。”

口语回答：

如果面试官问得比较深，而我没有做到源码级理解，我会先把问题拉回到项目实现层，优先讲我真正做过的部分，比如组件拆分、接口联调、流式更新、文件上传、状态管理这些。这样既不会硬编，也能让面试官感受到我是有真实开发经验的。

## 8. 你当前最值得优先补的内容

如果只剩很短时间，优先补这几块：

1. Vue3：`props`、`emits`、`ref`、`computed`、`watch`、生命周期  
2. 前后端联调：`axios`、`fetch`、JSON、FormData、Network 面板  
3. 组件化：怎么拆组件、怎么抽 composable、怎么做父子通信  
4. 安全性表层：Cookie、localStorage、XSS、CSRF、文件上传风险  
5. 工程化表层：`npm run dev`、`npm run build`、部署、Docker、CI/CD

## 9. CSS 布局和弹性布局

### 弹性布局有哪些

可以直接记：

- `Flex` 弹性布局
- `Grid` 网格布局
- 传统布局还有 `block`、`inline-block`、`float`、`position`

口语回答：

现在前端里最常用的布局方式主要是 `Flex` 和 `Grid`。如果是一维排列，比如一行按钮、左右两栏、上下分布，我通常优先想到 `Flex`；如果是二维区域布局，比如卡片宫格、复杂看板，会更适合 `Grid`。传统的 `float`、`position` 现在也能用，但更多是兼容旧代码或处理特殊定位。

### Flex 怎么理解

可以直接记：

- 适合一维布局
- 核心是主轴和交叉轴
- 常配合 `justify-content`、`align-items`、`flex-direction`

#### 例子

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

这个例子常见于：

- 左边标题，右边天气
- 左边按钮组，右边用户信息

你项目里很多顶部栏、操作区、左右分栏区域，本质上都可以用这种思路理解。

### Grid 怎么理解

可以直接记：

- 适合二维布局
- 可以同时控制行和列
- 适合卡片区、面板区、后台布局

#### 例子

```css
.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
```

这个例子适合：

- 左右两个面板各占 50%
- 简历上传区和岗位选择区并排展示

### 面试怎么回答布局选择

可以直接记：

- 一维排布优先 `Flex`
- 二维区域优先 `Grid`
- 特殊定位再用 `position`

## 10. 一句话总结你自己的定位

可以这样说：

我现在的优势在于 AI 应用前端和前后端联调，能借助 AI Coding 工具快速推进功能开发、调试和交付；同时我也在系统补 Vue3、TypeScript、工程化和安全性这些前端基础，希望尽快把项目经验沉淀成更扎实的工程能力。
