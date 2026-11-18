package org.surfacevolume.surface.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import org.surfacevolume.surface.LocalAppColors

/**
 * SVGs icons (to avoid dependencies. Not sure if it is the correct approach)
 */
enum class AppIcon(vararg val paths: String) {
    Bolt("M13.4 3.2 5.8 13.4h5.3L10 20.8l8-11h-5.4z"),
    Activity("M3 12h4l2.5-7 4 14L16.5 12H21"),
    Layers("M12 3.6 20 8l-8 4.4L4 8zM4 12l8 4.4 8-4.4M4 16l8 4.4 8-4.4"),
    Grid("M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z"),
    Sliders("M4 7h9M17 7h3M4 17h5M13 17h7M13 4.5V9.5M9 14.5v5"),
    Search("M17 10.6a6.4 6.4 0 1 1-12.8 0 6.4 6.4 0 0 1 12.8 0zM15.3 15.3l4.5 4.5"),
    Plus("M12 5v14M5 12h14"),
    Minus("M5 12h14"),
    Check("m4.6 12.4 4.9 4.9L19.4 7.4"),
    X("M6 6l12 12M18 6 6 18"),
    Alert("M12 4.2 3 19.6h18zM12 9.2v5M12 17.1h.01"),
    Info("M20.6 12a8.6 8.6 0 1 1-17.2 0 8.6 8.6 0 0 1 17.2 0zM12 11v5M12 7.8h.01"),
    Clock("M20.6 12a8.6 8.6 0 1 1-17.2 0 8.6 8.6 0 0 1 17.2 0zM12 7.4V12l3.2 2"),
    Calendar("M5.8 5.8h12.4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2zM8 3.5v4M16 3.5v4M3.8 10.5h16.4M8 14h2M14 14h2"),
    Mail("M4.8 6h14.4a1.6 1.6 0 0 1 1.6 1.6v8.8a1.6 1.6 0 0 1-1.6 1.6H4.8a1.6 1.6 0 0 1-1.6-1.6V7.6A1.6 1.6 0 0 1 4.8 6zm-.8 1.2 8 5.8 8-5.8"),
    Folder("M3.4 8.2a2 2 0 0 1 2-2h3.5l2 2h7.7a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z"),
    Chat("M4.2 6.5a2 2 0 0 1 2-2h11.6a2 2 0 0 1 2 2v6.8a2 2 0 0 1-2 2H9.5L5 19v-3.7h-.8a2 2 0 0 1 0-4zM8 9.5h8"),
    Page("M6.2 3.6h7.6l4 4v12.8H6.2zM13.8 3.6v4h4M9 12h6M9 15.5h6"),
    Code("M9.2 7.4 4.5 12l4.7 4.6M14.8 7.4l4.7 4.6-4.7 4.6"),
    User("M15.7 8.2a3.7 3.7 0 1 1-7.4 0 3.7 3.7 0 0 1 7.4 0zM4.8 20c.7-3.6 3.7-5.6 7.2-5.6s6.5 2 7.2 5.6"),
    Logout("M10 4.5H5.8a1.8 1.8 0 0 0-1.8 1.8v11.4a1.8 1.8 0 0 0 1.8 1.8H10M15 8l4 4-4 4M19 12H9"),
    Sun("M16.2 12a4.2 4.2 0 1 1-8.4 0 4.2 4.2 0 0 1 8.4 0zM12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"),
    Moon("M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"),
    ChevronRight("m9.5 6.5 5.5 5.5-5.5 5.5"),
    ArrowRight("M4.5 12h15M13.5 6l6 6-6 6"),
    Refresh("M19.4 12a7.4 7.4 0 1 1-2.2-5.2M19.4 4.6v4.8h-4.8"),
    Shield("M12 3.5 4.8 6v6c0 4.4 3.1 7.4 7.2 8.5 4.1-1.1 7.2-4.1 7.2-8.5V6zm-3.2 8.5 2.2 2.2 4.2-4.4"),
    Bell("M18 9.5a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15.5 18 9.5zM10 20h4"),
    Filter("M4 6.5h16M6.5 12h11M9.5 17.5h5"),
    Play("M8.2 5.4v13.2l10-6.6z"),
}

@Composable
fun Icon(
    icon: AppIcon,
    modifier: Modifier = Modifier,
    size: Dp = 16.dp,
    tint: Color = LocalAppColors.current.mute,
    strokeWidth: Dp = 1.6.dp,
) {
    val paths = remember(icon) {
        icon.paths.map { PathParser().parsePathString(it).toPath() }
    }
    Canvas(modifier.size(size)) {
        val factor = this.size.minDimension / 24f
        val width = strokeWidth.toPx() / factor
        scale(factor, factor, pivot = Offset.Zero) {
            paths.forEach { path ->
                drawPath(
                    path = path,
                    color = tint,
                    style = Stroke(width = width, cap = StrokeCap.Round, join = StrokeJoin.Round),
                )
            }
        }
    }
}
