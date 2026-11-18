package org.surfacevolume.surface.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
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
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.AppBar
import org.surfacevolume.surface.components.AppIcon
import org.surfacevolume.surface.components.AppShell
import org.surfacevolume.surface.components.Avatar
import org.surfacevolume.surface.components.Banner
import org.surfacevolume.surface.components.BannerTone
import org.surfacevolume.surface.components.BarChart
import org.surfacevolume.surface.components.Brand
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.ButtonVariant
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.Eyebrow
import org.surfacevolume.surface.components.Icon
import org.surfacevolume.surface.components.IconButton
import org.surfacevolume.surface.components.ListRow
import org.surfacevolume.surface.components.NavItem
import org.surfacevolume.surface.components.Page
import org.surfacevolume.surface.components.Pill
import org.surfacevolume.surface.components.PillTone
import org.surfacevolume.surface.components.SectionHeader
import org.surfacevolume.surface.components.Segmented
import org.surfacevolume.surface.components.ServiceIcon
import org.surfacevolume.surface.components.Stat
import org.surfacevolume.surface.components.Switch
import org.surfacevolume.surface.components.TextField
import org.surfacevolume.surface.components.TextLink
import org.surfacevolume.surface.components.TopRule

enum class DashboardTab(val label: String, val icon: AppIcon) {
    Workflows("Workflows", AppIcon.Bolt),
    Runs("Runs", AppIcon.Activity),
    Services("Services", AppIcon.Layers),
    Templates("Templates", AppIcon.Grid),
    Settings("Settings", AppIcon.Sliders),
}

private enum class WorkflowFilter(val label: String) {
    All("All"),
    On("On"),
    Off("Off"),
    Attention("Attention"),
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
    val workflows = remember { DemoWorkflows.toMutableStateList() }
    val runs = remember { DemoRuns.toMutableStateList() }

    fun toggle(id: String, enabled: Boolean) {
        val index = workflows.indexOfFirst { it.id == id }
        if (index >= 0) {
            val workflow = workflows[index]
            workflows[index] = workflow.copy(
                enabled = enabled,
                draft = if (enabled) false else workflow.draft,
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
                    onCreate = {
                        createWorkflow(
                            title = "Untitled workflow",
                            services = listOf(Service.Gmail),
                            trigger = "Choose a trigger",
                            steps = 1,
                        )
                    },
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
                    onSignOut = onSignOut,
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

@Composable
private fun WorkflowsPage(
    name: String,
    workflows: List<Workflow>,
    runs: List<Run>,
    query: String,
    onQueryChange: (String) -> Unit,
    filter: WorkflowFilter,
    onFilterChange: (WorkflowFilter) -> Unit,
    onToggle: (String, Boolean) -> Unit,
    onRun: (Workflow) -> Unit,
    onCreate: () -> Unit,
    onUseTemplate: (Template) -> Unit,
) {
    val colors = LocalAppColors.current
    Page {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val wide = maxWidth >= 760.dp
            if (wide) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Greeting(name = name, workflows = workflows, modifier = Modifier.weight(1f))
                    SearchField(query = query, onQueryChange = onQueryChange, modifier = Modifier.width(230.dp))
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Greeting(name = name, workflows = workflows)
                    SearchField(query = query, onQueryChange = onQueryChange, modifier = Modifier.fillMaxWidth())
                }
            }
        }

        Banner(
            tone = BannerTone.Warn,
            title = "GitHub needs reconnecting",
            body = "Triage new issues uses GitHub, which expired two days ago. Runs will fail until you reconnect.",
            actions = {
                Button(text = "Reconnect GitHub", onClick = {}, small = true)
                Button(
                    text = "View failed runs",
                    onClick = {},
                    variant = ButtonVariant.Ghost,
                    small = true,
                )
            },
        )

        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            if (maxWidth >= 860.dp) {
                Row(
                    modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    SuccessCard(modifier = Modifier.weight(2f).fillMaxHeight(), fillHeight = true)
                    ActivityCard(runs = runs, modifier = Modifier.weight(1f).fillMaxHeight())
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    SuccessCard()
                    ActivityCard(runs = runs)
                }
            }
        }

        WorkflowListCard(
            workflows = workflows,
            query = query,
            filter = filter,
            onFilterChange = onFilterChange,
            onToggle = onToggle,
            onRun = onRun,
            onCreate = onCreate,
        )

        TemplatesSection(onUse = onUseTemplate)

        Text(
            text = "mock data",
            color = colors.faint,
            fontSize = 11.sp,
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
        )
    }
}

@Composable
private fun Greeting(
    name: String,
    workflows: List<Workflow>,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(
            text = "Good morning, $name.",
            color = colors.ink,
            fontSize = 26.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = (-0.5).sp,
        )
        Text(
            text = "${workflows.size} workflows · 128 runs this week · 4 failed",
            color = colors.mute,
            fontSize = 13.5.sp,
        )
    }
}

@Composable
private fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    TextField(
        value = query,
        onValueChange = onQueryChange,
        placeholder = "Search workflows",
        modifier = modifier,
    )
}

@Composable
private fun SuccessCard(modifier: Modifier = Modifier, fillHeight: Boolean = false) {
    val colors = LocalAppColors.current
    Card(modifier = modifier, contentPadding = 16.dp, contentSpacing = 12.dp) {
        SectionHeader(
            title = "Success rate",
            caption = "Last 14 days",
            trailing = { TextLink(text = "View runs", onClick = {}, fontSize = 12.sp) },
        )
        Stat(
            value = "96.9",
            unit = "%",
            label = "Runs succeeded",
            delta = "+1.4 pts",
            deltaTone = PillTone.Ok,
        )
        if (fillHeight) {
            // In the side-by-side layout the card is stretched to match Activity,
            // so the chart takes the leftover height instead of leaving a gap
            BarChart(values = DemoPerDay, modifier = Modifier.weight(1f), height = null)
        } else {
            BarChart(values = DemoPerDay, height = 88.dp)
        }
        TopRule()
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            CountLabel(value = "128", label = "runs this week", color = colors.ink)
            CountLabel(value = "4", label = "failed", color = colors.bad)
            Spacer(modifier = Modifier.weight(1f))
            Text(text = "4 today", color = colors.faint, fontSize = 11.sp)
        }
    }
}

@Composable
private fun CountLabel(value: String, label: String, color: Color) {
    val colors = LocalAppColors.current
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(text = value, color = color, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Text(text = label, color = colors.mute, fontSize = 12.sp)
    }
}

@Composable
private fun ActivityCard(runs: List<Run>, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Card(modifier = modifier, contentPadding = 16.dp, contentSpacing = 6.dp) {
        SectionHeader(
            title = "Activity",
            trailing = { TextLink(text = "View all", onClick = {}, fontSize = 12.sp) },
        )
        Column {
            runs.take(5).forEach { run ->
                ListRow(
                    leading = { ServiceIcon(icon = run.service.icon, tint = run.service.tint, size = 22.dp) },
                    content = {
                        Text(
                            text = run.workflow,
                            color = colors.ink,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(text = run.whenLabel, color = colors.mute, fontSize = 10.5.sp)
                    },
                    trailing = {
                        Icon(
                            icon = if (run.ok) AppIcon.Check else AppIcon.X,
                            size = 14.dp,
                            tint = if (run.ok) colors.ok else colors.bad,
                            strokeWidth = 2.dp,
                        )
                    },
                )
            }
        }
    }
}

@Composable
private fun WorkflowListCard(
    workflows: List<Workflow>,
    query: String,
    filter: WorkflowFilter,
    onFilterChange: (WorkflowFilter) -> Unit,
    onToggle: (String, Boolean) -> Unit,
    onRun: (Workflow) -> Unit,
    onCreate: () -> Unit,
) {
    val colors = LocalAppColors.current
    val needle = query.trim().lowercase()
    val visible = workflows.filter { workflow ->
        val matchesFilter = when (filter) {
            WorkflowFilter.All -> true
            WorkflowFilter.On -> workflow.enabled && !workflow.draft
            WorkflowFilter.Off -> !workflow.enabled
            WorkflowFilter.Attention ->
                workflow.status == WorkflowStatus.NeedsAttention || workflow.draft
        }
        val matchesQuery = needle.isEmpty() ||
            workflow.name.lowercase().contains(needle) ||
            workflow.intent.lowercase().contains(needle) ||
            workflow.trigger.lowercase().contains(needle)
        matchesFilter && matchesQuery
    }

    Card(contentPadding = 0.dp, contentSpacing = 0.dp) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = "Your workflows",
                        color = colors.ink,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Pill(text = "${visible.size}", tone = PillTone.Neutral, fontSize = 10.sp)
                }
                BoxWithConstraints {
                    if (maxWidth >= 430.dp) {
                        Segmented(
                            options = WorkflowFilter.entries.map { it to it.label },
                            selected = filter,
                            onSelect = onFilterChange,
                        )
                    }
                }
                Button(text = "New", onClick = onCreate, small = true, variant = ButtonVariant.Accent)
            }
            TopRule()
            if (visible.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(text = "Nothing matches", color = colors.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        text = "Try another search or filter.",
                        color = colors.mute,
                        fontSize = 12.sp,
                    )
                }
            } else {
                visible.forEachIndexed { index, workflow ->
                    if (index > 0) TopRule()
                    WorkflowRow(
                        workflow = workflow,
                        onToggle = { enabled -> onToggle(workflow.id, enabled) },
                        onRun = { onRun(workflow) },
                    )
                }
            }
        }
    }
}

@Composable
private fun WorkflowRow(
    workflow: Workflow,
    onToggle: (Boolean) -> Unit,
    onRun: () -> Unit,
) {
    val colors = LocalAppColors.current
    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
        // Phones drop the secondary columns
        val compact = maxWidth < 560.dp
        ListRow(
            modifier = Modifier.padding(horizontal = 4.dp),
            leading = {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    workflow.services.take(if (compact) 2 else 3).forEach { service ->
                        ServiceIcon(icon = service.icon, tint = service.tint, size = 20.dp)
                    }
                }
            },
            content = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = workflow.name,
                        modifier = Modifier.weight(1f, fill = false),
                        color = colors.ink,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (workflow.status != WorkflowStatus.Active) {
                        Pill(
                            text = workflow.status.label,
                            tone = workflow.status.tone,
                            icon = workflow.status.icon,
                        )
                    }
                }
                Text(
                    text = buildString {
                        append(workflow.trigger)
                        append(if (workflow.steps == 1) " · 1 step" else " · ${workflow.steps} steps")
                        if (compact) {
                            append(" · ${workflow.lastRun ?: "Never run"}")
                            if (workflow.lastRun != null && !workflow.lastRunOk) append(" · failed")
                        } else {
                            append(" · ${workflow.services.size} services")
                        }
                    },
                    color = colors.mute,
                    fontSize = 11.5.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            },
            trailing = {
                if (!compact) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = workflow.lastRun ?: "Never run",
                            color = if (workflow.lastRun == null) colors.faint else colors.ink,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            text = when {
                                workflow.lastRun == null -> "Draft"
                                workflow.lastRunOk -> "Succeeded"
                                else -> "Failed"
                            },
                            color = if (workflow.lastRun != null && !workflow.lastRunOk) colors.bad else colors.mute,
                            fontSize = 10.sp,
                        )
                    }
                    IconButton(
                        icon = AppIcon.Play,
                        label = "Run ${workflow.name}",
                        onClick = onRun,
                    )
                }
                Switch(checked = workflow.enabled, onCheckedChange = onToggle)
            },
        )
    }
}

@Composable
private fun TemplatesSection(onUse: (Template) -> Unit) {
    val colors = LocalAppColors.current
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "Start from a template",
                color = colors.ink,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(text = "Copy one and adjust the steps", color = colors.mute, fontSize = 12.sp)
        }
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            if (maxWidth >= 720.dp) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    DemoTemplates.forEach { template ->
                        TemplateCard(template = template, onUse = onUse, modifier = Modifier.weight(1f))
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    DemoTemplates.forEach { template ->
                        TemplateCard(
                            template = template,
                            onUse = onUse,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TemplateCard(
    template: Template,
    onUse: (Template) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Card(modifier = modifier, contentPadding = 14.dp, contentSpacing = 8.dp) {
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            template.services.forEach { service ->
                ServiceIcon(icon = service.icon, tint = service.tint, size = 22.dp)
            }
        }
        Text(
            text = template.name,
            color = colors.ink,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = template.body,
            color = colors.mute,
            fontSize = 11.5.sp,
            lineHeight = 16.sp,
        )
        Button(
            text = "Use template",
            onClick = { onUse(template) },
            variant = ButtonVariant.Quiet,
            small = true,
        )
    }
}

@Composable
private fun RunsPage(runs: List<Run>) {
    var onlyFailed by remember { mutableStateOf(false) }
    val visible = if (onlyFailed) runs.filter { !it.ok } else runs
    Page {
        RunsSummary()
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                text = "Recent runs",
                color = LocalAppColors.current.ink,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
            )
            Segmented(
                options = listOf(false to "All", true to "Failed"),
                selected = onlyFailed,
                onSelect = { onlyFailed = it },
            )
        }
        Card(contentPadding = 8.dp, contentSpacing = 0.dp) {
            visible.forEachIndexed { index, run ->
                if (index > 0) TopRule()
                ListRow(
                    leading = { ServiceIcon(icon = run.service.icon, tint = run.service.tint, size = 26.dp) },
                    content = {
                        Text(
                            text = run.workflow,
                            color = LocalAppColors.current.ink,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            text = "${run.whenLabel} · ${run.duration}",
                            color = LocalAppColors.current.mute,
                            fontSize = 11.5.sp,
                        )
                    },
                    trailing = {
                        Pill(
                            text = if (run.ok) "Succeeded" else "Failed",
                            tone = if (run.ok) PillTone.Ok else PillTone.Bad,
                            icon = if (run.ok) AppIcon.Check else AppIcon.X,
                        )
                    },
                )
            }
        }
    }
}

@Composable
private fun RunsSummary() {
    val colors = LocalAppColors.current
    Card(contentPadding = 18.dp, contentSpacing = 0.dp) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val stats = listOf(
                Triple("128", "runs this week", colors.ink),
                Triple("96.9%", "success rate", colors.ink),
                Triple("4", "failed", colors.bad),
                Triple("2.1 s", "average run", colors.ink),
            )
            if (maxWidth >= 520.dp) {
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    stats.forEach { (value, label, tint) ->
                        SummaryStat(value = value, label = label, tint = tint, modifier = Modifier.weight(1f))
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    stats.chunked(2).forEach { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(24.dp),
                        ) {
                            row.forEach { (value, label, tint) ->
                                SummaryStat(
                                    value = value,
                                    label = label,
                                    tint = tint,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (row.size == 1) Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryStat(
    value: String,
    label: String,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(1.dp)) {
        Text(
            text = value,
            color = tint,
            fontSize = 22.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = (-0.3).sp,
        )
        Text(text = label, color = colors.mute, fontSize = 11.5.sp, maxLines = 1)
    }
}

@Composable
private fun ServicesPage() {
    val colors = LocalAppColors.current
    val connected = DemoServices.count { it.connected }
    Page {
        Card(contentPadding = 8.dp, contentSpacing = 0.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Your connections",
                    color = colors.ink,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "$connected of ${DemoServices.size} connected",
                    color = colors.mute,
                    fontSize = 11.5.sp,
                )
            }
            TopRule()
            DemoServices.forEachIndexed { index, connection ->
                if (index > 0) TopRule()
                ListRow(
                    leading = {
                        ServiceIcon(
                            icon = connection.service.icon,
                            tint = connection.service.tint,
                            size = 28.dp,
                        )
                    },
                    content = {
                        Text(
                            text = connection.service.label,
                            color = colors.ink,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            text = connection.account,
                            color = colors.mute,
                            fontSize = 11.5.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    trailing = {
                        Pill(
                            text = if (connection.connected) "Connected" else "Expired",
                            tone = if (connection.connected) PillTone.Ok else PillTone.Warn,
                        )
                        Button(
                            text = if (connection.connected) "Manage" else "Reconnect",
                            onClick = {},
                            variant = if (connection.connected) ButtonVariant.Quiet else ButtonVariant.Default,
                            small = true,
                        )
                    },
                )
            }
        }
        Banner(
            tone = BannerTone.Accent,
            title = "Connect another service",
            body = "Gmail, Drive, Slack, Notion, Calendar and GitHub are linked for the prototype. More services arrive in the future.",
            actions = {
                Button(text = "Browse services", onClick = {}, small = true)
            },
        )
    }
}

// ---------------------------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------------------------

@Composable
private fun TemplatesPage(onUse: (Template) -> Unit) {
    val colors = LocalAppColors.current
    Page(contentMaxWidth = 900.dp) {
        Text(
            text = "Ready-made workflows",
            color = colors.ink,
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = "Copy a template, then change the trigger and the steps. Nothing runs until it is enabled.",
            color = colors.mute,
            fontSize = 13.sp,
            lineHeight = 19.sp,
        )
        DemoTemplates.forEach { template ->
            Card(contentPadding = 16.dp, contentSpacing = 10.dp) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        template.services.forEach { service ->
                            ServiceIcon(icon = service.icon, tint = service.tint, size = 24.dp)
                        }
                    }
                    Text(
                        text = template.name,
                        color = colors.ink,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Button(text = "Use template", onClick = { onUse(template) }, small = true)
                }
                Text(
                    text = template.body,
                    color = colors.mute,
                    fontSize = 12.5.sp,
                    lineHeight = 18.sp,
                )
            }
        }
    }
}

@Composable
private fun SettingsPage(
    name: String,
    email: String,
    darkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onSignOut: () -> Unit,
) {
    val colors = LocalAppColors.current
    Page(contentMaxWidth = 720.dp) {
        Card(contentPadding = 16.dp, contentSpacing = 14.dp) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Avatar(initials = name, size = 48.dp)
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = name,
                        color = colors.ink,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(text = email, color = colors.mute, fontSize = 12.5.sp)
                    Pill(text = "Prototype account", tone = PillTone.Accent, fontSize = 10.sp)
                }
            }
            TopRule()
            ListRow(
                content = {
                    Text(
                        text = "Dark mode",
                        color = colors.ink,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        text = "Follows your system setting until you toggle it here.",
                        color = colors.mute,
                        fontSize = 11.5.sp,
                    )
                },
                trailing = { Switch(checked = darkTheme, onCheckedChange = { onToggleTheme() }) },
            )
            ListRow(
                content = {
                    Text(
                        text = "Sessions",
                        color = colors.ink,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        text = "Signed in on this device. Sessions expire after 30 days.",
                        color = colors.mute,
                        fontSize = 11.5.sp,
                    )
                },
                trailing = { Icon(AppIcon.Shield, size = 16.dp, tint = colors.mute) },
            )
        }

        Card(contentPadding = 16.dp, contentSpacing = 10.dp) {
            SectionHeader(title = "Sign out", caption = "You can sign back in with any email in the prototype.")
            Button(
                text = "Sign out",
                onClick = onSignOut,
                variant = ButtonVariant.Danger,
                modifier = Modifier.widthIn(max = 180.dp),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(AppIcon.Info, size = 14.dp, tint = colors.faint)
            Text(
                text = "Mock data",
                color = colors.faint,
                fontSize = 11.sp,
            )
        }
    }
}
