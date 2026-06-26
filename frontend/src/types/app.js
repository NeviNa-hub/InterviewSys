/**
 * 这份文件用来集中描述前端里最常见的数据结构。
 * 当前项目还是 JavaScript，没有切到 TypeScript，
 * 所以这里用 JSDoc + 工厂函数的方式，先把“结构定义”统一起来。
 *
 * 学习时可以把这里当成“前端数据字典”：
 * 页面上常见的对象长什么样，先在这里统一约定。
 */

/**
 * @typedef {Object} ChatMessage
 * @property {"user"|"assistant"} role
 * @property {string} content
 * @property {"done"|"generating"|"interrupted"} [status]
 */

/**
 * @typedef {Object} AuthUser
 * @property {number|null} id
 * @property {string} email
 * @property {string} display_name
 */

/**
 * @typedef {Object} AuthState
 * @property {boolean} authenticated
 * @property {AuthUser|null} user
 */

/**
 * @typedef {Object} LangSmithState
 * @property {boolean} enabled
 * @property {string} api_key
 * @property {string} project
 */

/**
 * @typedef {Object} WeatherState
 * @property {string} city
 * @property {string} text
 */

/**
 * @typedef {Object} AppMetaState
 * @property {string[]} role_options
 * @property {Record<string, any>} qa
 * @property {Record<string, any>} interview
 * @property {Record<string, any>} history
 */

/**
 * @typedef {Object} HistoryRecord
 * @property {number} id
 * @property {string} role_name
 * @property {string} resume_filename
 * @property {number} score
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [report_text]
 * @property {ChatMessage[]} [history]
 * @property {Record<string, any>} [interview_state]
 */

/**
 * @typedef {Object} WorkspaceConversation
 * @property {string} id
 * @property {string} name
 * @property {boolean} pinned
 * @property {string} preferred_mode
 * @property {string} created_at
 * @property {string} updated_at
 * @property {number} qa_count
 * @property {number} interview_count
 */

/**
 * @typedef {Object} WorkspaceProject
 * @property {string} id
 * @property {string} name
 * @property {boolean} pinned
 * @property {string} created_at
 * @property {string} updated_at
 * @property {number} conversation_count
 * @property {WorkspaceConversation[]} conversations
 */

export function createDefaultAuth() {
  // 默认值工厂函数：
  // 登录态重置、页面初始渲染时都会复用。
  return {
    authenticated: false,
    user: null,
  };
}

export function createDefaultWeather() {
  return {
    city: "未知城市",
    text: "天气获取中...",
  };
}

export function createDefaultMeta() {
  return {
    role_options: [],
    qa: {},
    interview: {},
    history: {},
  };
}

export function createDefaultLangSmith() {
  return {
    enabled: false,
    api_key: "",
    project: "interview-coach-debug",
  };
}

export function createDefaultLoginForm() {
  return {
    email: "",
    password: "",
  };
}

export function createDefaultRegisterForm() {
  return {
    display_name: "",
    email: "",
    password: "",
  };
}

export function createDefaultWorkspace() {
  return {
    projects: [],
    active_project_id: "",
    active_conversation_id: "",
    onboarding_completed: false,
  };
}
