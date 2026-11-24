package org.surfacevolume.surface.screens.dashboard

import androidx.compose.ui.graphics.Color
import kotlin.time.Clock
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.surfacevolume.core.AppCatalogueEntry
import org.surfacevolume.core.ConnectionResource
import org.surfacevolume.surface.ApiWorkflowListItem
import org.surfacevolume.core.WorkflowRun
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

data class Service(val appId: String, val label: String, val icon: AppIcon, val tint: Color) {
    companion object {
        val Gmail = Service("gmail", "HoloNet Mail", AppIcon.Mail, Color(0xFFB3261E))
        val Drive = Service("drive", "Death Star Plans Vault", AppIcon.Folder, Color(0xFF17764A))
        val Slack = Service("slack", "Rebel Comms", AppIcon.Chat, Color(0xFF6A3D9A))
        val Notion = Service("notion", "Jedi Archives", AppIcon.Page, Color(0xFF3A3A40))
        val Calendar = Service("calendar", "Imperial Schedule", AppIcon.Calendar, Color(0xFF1B6FC4))
        val GitHub = Service("github", "Droid Forge", AppIcon.Code, Color(0xFF43434A))
        val Linear = Service("linear", "Order Tracker", AppIcon.Layers, Color(0xFF6150A8))
        val Stripe = Service("stripe", "Galactic Credits", AppIcon.Layers, Color(0xFF4A3F8F))
        val Webhook = Service("webhook", "Hypercomms Relay", AppIcon.Code, Color(0xFF8A5A00))
        val Discord = Service("discord", "Cantina Chat", AppIcon.Chat, Color(0xFF4756A8))
        val Mastodon = Service("mastodon", "Mastodon", AppIcon.Chat, Color(0xFF6364FF))

        private val known = listOf(
            Gmail, Drive, Slack, Notion, Calendar, GitHub, Linear, Stripe, Webhook, Discord, Mastodon,
        ).associateBy { it.appId }

        fun of(appId: String): Service? = known[appId]

        fun from(appId: String, label: String? = null): Service =
            known[appId] ?: Service(appId, label ?: appId, AppIcon.Bolt, Color(0xFF5A5A63))
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
    val id: String = "",
    val service: Service,
    val account: String,
    val connected: Boolean,
    val needsAttention: Boolean = false,
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

fun List<ApiWorkflowListItem>.toRows(apps: List<AppCatalogueEntry>): List<Workflow> {
    val now = Clock.System.now().toString()
    val catalogue = apps.associateBy { it.id }
    return map { item ->
        val resource = item.workflow
        Workflow(
            id = resource.id,
            name = resource.name,
            intent = resource.description.orEmpty(),
            trigger = resource.trigger.field("appId").let { appId ->
                val key = resource.trigger.field("triggerKey")
                catalogue[appId]?.triggers?.get(key) ?: key.replace('_', ' ')
            },
            services = item.services.map { Service.from(it) },
            steps = 1 + resource.nodes.size,
            enabled = resource.status == "on",
            draft = resource.status == "draft",
            needsAttention = resource.status == "error",
            lastRun = item.lastRun?.let { run -> relativeTime(run.finishedAt ?: run.queuedAt, now) },
            lastRunOk = item.lastRun?.status != RunStatus.FAILED,
        )
    }
}

fun List<WorkflowRun>.toRows(
    workflowNames: Map<String, String>,
    workflowApps: Map<String, String>,
): List<Run> {
    val now = Clock.System.now().toString()
    return map { run ->
        Run(
            workflow = workflowNames[run.workflowId] ?: "Workflow",
            service = workflowApps[run.workflowId]?.let { Service.from(it) } ?: Service.Webhook,
            whenLabel = relativeTime(run.finishedAt ?: run.queuedAt, now),
            duration = formatDuration(runDurationMillis(run)),
            ok = run.status != RunStatus.FAILED,
        )
    }
}

fun List<ConnectionResource>.toRows(): List<ServiceConnection> = map { connection ->
    ServiceConnection(
        id = connection.id,
        service = Service.from(connection.appId, connection.appName),
        account = connection.account ?: connection.appName,
        connected = connection.status == ConnectionStatus.ACTIVE,
        needsAttention = connection.status == ConnectionStatus.ERROR || connection.status == ConnectionStatus.EXPIRED,
    )
}

internal fun JsonElement?.field(name: String): String =
    (this as? JsonObject)?.get(name)?.jsonPrimitive?.content.orEmpty()
