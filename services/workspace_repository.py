from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import delete, select

from infrastructure.database import (
    Conversation,
    Message,
    WorkspaceProject,
    WorkspaceSnapshot,
    json_safe,
    platform_database_enabled,
    platform_session,
)
from services.platform_service import ensure_platform_user
from utils.user_history_store import create_default_workspace_state, load_user_state, save_user_state


def load_workspace(user: dict[str, Any]) -> dict[str, Any]:
    if not platform_database_enabled():
        return load_user_state(user["email"])
    profile = ensure_platform_user(user)
    with platform_session() as session:
        snapshot = session.scalar(select(WorkspaceSnapshot).where(WorkspaceSnapshot.user_id == profile["platform_user_id"]))
        if snapshot and snapshot.payload:
            return snapshot.payload

    # The first MySQL run imports the user's existing JSON automatically.
    workspace = load_user_state(user["email"])
    save_workspace(user, workspace)
    return workspace


def save_workspace(user: dict[str, Any], workspace: dict[str, Any]) -> None:
    if not platform_database_enabled():
        save_user_state(user["email"], workspace)
        return
    profile = ensure_platform_user(user)
    platform_user_id = int(profile["platform_user_id"])
    payload = json_safe(workspace)
    with platform_session() as session:
        snapshot = session.scalar(select(WorkspaceSnapshot).where(WorkspaceSnapshot.user_id == platform_user_id))
        if snapshot is None:
            session.add(WorkspaceSnapshot(user_id=platform_user_id, payload=payload))
        else:
            snapshot.payload = payload
            snapshot.updated_at = datetime.utcnow()
        _sync_normalized_workspace(session, platform_user_id, payload)


def _sync_normalized_workspace(session, user_id: int, workspace: dict[str, Any]) -> None:
    """Dual-write normalized rows used by dashboards and future analytics."""
    project_ids = [str(item.get("id")) for item in workspace.get("projects", []) if item.get("id")]
    existing_projects = {item.id: item for item in session.scalars(select(WorkspaceProject).where(WorkspaceProject.user_id == user_id)).all()}

    for project_payload in workspace.get("projects", []):
        project_id = str(project_payload.get("id"))
        project = existing_projects.get(project_id)
        if project is None:
            project = WorkspaceProject(id=project_id, user_id=user_id, name=str(project_payload.get("name", "未命名项目")))
            session.add(project)
        project.name = str(project_payload.get("name", "未命名项目"))
        project.pinned = bool(project_payload.get("pinned", False))

        for conversation_payload in project_payload.get("conversations", []):
            conversation_id = str(conversation_payload.get("id"))
            conversation = session.get(Conversation, conversation_id)
            if conversation is None:
                conversation = Conversation(id=conversation_id, project_id=project_id, user_id=user_id, name="")
                session.add(conversation)
            conversation.name = str(conversation_payload.get("name", "未命名会话"))
            conversation.preferred_mode = str(conversation_payload.get("preferred_mode", "qa"))
            conversation.pinned = bool(conversation_payload.get("pinned", False))
            conversation.state_json = json_safe(conversation_payload.get("state", {}))
            session.flush()

            session.execute(delete(Message).where(Message.conversation_id == conversation_id))
            state = conversation_payload.get("state", {}) or {}
            for mode, history_key in (("qa", "qa_history"), ("interview", "interview_history")):
                for sequence, message in enumerate(state.get(history_key, []) or []):
                    session.add(
                        Message(
                            conversation_id=conversation_id,
                            user_id=user_id,
                            mode=mode,
                            sequence=sequence,
                            role=str(message.get("role", "assistant")),
                            content=str(message.get("content", "")),
                            status=str(message.get("status", "done")),
                        )
                    )

    for project_id, project in existing_projects.items():
        if project_id not in project_ids:
            session.execute(delete(Message).where(Message.conversation_id.in_(select(Conversation.id).where(Conversation.project_id == project_id))))
            session.execute(delete(Conversation).where(Conversation.project_id == project_id))
            session.delete(project)
