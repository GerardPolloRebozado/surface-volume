package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.AppIcon
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.ListRow
import org.surfacevolume.surface.components.Page
import org.surfacevolume.surface.components.Pill
import org.surfacevolume.surface.components.PillTone
import org.surfacevolume.surface.components.Segmented
import org.surfacevolume.surface.components.ServiceIcon
import org.surfacevolume.surface.components.TopRule

@Composable
internal fun RunsPage(runs: List<Run>) {
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
            if (visible.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = "No failed runs",
                        color = LocalAppColors.current.ink,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Every run in the last seven days succeeded.",
                        color = LocalAppColors.current.mute,
                        fontSize = 12.sp,
                    )
                }
            } else {
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
