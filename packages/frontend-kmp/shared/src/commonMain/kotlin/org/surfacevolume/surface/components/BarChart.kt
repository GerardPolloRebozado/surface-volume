package org.surfacevolume.surface.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import org.surfacevolume.surface.LocalAppColors

/**
 * Minimal bar chart. The last bar is highlighted, which reads as "today" if a per-day series
 * Scaling is relative to the biggest value, so callers only pass raw values
 */
@Composable
fun BarChart(
    values: List<Int>,
    modifier: Modifier = Modifier,
    height: Dp? = 88.dp,
) {
    if (values.isEmpty()) return
    val colors = LocalAppColors.current
    val accent = colors.accent
    val rest = colors.accent.copy(alpha = 0.26f)

    val sized = if (height == null) modifier.fillMaxWidth() else modifier.fillMaxWidth().height(height)
    Canvas(modifier = sized) {
        val max = values.max().coerceAtLeast(1).toFloat()
        val slot = size.width / values.size
        val barWidth = slot * 0.52f
        val radius = CornerRadius(barWidth / 2f, barWidth / 2f)
        values.forEachIndexed { index, value ->
            val barHeight = (value / max) * (size.height - 2.dp.toPx())
            val left = index * slot + (slot - barWidth) / 2f
            drawRoundRect(
                color = if (index == values.lastIndex) accent else rest,
                topLeft = Offset(left, size.height - barHeight),
                size = Size(barWidth, barHeight),
                cornerRadius = radius,
            )
        }
    }
}
