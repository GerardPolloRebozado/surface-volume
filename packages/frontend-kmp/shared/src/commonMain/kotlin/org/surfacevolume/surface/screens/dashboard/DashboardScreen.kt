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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.core.AppCatalogueEntry
import org.surfacevolume.core.ConnectionResource
import org.surfacevolume.core.WorkflowRun
import org.surfacevolume.surface.ApiWorkflowListItem
import org.surfacevolume.surface.AuthSession
import org.surfacevolume.surface.LocalApiConfig
import org.surfacevolume.surface.MobileApi
import kotlinx.coroutines.launch
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
    var building by remember { mutableStateOf<String?>(null) }
    val api = LocalApiConfig.current
    val scope = rememberCoroutineScope()
    var apps by remember { mutableStateOf<List<AppCatalogueEntry>>(emptyList()) }
    val connections = remember { mutableStateListOf<ConnectionResource>() }
    val workflowItems = remember { mutableStateListOf<ApiWorkflowListItem>() }
    val runItems = remember { mutableStateListOf<WorkflowRun>() }
    var loadError by remember { mutableStateOf<String?>(null) }

    fun refresh() {
        scope.launch {
            try {
                val loaded = MobileApi.apps(api)
                apps = loaded
                connections.clear()
                connections.addAll(MobileApi.connections(api))
                workflowItems.clear()
                workflowItems.addAll(MobileApi.workflows(api))
                runItems.clear()
                runItems.addAll(MobileApi.runs(api))
                loadError = null
            } catch (error: Exception) {
                loadError = error.message ?: "Could not load data"
            }
        }
    }

    LaunchedEffect(Unit) { refresh() }

    val workflows = workflowItems.toList().toRows(apps)
    val runs = runItems.toList().toRows(
        workflowItems.associate { it.workflow.id to it.workflow.name },
        workflowItems.associate { it.workflow.id to it.workflow.trigger.field("appId") },
    )
    val serviceConnections = connections.toList().toRows()

    fun toggle(id: String, enabled: Boolean) {
        scope.launch {
            try {
                if (enabled) MobileApi.enableWorkflow(api, id) else MobileApi.disableWorkflow(api, id)
                refresh()
            } catch (error: Exception) {
                loadError = error.message
            }
        }
    }

    if (building != null) {
        BuilderScreen(
            workflowId = building,
            apps = apps,
            connections = connections.toList(),
            onBack = { building = null },
            onSaved = { building = null; refresh() },
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
                    onRun = { workflow ->
                        scope.launch {
                            try {
                                MobileApi.runWorkflow(api, workflow.id)
                                refresh()
                            } catch (error: Exception) {
                                loadError = error.message
                            }
                        }
                    },
                    onCreate = {
                        scope.launch {
                            try {
                                building = MobileApi.createWorkflow(api, "Untitled workflow").id
                            } catch (error: Exception) {
                                loadError = error.message
                            }
                        }
                    },
                    onUseTemplate = {},
                )
                DashboardTab.Runs -> RunsPage(runs = runs)
                DashboardTab.Services -> ServicesPage(
                    apps = apps,
                    connections = serviceConnections,
                    error = loadError,
                    onConnect = { appId, credentials ->
                        scope.launch {
                            try {
                                MobileApi.connect(api, appId, credentials)
                                refresh()
                            } catch (error: Exception) {
                                loadError = error.message
                            }
                        }
                    },
                    onDisconnect = { id ->
                        scope.launch {
                            try {
                                MobileApi.disconnect(api, id)
                                refresh()
                            } catch (error: Exception) {
                                loadError = error.message
                            }
                        }
                    },
                    onTest = { id ->
                        scope.launch {
                            try {
                                val result = MobileApi.testConnection(api, id)
                                loadError = if (result.ok) null else result.message
                                refresh()
                            } catch (error: Exception) {
                                loadError = error.message
                            }
                        }
                    },
                )
                DashboardTab.Templates -> TemplatesPage(onUse = {})
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
    DashboardTab.Workflows -> "$workflowCount workflows"
    DashboardTab.Runs -> "Workflow runs"
    DashboardTab.Services -> "Connections your workflows depend on"
    DashboardTab.Templates -> "Ready-made workflows you can copy"
    DashboardTab.Settings -> "Account and appearance"
}
