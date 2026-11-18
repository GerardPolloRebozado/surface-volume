package org.surfacevolume.surface.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

enum class BannerTone { Neutral, Accent, Ok, Warn, Bad }

/**
 * Inline notice with an optional action row. Used for "this service needs reconnecting" style
 * messages at the top of a page, for example
 */
@Composable
fun Banner(
    title: String,
    modifier: Modifier = Modifier,
    body: String? = null,
    tone: BannerTone = BannerTone.Neutral,
    icon: AppIcon? = null,
    actions: (@Composable RowScope.() -> Unit)? = null,
) {
    val colors = LocalAppColors.current
    val background: Color
    val foreground: Color
    when (tone) {
        BannerTone.Neutral -> {
            background = colors.fill
            foreground = colors.mute
        }
        BannerTone.Accent -> {
            background = colors.accentSoft
            foreground = colors.accent
        }
        BannerTone.Ok -> {
            background = colors.okSoft
            foreground = colors.ok
        }
        BannerTone.Warn -> {
            background = colors.warnSoft
            foreground = colors.warn
        }
        BannerTone.Bad -> {
            background = colors.badSoft
            foreground = colors.bad
        }
    }
    val resolvedIcon = icon ?: when (tone) {
        BannerTone.Ok -> AppIcon.Check
        BannerTone.Warn, BannerTone.Bad -> AppIcon.Alert
        else -> AppIcon.Info
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(background)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(
                icon = resolvedIcon,
                size = 17.dp,
                tint = foreground,
                modifier = Modifier.padding(top = 1.dp),
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = title,
                    color = colors.ink,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                if (body != null) {
                    Text(
                        text = body,
                        color = colors.mute,
                        fontSize = 12.5.sp,
                        lineHeight = 18.sp,
                    )
                }
            }
        }
        if (actions != null) {
            Row(
                modifier = Modifier.padding(start = 27.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                content = actions,
            )
        }
    }
}
