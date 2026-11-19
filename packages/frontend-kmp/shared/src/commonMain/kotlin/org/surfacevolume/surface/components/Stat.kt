package org.surfacevolume.surface.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

/** Headline number with a unit, an optional delta and a caption. */
@Composable
fun Stat(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
    unit: String? = null,
    delta: String? = null,
    deltaTone: PillTone = PillTone.Ok,
) {
    val colors = LocalAppColors.current
    Column(modifier = modifier) {
        Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                text = value,
                color = colors.ink,
                fontSize = 38.sp,
                lineHeight = 40.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (-0.8).sp,
            )
            if (unit != null) {
                Text(
                    text = unit,
                    color = colors.mute,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 5.dp),
                )
            }
            if (delta != null) {
                Row(
                    modifier = Modifier.padding(start = 8.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Icon(
                        icon = AppIcon.ArrowRight,
                        size = 12.dp,
                        tint = when (deltaTone) {
                            PillTone.Ok -> colors.ok
                            PillTone.Bad -> colors.bad
                            else -> colors.mute
                        },
                        strokeWidth = 2.dp,
                    )
                    Text(
                        text = delta,
                        color = when (deltaTone) {
                            PillTone.Ok -> colors.ok
                            PillTone.Bad -> colors.bad
                            else -> colors.mute
                        },
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
        Text(
            text = label,
            color = colors.mute,
            fontSize = 11.5.sp,
        )
    }
}
