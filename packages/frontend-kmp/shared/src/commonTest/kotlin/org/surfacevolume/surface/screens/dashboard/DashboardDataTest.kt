package org.surfacevolume.surface.screens.dashboard

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class DashboardDataTest {
    @Test
    fun rowsComeFromTheContract() {
        assertEquals(5, DemoWorkflows.size)

        val invoices = DemoWorkflows.first { it.name == "Bounty contracts to the ledger" }
        assertEquals(WorkflowStatus.NeedsAttention, invoices.status)
        assertEquals(listOf("HoloNet Mail", "Death Star Plans Vault", "Jedi Archives", "Rebel Comms"), invoices.services.map { it.label })
        assertEquals("HoloNet message arrives", invoices.trigger)
        assertEquals(4, invoices.steps)
        assertTrue(invoices.lastRun!!.endsWith("min ago"), "last run was ${invoices.lastRun}")
    }

    @Test
    fun theRowStatusIsTheServerStatus() {
        assertEquals(
            listOf(
                WorkflowStatus.NeedsAttention,
                WorkflowStatus.Active,
                WorkflowStatus.Paused,
                WorkflowStatus.Active,
                WorkflowStatus.Draft,
            ),
            DemoWorkflows.map { it.status },
        )
    }

    @Test
    fun runsAndConnectionsComeFromTheContract() {
        assertEquals(5, DemoRuns.size)
        assertEquals("Bounty contracts to the ledger", DemoRuns.first().workflow)
        assertEquals(Service.Gmail, DemoRuns.first().service)
        assertEquals("2.0 s", DemoRuns.first().duration)
        assertTrue(DemoRuns.last().let { !it.ok })

        assertEquals(8, DemoServices.size)
        assertEquals(7, DemoServices.count { it.connected })
        assertEquals(Service.Notion, DemoServices.first { !it.connected }.service)

        assertEquals(14, DemoPerDay.size)
    }
}
