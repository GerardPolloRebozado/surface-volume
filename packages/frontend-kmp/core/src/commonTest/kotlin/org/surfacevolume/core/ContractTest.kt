package org.surfacevolume.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ContractTest {
    @Test
    fun everyFixtureDecodesWithNoUnknownKeys() {
        assertEquals(5, DemoData.workflows.size)
        assertEquals(5, DemoData.runs.size)
        assertEquals(8, DemoData.connections.size)
        assertEquals(10, DemoData.catalogue.size)
        assertEquals("Alex Martin", DemoData.account.name)
        assertEquals(128, DemoData.stats.weekRuns)
    }

    @Test
    fun statusesAreTheOnesTheServerPersists() {
        assertEquals(
            listOf(
                WorkflowStatus.ERROR,
                WorkflowStatus.ON,
                WorkflowStatus.OFF,
                WorkflowStatus.ON,
                WorkflowStatus.DRAFT,
            ),
            DemoData.workflows.map { it.workflow.status },
        )
    }

    @Test
    fun theListProjectionMatchesTheGraph() {
        DemoData.workflows.forEach { item ->
            assertEquals(
                item.workflow.servicesUsed,
                item.services,
                "services for ${item.workflow.name}",
            )
        }
    }

    @Test
    fun theGraphIsWhatTheFixturesSay() {
        DemoData.workflows.forEach { item ->
            val workflow = item.workflow
            val targets = workflow.links.map { it.to }.toSet()
            workflow.nodes.forEach { node ->
                assertTrue(node.id in targets, "${node.id} in ${workflow.name} has no link into it")
            }
            assertTrue(workflow.isRunnable, "${workflow.name} should be runnable")
        }

        val contracts = DemoData.workflow("0199a0c0-0000-7000-8000-000000000103")
        checkNotNull(contracts)
        assertEquals(2, contracts.nodes.filterIsInstance<BranchNode>().single().paths.size)
        assertEquals("signed", contracts.links.first { it.fromPath != null }.fromPath)
    }

    @Test
    fun everyLastRunIsOneOfTheRuns() {
        val runsById = DemoData.runs.associateBy { it.id }

        DemoData.workflows.forEach { item ->
            val lastRun = item.lastRun ?: return@forEach
            val stored = runsById[lastRun.id]
            checkNotNull(stored) { "${lastRun.id} is not in runs.json" }
            assertEquals(stored, lastRun, "lastRun of ${item.workflow.name} disagrees with runs.json")
        }

        DemoData.runs.forEach { run ->
            assertTrue(
                DemoData.workflows.any { it.workflow.id == run.workflowId },
                "run ${run.id} points at an unknown workflow",
            )
        }
    }

    @Test
    fun relativeTimeReadsLikeTheWebApp() {
        assertEquals("just now", relativeTime(DemoData.NOW, DemoData.NOW))
        assertEquals(
            "12 min ago",
            relativeTime("2026-11-16T09:06:00+01:00", DemoData.NOW),
        )
        assertEquals("1 h ago", relativeTime("2026-11-16T08:10:00+01:00", DemoData.NOW))
        assertEquals("yesterday", relativeTime("2026-11-15T08:00:00+01:00", DemoData.NOW))
        assertEquals("2 days ago", relativeTime("2026-11-14T09:00:00+01:00", DemoData.NOW))
    }

    @Test
    fun durationsComeFromTheRunTimestamps() {
        val run = DemoData.runs.first { it.id == "0199a0c0-0000-7000-8000-000000000301" }
        assertEquals(2_000L, runDurationMillis(run))
        assertEquals("2.0 s", formatDuration(runDurationMillis(run)))
        assertEquals("900 ms", formatDuration(900))
        assertEquals("—", formatDuration(null))
    }
}
