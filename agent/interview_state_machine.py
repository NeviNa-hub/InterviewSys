from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Sequence

from agent.interview_policy import InterviewDecision


@dataclass
class InterviewStateDecision:
    action: str
    reply_mode: str
    should_record_question: bool = False
    should_record_hint: bool = False
    should_end: bool = False
    reason: str = ""


class InterviewStateMachine:
    def __init__(self):
        self.max_followups_per_question = 2
        self.max_total_questions = 8

    def ensure_state(self, state: Dict | None = None) -> Dict:
        state = dict(state or {})
        state.setdefault("target_role", "")
        state.setdefault("current_question", "")
        state.setdefault("current_question_index", 0)
        state.setdefault("followup_count", 0)
        state.setdefault("turn_count", 0)
        state.setdefault("awaiting_answer", False)
        state.setdefault("finished", False)
        state.setdefault("role_selected", bool(state.get("target_role")))
        state.setdefault("resume_text", "")
        state.setdefault("resume_filename", "")
        state.setdefault("answer_scores", [])
        state.setdefault("latest_score", 0.0)
        state.setdefault("poor_answer_count", 0)
        return state

    def start_interview(self, role: str) -> Dict:
        state = self.ensure_state({})
        state["target_role"] = (role or "").strip()
        state["current_question"] = ""
        state["current_question_index"] = 0
        state["followup_count"] = 0
        state["turn_count"] = 0
        state["awaiting_answer"] = False
        state["finished"] = False
        state["role_selected"] = bool(state["target_role"])
        state["resume_text"] = ""
        state["resume_filename"] = ""
        state["answer_scores"] = []
        state["latest_score"] = 0.0
        state["poor_answer_count"] = 0
        return state

    def update_current_question(self, state: Dict, question: str, is_followup: bool = False) -> Dict:
        state = self.ensure_state(state)
        state["current_question"] = question or ""
        state["awaiting_answer"] = True
        state["finished"] = False
        if not is_followup:
            state["followup_count"] = 0
            state["poor_answer_count"] = 0
            state["current_question_index"] = int(state.get("current_question_index", 0)) + 1
        return state

    def mark_answered(self, state: Dict) -> Dict:
        state = self.ensure_state(state)
        state["turn_count"] = int(state.get("turn_count", 0)) + 1
        state["awaiting_answer"] = False
        return state

    def decide_next_action(
        self,
        decision: InterviewDecision,
        current_state: Dict,
        interview_history: Sequence[dict],
        interview_questions: Sequence[str],
    ) -> InterviewStateDecision:
        state = self.ensure_state(current_state)

        if state.get("finished"):
            return InterviewStateDecision(action="finish", reply_mode="finish", should_end=True, reason="面试已结束")

        if decision.should_end:
            state["finished"] = True
            return InterviewStateDecision(action="finish", reply_mode="finish", should_end=True, reason=decision.reason or "用户结束面试")

        if decision.intent in {"ask_hint", "chat_interrupt", "out_of_scope"} or decision.should_give_hint:
            return InterviewStateDecision(action="hint", reply_mode="hint", should_record_hint=True, reason=decision.reason or "需要提示")

        current_followups = int(state.get("followup_count", 0))
        latest_score = float(state.get("latest_score", 0.0) or 0.0)
        poor_answer_count = int(state.get("poor_answer_count", 0))

        if current_followups >= self.max_followups_per_question:
            state["followup_count"] = 0
            state["poor_answer_count"] = 0
            return InterviewStateDecision(action="next_question", reply_mode="next_question", should_record_question=True, reason="当前问题追问次数已到上限")

        if len(interview_questions) == 0:
            return InterviewStateDecision(action="first_question", reply_mode="next_question", should_record_question=True, reason="初始化第一题")

        if len(interview_questions) >= self.max_total_questions:
            state["finished"] = True
            return InterviewStateDecision(
                action="finish",
                reply_mode="finish",
                should_end=True,
                reason=f"本轮面试已完成 {self.max_total_questions} 个问题，进入结束总结",
            )

        if latest_score < 0.45 and poor_answer_count >= 2:
            state["followup_count"] = 0
            state["poor_answer_count"] = 0
            return InterviewStateDecision(action="next_question", reply_mode="next_question", should_record_question=True, reason="连续两次回答较弱，切换题目")

        if decision.confidence >= 0.75:
            if current_followups < self.max_followups_per_question:
                state["followup_count"] = current_followups + 1
                return InterviewStateDecision(action="follow_up", reply_mode="follow_up", should_record_question=True, reason="回答较好，继续深入追问")
            return InterviewStateDecision(action="next_question", reply_mode="next_question", should_record_question=True, reason="当前问题已追问充分，切换下一题")

        if decision.confidence >= 0.45:
            if latest_score < 0.45 and poor_answer_count >= 1:
                state["followup_count"] = 0
                state["poor_answer_count"] = 0
                return InterviewStateDecision(action="next_question", reply_mode="next_question", should_record_question=True, reason="回答偏弱且已尝试过提示，切换题目")
            state["followup_count"] = current_followups + 1
            return InterviewStateDecision(action="follow_up", reply_mode="follow_up", should_record_question=True, reason="回答一般，适当追问")

        if poor_answer_count >= 1:
            state["followup_count"] = 0
            state["poor_answer_count"] = 0
            return InterviewStateDecision(action="next_question", reply_mode="next_question", should_record_question=True, reason="回答较弱，切换题目")

        return InterviewStateDecision(action="hint", reply_mode="hint", should_record_hint=True, reason="回答质量偏低，先给提示")

    def should_ask_next_question(self, state: Dict, interview_questions: Sequence[str]) -> bool:
        state = self.ensure_state(state)
        if state.get("finished"):
            return False
        if not state.get("target_role"):
            return False
        return bool(interview_questions) or state.get("current_question_index", 0) > 0
