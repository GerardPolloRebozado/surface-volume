package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.AppIcon
import org.surfacevolume.surface.components.BarChart
import org.surfacevolume.surface.components.Banner
import org.surfacevolume.surface.components.BannerTone
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.ButtonVariant
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.Icon
import org.surfacevolume.surface.components.IconButton
import org.surfacevolume.surface.components.ListRow
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

internal enum class WorkflowFilter(val label: String) {
    All("All"),
    On("On"),
    Off("Off"),
    Attention("Attention"),
}

@Composable
internal fun WorkflowsPage(
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
            modifier = Modifier.semantics { heading() },
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
            BarChart(
                values = DemoPerDay,
                modifier = Modifier.weight(1f),
                height = null,
                contentDescription = "Success rate per day, last 14 days",
            )
        } else {
            BarChart(
                values = DemoPerDay,
                height = 88.dp,
                contentDescription = "Success rate per day, last 14 days",
            )
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
                Switch(
                    checked = workflow.enabled,
                    onCheckedChange = onToggle,
                    label = if (workflow.enabled) {
                        "Disable ${workflow.name}"
                    } else {
                        "Enable ${workflow.name}"
                    },
                )
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
