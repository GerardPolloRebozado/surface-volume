package org.surfacevolume.surface.screens.dashboard

import androidx.compose.ui.graphics.Color
import org.surfacevolume.core.AppCatalogueEntry
import org.surfacevolume.core.ConnectionStatus
import org.surfacevolume.core.DemoData
import org.surfacevolume.core.RunStatus
import org.surfacevolume.core.WorkflowListItem
import org.surfacevolume.core.WorkflowStatus as ApiStatus
import org.surfacevolume.core.formatDuration
import org.surfacevolume.core.relativeTime
import org.surfacevolume.core.runDurationMillis
import org.surfacevolume.surface.components.AppIcon
import org.surfacevolume.surface.components.PillTone

enum class Service(val appId: String, val label: String, val icon: AppIcon, val tint: Color) {
    Gmail("gmail", "Gmail", AppIcon.Mail, Color(0xFFB3261E)),
    Drive("drive", "Google Drive", AppIcon.Folder, Color(0xFF17764A)),
    Slack("slack", "Slack", AppIcon.Chat, Color(0xFF6A3D9A)),
    Notion("notion", "Notion", AppIcon.Page, Color(0xFF3A3A40)),
    Calendar("calendar", "Google Calendar", AppIcon.Calendar, Color(0xFF1B6FC4)),
    GitHub("github", "GitHub", AppIcon.Code, Color(0xFF43434A)),
    Linear("linear", "Linear", AppIcon.Layers, Color(0xFF6150A8)),
    Stripe("stripe", "Stripe", AppIcon.Layers, Color(0xFF4A3F8F)),
    Webhook("webhook", "Webhook", AppIcon.Code, Color(0xFF8A5A00)),
    Discord("discord", "Discord", AppIcon.Chat, Color(0xFF4756A8)),
    ;

    companion object {
        fun of(appId: String): Service? = entries.firstOrNull { it.appId == appId }
    }
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

private val catalogueById: Map<String, AppCatalogueEntry> = DemoData.catalogue.associateBy { it.id }

private fun triggerLabel(appId: String, triggerKey: String): String =
    catalogueById[appId]?.triggers?.get(triggerKey)
        ?: triggerKey.replace('_', ' ')

private fun WorkflowListItem.toRow(): Workflow {
    val resource = workflow
    return Workflow(
        id = resource.id,
        name = resource.name,
        intent = resource.description.orEmpty(),
        trigger = triggerLabel(resource.trigger.appId, resource.trigger.triggerKey),
        services = services.mapNotNull(Service::of),
        steps = 1 + resource.nodes.size,
        enabled = resource.status == ApiStatus.ON || resource.status == ApiStatus.ERROR,
        draft = resource.status == ApiStatus.DRAFT,
        needsAttention = resource.status == ApiStatus.ERROR,
        lastRun = lastRun?.let { run -> relativeTime(run.finishedAt ?: run.queuedAt, DemoData.NOW) },
        lastRunOk = lastRun?.status != RunStatus.FAILED,
    )
}

val DemoWorkflows: List<Workflow> = DemoData.workflows.map { it.toRow() }

private val workflowNames: Map<String, WorkflowListItem> =
    DemoData.workflows.associateBy { it.workflow.id }

val DemoRuns: List<Run> = DemoData.runs.map { run ->
    val item = workflowNames[run.workflowId]
    Run(
        workflow = item?.workflow?.name ?: "Workflow",
        service = item?.workflow?.trigger?.appId?.let(Service::of) ?: Service.Webhook,
        whenLabel = relativeTime(run.finishedAt ?: run.queuedAt, DemoData.NOW),
        duration = formatDuration(runDurationMillis(run)),
        ok = run.status != RunStatus.FAILED,
    )
}

val DemoServices: List<ServiceConnection> = DemoData.connections.mapNotNull { connection ->
    val service = Service.of(connection.appId) ?: return@mapNotNull null
    ServiceConnection(
        service = service,
        account = connection.account ?: connection.appName,
        connected = connection.status == ConnectionStatus.ACTIVE,
    )
}

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

val DemoPerDay: List<Int> = DemoData.stats.runsPerDay
