package org.surfacevolume.core

import kotlinx.serialization.json.Json

object DemoData {
    private val json = Json { ignoreUnknownKeys = false }


    const val NOW: String = "2026-11-16T09:18:00+01:00"

    val workflows: List<WorkflowListItem> by lazy { json.decodeFromString(Fixtures.WorkflowsJson) }

    val runs: List<WorkflowRun> by lazy { json.decodeFromString(Fixtures.RunsJson) }

    val connections: List<ConnectionResource> by lazy {
        json.decodeFromString(Fixtures.ConnectionsJson)
    }

    val catalogue: List<AppCatalogueEntry> by lazy { json.decodeFromString(Fixtures.CatalogueJson) }

    val account: Account by lazy { json.decodeFromString(Fixtures.AccountJson) }

    val stats: DashboardStats by lazy { json.decodeFromString(Fixtures.StatsJson) }

    fun workflow(id: String): WorkflowResource? =
        workflows.firstOrNull { it.workflow.id == id }?.workflow

    fun app(appId: String): AppCatalogueEntry? = catalogue.firstOrNull { it.id == appId }
}
