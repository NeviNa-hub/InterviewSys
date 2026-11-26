# InterviewSys · 智能面试辅导前端

候选人可以在工作台上传简历、练习知识问答、参加模拟面试并回看报告。管理后台用于查看面试数据和维护题库。前端可独立演示，也可连接[面试系统后端](https://github.com/NeviNa-hub/InterviewSys-backend)。

## 技术栈

Vue 3、JavaScript、Vite、Vue Router、Pinia、Axios、ECharts。普通接口使用 Axios，流式聊天使用 Fetch 按行读取 NDJSON 事件。

## 代码目录

| 路径 | 职责 |
|---|---|
| `src/views/`、`src/components/` | 页面、聊天面板、工作区和图表组件 |
| `src/composables/`、`src/stores/` | 面试交互、流式回复、会话与管理后台状态 |
| `src/api/client.js`、`src/router/` | 请求封装、页面路由 |
| `mock-server/`、`vite.config.js` | 本地模拟接口、开发代理 |
| `Live2D-web/` | 可选的独立数字人前端，通过 `VITE_LIVE2D_URL` 接入 |

## 主要功能

| 入口 | 功能 |
|---|---|
| 工作区 | 登录注册，创建、切换、重命名、置顶和删除项目或会话 |
| 知识问答 | 导入知识文件、发送问题、逐段显示回答 |
| 模拟面试 | 上传简历、选择岗位、回答追问、结束面试、生成报告 |
| 历史记录 | 查看、恢复面试记录，下载报告 |
| 管理后台 | 查看数据看板、运行记录和评估，管理用户角色、组织、岗位模板、题目和提示词 |

## 环境与启动

准备 Node.js 22 和 npm，以下命令在前端仓库根目录执行。

**本地演示**：首次执行 `npm ci` 安装依赖，然后执行 `npm run dev`，打开终端显示的地址（默认 http://localhost:5173）。以后直接执行 `npm run dev`。模拟模式无需后端或模型密钥，服务重启后演示数据会清空。

**连接服务器**：在前端根目录创建 `.env.development.local`，填写服务器上面试系统的 Nginx 地址，然后重新执行 `npm run dev`。

```dotenv
VITE_USE_MOCK=false
INTERVIEW_API_TARGET=http://172.22.121.135:8081
```

将示例域名换成实际网关，地址末尾不加 `/api`。Vite 会将浏览器发出的 `/api/...` 请求原样转发。也可在 `.env.server.local` 单独配置同一网关，并使用 `npm run dev:server` 启动。

**正式部署**：执行 `npm ci` 和 `npm run build`，将 `dist/` 部署到 Web 服务器。为 Vue Router 配置 `try_files $uri $uri/ /index.html;`，并将同域名的 `/api/` 转发到后端。代理需保留路径并关闭响应缓冲，以便聊天内容实时显示。
