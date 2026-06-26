// 兼容旧导入路径，统一转发到新的 constants 分层目录。
export * from "./constants/app.js";

// 兼容旧组件里仍在使用的常量名，避免一次重构改动过大。
import { MODES } from "./constants/app.js";

export const QA_MODE = "qa";
export const INTERVIEW_MODE = "interview";
export const HISTORY_MODE = "history";
export const defaultModes = MODES;
