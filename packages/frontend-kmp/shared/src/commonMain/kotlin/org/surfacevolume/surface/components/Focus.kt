package org.surfacevolume.surface.components

import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

fun Modifier.focusRing(
    focused: Boolean,
    color: Color,
    cornerRadius: Dp = 8.dp,
): Modifier = drawBehind {
    if (!focused) return@drawBehind
    val stroke = 3.dp.toPx()
    val inset = stroke * 1.5f
    drawRoundRect(
        color = color,
        topLeft = Offset(-inset, -inset),
        size = Size(size.width + inset * 2, size.height + inset * 2),
        cornerRadius = CornerRadius(cornerRadius.toPx() + inset),
        style = Stroke(width = stroke),
    )
}
