package org.surfacevolume.surface.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

/** Round initials avatar. Pass "AL" or a name and it will take the first two letters */
@Composable
fun Avatar(
    initials: String,
    modifier: Modifier = Modifier,
    size: Dp = 32.dp,
) {
    val colors = LocalAppColors.current
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(colors.accentSoft),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials.trim().uppercase().take(2),
            color = colors.accent,
            fontSize = (size.value * 0.36f).sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

/** Rounded square in a service's brand colour, with an icon */
@Composable
fun ServiceIcon(
    icon: AppIcon,
    tint: Color,
    modifier: Modifier = Modifier,
    size: Dp = 26.dp,
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(size * 0.3f))
            .background(tint.copy(alpha = 0.13f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon = icon,
            size = size * 0.55f,
            tint = tint,
            strokeWidth = 1.8.dp,
        )
    }
}
