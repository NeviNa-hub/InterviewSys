# 智能面试辅导场景的前后端完整 Web 系统

一个面向计算机与软件相关岗位面试准备场景的智能辅导项目，当前采用 `Vue 3 + Vite + Vue Router + Pinia + FastAPI + LangChain + Chroma + RAG` 架构，支持技术问答、岗位模拟面试、简历定制化提问、项目/会话管理、面试评分、报告导出、历史记录查看与 LangSmith 调试。

<img width="2229" height="1215" alt="942944481b30aea55d9beb5cf0d99399" src="https://github.com/user-attachments/assets/8eada894-4a06-4320-be1a-ca40a428fec5" />
<img width="2229" height="1215" alt="ef5686155e75faf098f4d67d777e6b69" src="https://github.com/user-attachments/assets/8f13c028-4e83-4766-a628-a8e16fe67219" />

## 功能概览

- 正式登录体系  
  支持邮箱 + 密码注册登录，后端使用 SQLite 保存用户、登录会话和历史面试记录。

- 技术问答模式  
  支持围绕技术知识点、面试题和岗位准备进行多轮问答；问答模式下具备 Tool Calling 能力，可根据问题自动决定是否调用天气或知识库工具。

- 模拟面试模式  
  支持按岗位进行模拟面试，并结合回答质量动态追问、提示、切题或结束。

- 简历定制化提问  
  支持上传简历，系统会结合岗位要求和简历内容生成更贴近真实面试场景的问题。

- 知识库导入与 RAG 检索  
  支持导入 `pdf / txt / md / docx` 文档，完成解析、切分、向量化与检索增强生成。

- 面试评分与报告生成  
  面试结束后可生成分数、结构化报告，并将报告保存为本地 Markdown 文件，同时沉淀到历史记录列表。

- 历史面试记录列表  
  支持查看过往面试记录、分数、报告详情，并可恢复到当前工作台继续复盘。

- 首页引导与项目/会话管理  
  提供首页落地页、首次使用引导、主题模式切换，以及项目文件夹、会话的新建、重命名、删除、置顶和切换。

- 真流式输出与中断兜底  
  基于 HTTP 流式响应实现实时输出，支持手动停止、继续生成、重试本轮回答和中断恢复。

- LangSmith 调试  
  支持按需开启 LangSmith tracing，用于观测问答、知识库导入、模拟面试和报告生成链路。

## 前后端实现

### 前端

- 技术栈：`Vue 3 + Vite + Vue Router + Pinia + JavaScript + CSS`
- 主要职责：
  - 组织登录页、首页落地页、问答页、模拟面试页、历史记录页
  - 使用 Vue Router 管理首页、工作台和不同模式页面跳转
  - 管理响应式状态、文件上传、模式切换和错误提示
  - 支持项目/会话树、首次引导弹窗、主题模式和空状态提示
  - 普通请求使用 `axios`
  - 流式请求使用 `fetch + ReadableStream + getReader()`
  - 实现长列表渐进渲染、自动滚动、骨架屏、懒加载和移动端适配

### 后端

- 技术栈：`FastAPI + Python`
- 主要职责：
  - 提供注册登录、问答、模拟面试、文件上传、历史记录和报告下载接口
  - 使用 SQLite 管理用户、登录会话和历史面试记录
  - 使用本地 JSON 保存用户工作区状态，如项目、会话、问答历史、面试状态、简历文本和当前报告
  - 调用 LangChain、DeepSeek、RAG、Tool Calling 和面试状态机能力
  - 托管前端构建产物

## 面试场景专项设计

- 面试状态机  
  将模拟面试拆成提问、追问、提示、切题、结束等状态，用状态机控制流程，而不是完全交给模型自由发挥。

- 追问 / 切题策略  
  为单题设置追问上限，并结合回答质量判断是否继续深挖、先给提示，还是切换到下一题，避免模型一直围绕同一问题反复追问。

- 简历驱动的定制化面试  
  上传简历后，系统会优先围绕简历中的项目、职责和技术选型提问；未上传简历时，则按岗位通用能力推进。

- 流式输出 + 中断恢复  
  支持消息占位、流式输出、手动停止、继续生成和重试本轮回答；刷新页面时会把未完成回复标记为 `interrupted`，避免长时间卡在“生成中”。

- 历史面试复盘  
  每次生成报告后都会写入 SQLite，并保存独立报告文件；前端可查看历史记录、下载报告或恢复历史面试到当前工作台。

## 技术栈

- 前端：Vue 3、Vite、Vue Router、Pinia、JavaScript、CSS
- 后端：FastAPI、Python
- AI 应用：LangChain、DeepSeek API、Prompt Engineering、Tool Calling
- 检索增强：RAG、Chroma、Embedding、多格式文档解析
- 持久化：SQLite、本地 JSON
- 调试观测：LangSmith

## 项目结构

```text
.
├─ frontend/
│  ├─ index.html
│  ├─ package.json
│  ├─ vite.config.js
│  └─ src/
│     ├─ App.vue
│     ├─ main.js
│     ├─ styles.css
│     ├─ api/
│     ├─ components/
│     ├─ composables/
│     ├─ constants/
│     ├─ router/
│     ├─ stores/
│     ├─ types/
│     ├─ views/
│     ├─ constants.js
│     └─ utils/
├─ main.py
├─ agent/
├─ rag/
├─ utils/
│  ├─ auth_store.py
│  ├─ user_history_store.py
│  └─ langsmith_handler.py
├─ config/
├─ prompts/
├─ data/
│  ├─ app.db
│  ├─ interview_reports/
│  ├─ uploaded_knowledge/
│  ├─ uploaded_resumes/
│  └─ user_histories/
└─ requirements.txt
```

## 环境与启动

### 1. 创建虚拟环境

当前建议保持服务器上的这套虚拟环境方式：

```bash
python3 -m venv .interview_venv
source .interview_venv/bin/activate
```

如果你本地使用 Conda，也可以自行切换，但 README 里的默认方式以 `.interview_venv` 为准。

### 2. 安装后端依赖

```bash
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### 3. 配置环境变量

建议通过 `.env` 或系统环境变量配置：

```env
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_BASE_URL=https://api.siliconflow.cn/v1
DEEPSEEK_MODEL=deepseek-ai/DeepSeek-V4-Flash

EMBEDDING_API_KEY=your_api_key
EMBEDDING_BASE_URL=https://api.siliconflow.cn/v1
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-0.6B

WEATHER_API_KEY=your_weather_api_key
LANGCHAIN_API_KEY=your_langsmith_api_key
```

相关配置文件：

- `config/rag.yml`
- `config/agent.yml`
- `config/chroma.yml`

### 4. 启动前端

开发模式：

```bash
cd frontend
npm install
npm run dev
```

构建模式：

```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. 启动后端

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

启动后访问：

- [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

## 核心接口

### 认证与用户

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/bootstrap`

### 问答与面试

- `POST /api/qa/chat`
- `POST /api/qa/chat/stream`
- `POST /api/qa/clear`
- `POST /api/interview/start`
- `POST /api/interview/message`
- `POST /api/interview/message/stream`
- `POST /api/interview/end`
- `POST /api/interview/report`

### 文件与知识库

- `POST /api/knowledge/import`
- `POST /api/resume/upload`
- `POST /api/resume/clear`

### 历史记录与报告

- `GET /api/history/interviews`
- `GET /api/history/interviews/{record_id}`
- `POST /api/history/interviews/{record_id}/restore`
- `GET /api/history/interviews/{record_id}/download`
- `GET /api/interview/report/download`

### 工作区与会话

- `POST /api/workspace/onboarding`
- `POST /api/workspace/projects`
- `PATCH /api/workspace/projects/{project_id}`
- `POST /api/workspace/projects/{project_id}/activate`
- `POST /api/workspace/projects/{project_id}/pin`
- `DELETE /api/workspace/projects/{project_id}`
- `POST /api/workspace/projects/{project_id}/conversations`
- `PATCH /api/workspace/conversations/{conversation_id}`
- `POST /api/workspace/conversations/{conversation_id}/activate`
- `POST /api/workspace/conversations/{conversation_id}/pin`
- `POST /api/workspace/conversations/{conversation_id}/mode`
- `DELETE /api/workspace/conversations/{conversation_id}`

## 使用说明

### 登录

- 先注册或登录
- 登录成功后，后端会通过 Cookie 维持会话
- 不同用户的当前工作态和历史面试记录相互隔离

### 首页与工作区

- 登录后先进入首页，可选择技术问答、模拟面试或历史复盘
- 左侧边栏支持创建项目文件夹，并在项目内管理多个会话
- 每个会话可保存自己的模式、聊天记录、面试状态和上传内容

### 问答模式

- 适合围绕某个技术知识点提问
- 普通请求走 `axios`
- 流式回复走 `fetch + ReadableStream`
- 支持手动停止、继续生成和重试本轮回答

### 模拟面试模式

- 先选择目标岗位
- 可选上传简历
- 系统会按岗位能力维度推进面试
- 回答较弱时会提示或切换题目
- 面试结束后可生成分数和报告

### 历史记录

- 生成报告后会自动写入历史记录
- 可查看过往报告、下载报告文件
- 可将某条历史记录恢复到当前工作台继续复盘

## 项目亮点

- 基于 `DeepSeek + RAG` 的智能问答与模拟面试系统
- 支持正式登录体系、用户隔离和历史记录列表
- 支持首页落地页、首次引导、主题切换和项目/会话管理
- 支持 `岗位 + 简历` 定制化提问
- 设计了面试状态机、追问 / 切题策略与评分机制
- 支持真流式输出、手动停止、继续生成和重试本轮回答
- 支持报告文件导出、本地留存与 LangSmith tracing
