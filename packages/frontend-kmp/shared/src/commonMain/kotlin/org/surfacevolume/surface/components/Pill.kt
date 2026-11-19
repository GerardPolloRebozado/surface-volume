package org.surfacevolume.surface.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

enum class PillTone { Neutral, Accent, Ok, Warn, Bad }

/** Compact status badge/pill: "Active", "Needs attention", "Draft"... */
@Composable
fun Pill(
    text: String,
    modifier: Modifier = Modifier,
    tone: PillTone = PillTone.Neutral,
    icon: AppIcon? = null,
    fontSize: TextUnit = 10.5.sp,
) {
    val colors = LocalAppColors.current
    val background: Color
    val foreground: Color
    when (tone) {
        PillTone.Neutral -> {
            background = colors.fill
            foreground = colors.mute
        }
        PillTone.Accent -> {
            background = colors.accentSoft
            foreground = colors.accent
        }
        PillTone.Ok -> {
            background = colors.okSoft
            foreground = colors.ok
        }
        PillTone.Warn -> {
            background = colors.warnSoft
            foreground = colors.warn
        }
        PillTone.Bad -> {
            background = colors.badSoft
            foreground = colors.bad
        }
    }
    Row(
        modifier = modifier
            .clip(CircleShape)
            .background(background)
            .padding(horizontal = 8.dp, vertical = 2.5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (icon != null) {
            Icon(icon, size = (fontSize.value + 0.5f).dp, tint = foreground, strokeWidth = 1.8.dp)
        }
        Text(
            text = text,
            color = foreground,
            fontSize = fontSize,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.1.sp,
            maxLines = 1,
            softWrap = false,
        )
    }
}
