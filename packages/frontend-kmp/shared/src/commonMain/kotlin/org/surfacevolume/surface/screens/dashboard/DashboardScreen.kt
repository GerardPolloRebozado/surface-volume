package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.AuthSession
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.AppBar
import org.surfacevolume.surface.components.AppIcon
import org.surfacevolume.surface.components.AppShell
import org.surfacevolume.surface.components.Avatar
import org.surfacevolume.surface.components.Brand
import org.surfacevolume.surface.components.Eyebrow
import org.surfacevolume.surface.components.Icon
import org.surfacevolume.surface.components.IconButton
import org.surfacevolume.surface.components.NavItem
import org.surfacevolume.surface.components.TopRule

enum class DashboardTab(val label: String, val icon: AppIcon) {
    Workflows("Workflows", AppIcon.Bolt),
    Runs("Runs", AppIcon.Activity),
    Services("Services", AppIcon.Layers),
    Templates("Templates", AppIcon.Grid),
    Settings("Settings", AppIcon.Sliders),
}

@Composable
fun DashboardScreen(
    email: String,
    darkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
    initialTab: DashboardTab = DashboardTab.Workflows,
) {
    val name = remember(email) {
        email.substringBefore('@').replaceFirstChar { it.uppercase() }.ifBlank { "there" }
    }
    var tab by remember { mutableStateOf(initialTab) }
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(WorkflowFilter.All) }
    var building by remember { mutableStateOf(false) }
    val workflows = remember { DemoWorkflows.toMutableStateList() }
    val runs = remember { DemoRuns.toMutableStateList() }

    fun toggle(id: String, enabled: Boolean) {
        val index = workflows.indexOfFirst { it.id == id }
        if (index >= 0) {
            val workflow = workflows[index]
            workflows[index] = workflow.copy(
                enabled = enabled,
                draft = if (enabled) false else workflow.draft,
                needsAttention = false,
            )
        }
    }

    fun runNow(workflow: Workflow) {
        workflows[workflows.indexOfFirst { it.id == workflow.id }] =
            workflow.copy(lastRun = "Just now", lastRunOk = true, needsAttention = false)
        runs.add(
            index = 0,
            element = Run(workflow.name, workflow.services.first(), "Just now", "1.4 s", true),
        )
    }

    fun createWorkflow(title: String, services: List<Service>, trigger: String, steps: Int) {
        workflows.add(
            index = 0,
            element = Workflow(
                id = "draft-${workflows.size + 1}",
                name = title,
                intent = "NEW. Open it to add steps.",
                trigger = trigger,
                services = services,
                steps = steps,
                enabled = false,
                draft = true,
                lastRun = null,
            ),
        )
        tab = DashboardTab.Workflows
    }

    if (building) {
        BuilderScreen(
            onBack = { building = false },
            onSave = { result ->
                createWorkflow(
                    title = result.name,
                    services = result.services,
                    trigger = result.trigger,
                    steps = result.steps,
                )
                building = false
            },
        )
        return
    }

    AppShell(
        modifier = modifier
            .fillMaxSize()
            .windowInsetsPadding(
                WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal),
            ),
        sidebar = {
            SidebarContent(
                name = name,
                email = email,
                tab = tab,
                onSelect = { tab = it },
                onSignOut = onSignOut,
            )
        },
        bar = {
            AppBar(
                title = tab.label,
                subtitle = subtitleFor(tab, workflows.size),
                actions = {
                    IconButton(
                        icon = if (darkTheme) AppIcon.Sun else AppIcon.Moon,
                        label = if (darkTheme) "Switch to light mode" else "Switch to dark mode",
                        onClick = onToggleTheme,
                    )
                    IconButton(
                        icon = AppIcon.Logout,
                        label = "Sign out",
                        onClick = onSignOut,
                    )
                },
            )
        },
        compactNav = { CompactNav(tab = tab, onSelect = { tab = it }) },
        content = {
            when (tab) {
                DashboardTab.Workflows -> WorkflowsPage(
                    name = name,
                    workflows = workflows,
                    runs = runs,
                    query = query,
                    onQueryChange = { query = it },
                    filter = filter,
                    onFilterChange = { filter = it },
                    onToggle = ::toggle,
                    onRun = ::runNow,
                    onCreate = { building = true },
                    onUseTemplate = { template ->
                        createWorkflow(
                            title = template.name,
                            services = template.services,
                            trigger = "Choose a trigger",
                            steps = 1,
                        )
                    },
                )
                DashboardTab.Runs -> RunsPage(runs = runs)
                DashboardTab.Services -> ServicesPage()
                DashboardTab.Templates -> TemplatesPage(onUse = { template ->
                    createWorkflow(
                        title = template.name,
                        services = template.services,
                        trigger = "Choose a trigger",
                        steps = 1,
                    )
                })
                DashboardTab.Settings -> SettingsPage(
                    name = name,
                    email = email,
                    darkTheme = darkTheme,
                    onToggleTheme = onToggleTheme,
                    onSignOut = { AuthSession.clear(); onSignOut() },
                )
            }
        },
    )
}

@Composable
private fun ColumnScope.SidebarContent(
    name: String,
    email: String,
    tab: DashboardTab,
    onSelect: (DashboardTab) -> Unit,
    onSignOut: () -> Unit,
) {
    val colors = LocalAppColors.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Brand(fontSize = 19.sp)
        }

        Eyebrow(
            text = "Work",
            modifier = Modifier.padding(start = 10.dp, top = 8.dp, bottom = 4.dp),
        )
        listOf(DashboardTab.Workflows, DashboardTab.Runs, DashboardTab.Services, DashboardTab.Templates)
            .forEach { item ->
                NavItem(
                    label = item.label,
                    icon = item.icon,
                    selected = tab == item,
                    onClick = { onSelect(item) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }

        Eyebrow(
            text = "Account",
            modifier = Modifier.padding(start = 10.dp, top = 16.dp, bottom = 4.dp),
        )
        NavItem(
            label = DashboardTab.Settings.label,
            icon = DashboardTab.Settings.icon,
            selected = tab == DashboardTab.Settings,
            onClick = { onSelect(DashboardTab.Settings) },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(modifier = Modifier.weight(1f))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.fill, androidx.compose.foundation.shape.RoundedCornerShape(10.dp))
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Avatar(initials = name, size = 30.dp)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    color = colors.ink,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = email,
                    color = colors.mute,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(icon = AppIcon.Logout, label = "Sign out", onClick = onSignOut)
        }
    }
}

@Composable
private fun CompactNav(tab: DashboardTab, onSelect: (DashboardTab) -> Unit) {
    val colors = LocalAppColors.current
    Column(modifier = Modifier.fillMaxWidth().background(colors.card)) {
        TopRule()
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            DashboardTab.entries.forEach { item ->
                CompactNavItem(
                    label = item.label,
                    icon = item.icon,
                    selected = tab == item,
                    onClick = { onSelect(item) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun CompactNavItem(
    label: String,
    icon: AppIcon,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    val interaction = remember { MutableInteractionSource() }
    val hovered by interaction.collectIsHoveredAsState()
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                when {
                    selected -> colors.fill
                    hovered -> colors.fill
                    else -> Color.Transparent
                },
            )
            .hoverable(interaction)
            .clickable(role = Role.Tab, onClick = onClick)
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Icon(
            icon = icon,
            size = 15.dp,
            tint = if (selected) colors.ink else colors.mute,
        )
        Text(
            text = label,
            color = if (selected) colors.ink else colors.mute,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            maxLines = 1,
        )
    }
}

private fun subtitleFor(tab: DashboardTab, workflowCount: Int): String = when (tab) {
    DashboardTab.Workflows -> "$workflowCount workflows · 128 runs this week · 4 failed"
    DashboardTab.Runs -> "Every run from the last seven days"
    DashboardTab.Services -> "Connections your workflows depend on"
    DashboardTab.Templates -> "Ready-made workflows you can copy"
    DashboardTab.Settings -> "Account and appearance"
}
