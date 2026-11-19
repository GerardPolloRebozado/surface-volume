package org.surfacevolume.surface.screens.dashboard

import androidx.compose.ui.graphics.Color
import org.surfacevolume.surface.components.AppIcon
import org.surfacevolume.surface.components.PillTone

// mock data, we will have to replace this with api calls

enum class Service(val label: String, val icon: AppIcon, val tint: Color) {
    Gmail("Gmail", AppIcon.Mail, Color(0xFFB3261E)),
    Drive("Google Drive", AppIcon.Folder, Color(0xFF17764A)),
    Slack("Slack", AppIcon.Chat, Color(0xFF6A3D9A)),
    Notion("Notion", AppIcon.Page, Color(0xFF3A3A40)),
    Calendar("Google Calendar", AppIcon.Calendar, Color(0xFF1B6FC4)),
    GitHub("GitHub", AppIcon.Code, Color(0xFF43434A)),
}

enum class WorkflowStatus(val label: String, val tone: PillTone, val icon: AppIcon?) {
    Active("Active", PillTone.Ok, null),
    Paused("Paused", PillTone.Neutral, null),
    Draft("Draft", PillTone.Neutral, AppIcon.Info),
    NeedsAttention("Needs attention", PillTone.Warn, AppIcon.Alert),
}

data class Workflow(
    val id: String,
    val name: String,
    val intent: String,
    val trigger: String,
    val services: List<Service>,
    val steps: Int,
    val enabled: Boolean = true,
    val draft: Boolean = false,
    val needsAttention: Boolean = false,
    val lastRun: String? = null,
    val lastRunOk: Boolean = true,
) {
    val status: WorkflowStatus
        get() = when {
            draft -> WorkflowStatus.Draft
            needsAttention -> WorkflowStatus.NeedsAttention
            enabled -> WorkflowStatus.Active
            else -> WorkflowStatus.Paused
        }
}

data class Run(
    val workflow: String,
    val service: Service,
    val whenLabel: String,
    val duration: String,
    val ok: Boolean,
)

data class ServiceConnection(
    val service: Service,
    val account: String,
    val connected: Boolean,
)

data class Template(
    val name: String,
    val body: String,
    val services: List<Service>,
)

val DemoWorkflows: List<Workflow> = listOf(
    Workflow(
        id = "invoices",
        name = "Invoices to the books",
        intent = "File supplier invoices, log them, and ask before paying the big ones.",
        trigger = "Mail from a supplier",
        services = listOf(Service.Gmail, Service.Drive, Service.Notion, Service.Slack),
        steps = 5,
        lastRun = "12 min ago",
    ),
    Workflow(
        id = "standup",
        name = "Standup reminder",
        intent = "Post the agenda ten minutes before the team standup.",
        trigger = "Event starts soon",
        services = listOf(Service.Calendar, Service.Slack),
        steps = 2,
        lastRun = "1 h ago",
    ),
    Workflow(
        id = "contracts",
        name = "Archive signed contracts",
        intent = "Move signed PDFs into the legal folder and log the client.",
        trigger = "File added to a folder",
        services = listOf(Service.Drive, Service.Notion),
        steps = 3,
        enabled = false,
        lastRun = "Yesterday",
    ),
    Workflow(
        id = "triage",
        name = "Triage new issues",
        intent = "Label incoming issues and ping the owner in Slack.",
        trigger = "Issue opened",
        services = listOf(Service.GitHub, Service.Slack),
        steps = 4,
        needsAttention = true,
        lastRun = "2 h ago",
        lastRunOk = false,
    ),
    Workflow(
        id = "payments",
        name = "Payments follow-up",
        intent = "Remind the finance channel about invoices still unpaid after a week.",
        trigger = "Label applied",
        services = listOf(Service.Gmail, Service.Slack),
        steps = 3,
        enabled = false,
        draft = true,
        lastRun = null,
    ),
)

val DemoRuns: List<Run> = listOf(
    Run("Invoices to the books", Service.Gmail, "12 min ago", "3.4 s", true),
    Run("Triage new issues", Service.GitHub, "2 h ago", "0.9 s", false),
    Run("Standup reminder", Service.Calendar, "1 h ago", "1.2 s", true),
    Run("Invoices to the books", Service.Gmail, "3 h ago", "4.1 s", true),
    Run("Archive signed contracts", Service.Drive, "Yesterday", "2.0 s", true),
    Run("Standup reminder", Service.Calendar, "Yesterday", "1.1 s", true),
    Run("Invoices to the books", Service.Gmail, "Yesterday", "3.9 s", false),
    Run("Payments follow-up", Service.Gmail, "2 days ago", "—", false),
)

val DemoServices: List<ServiceConnection> = listOf(
    ServiceConnection(Service.Gmail, "alex@epitech.eu", connected = true),
    ServiceConnection(Service.Drive, "alex@epitech.eu", connected = true),
    ServiceConnection(Service.Slack, "area-lab.slack.com", connected = true),
    ServiceConnection(Service.Notion, "Finance workspace", connected = true),
    ServiceConnection(Service.Calendar, "alex@epitech.eu", connected = true),
    ServiceConnection(Service.GitHub, "alex · expired 2 days ago", connected = false),
)

val DemoTemplates: List<Template> = listOf(
    Template(
        name = "Weekly report",
        body = "Collect the week's numbers and post them on Monday morning.",
        services = listOf(Service.Slack, Service.Notion, Service.Calendar),
    ),
    Template(
        name = "Invoice triage",
        body = "File attachments, log expenses, ask before paying the big ones.",
        services = listOf(Service.Gmail, Service.Drive, Service.Notion),
    ),
    Template(
        name = "On-call handoff",
        body = "Post the open incidents and who is on call next.",
        services = listOf(Service.GitHub, Service.Slack),
    ),
)

val DemoPerDay: List<Int> = listOf(12, 18, 9, 22, 16, 7, 14, 19, 11, 8, 21, 17, 13, 15)
