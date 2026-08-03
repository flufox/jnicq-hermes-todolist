"""Hermes Todo plugin entry point."""

from .tools import (
    ARCHIVE_TASK_SCHEMA,
    COMPLETE_TASK_SCHEMA,
    CREATE_TASK_SCHEMA,
    LIST_MEMBERS_SCHEMA,
    LIST_TASKS_SCHEMA,
    UPDATE_TASK_SCHEMA,
    check_requirements,
    handle_archive_task,
    handle_complete_task,
    handle_create_task,
    handle_list_members,
    handle_list_tasks,
    handle_update_task,
)


def register(ctx) -> None:
    definitions = (
        ("hermes_todo_list_members", LIST_MEMBERS_SCHEMA, handle_list_members, "👥"),
        ("hermes_todo_list_tasks", LIST_TASKS_SCHEMA, handle_list_tasks, "📋"),
        ("hermes_todo_create_task", CREATE_TASK_SCHEMA, handle_create_task, "➕"),
        ("hermes_todo_update_task", UPDATE_TASK_SCHEMA, handle_update_task, "✏️"),
        ("hermes_todo_complete_task", COMPLETE_TASK_SCHEMA, handle_complete_task, "✅"),
        ("hermes_todo_archive_task", ARCHIVE_TASK_SCHEMA, handle_archive_task, "📦"),
    )
    for name, schema, handler, emoji in definitions:
        ctx.register_tool(
            name=name,
            toolset="hermes_todo",
            schema=schema,
            handler=handler,
            check_fn=check_requirements,
            emoji=emoji,
        )


__all__ = ["register"]
