package org.surfacevolume.surface.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import org.surfacevolume.surface.LocalAppColors

/** On/off switch */
@Composable
fun Switch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current
    val fraction by animateFloatAsState(if (checked) 1f else 0f)
    Box(
        modifier = modifier
            .size(width = 36.dp, height = 20.dp)
            .clip(CircleShape)
            .background(lerp(colors.lineStrong, colors.accent, fraction))
            .clickable(enabled = enabled, role = Role.Switch, onClick = { onCheckedChange(!checked) }),
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .offset(x = (2f + 16f * fraction).dp)
                .size(16.dp)
                .clip(CircleShape)
                .background(Color.White),
        )
    }
}
