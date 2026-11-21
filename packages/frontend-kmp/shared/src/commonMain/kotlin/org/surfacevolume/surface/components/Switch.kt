package org.surfacevolume.surface.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.surfacevolume.surface.LocalAppColors

/** On/off switch */
@Composable
fun Switch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    label: String? = null,
) {
    val colors = LocalAppColors.current
    val fraction by animateFloatAsState(if (checked) 1f else 0f)
    var focused by remember { mutableStateOf(false) }
    Box(
        modifier = modifier
            .onFocusChanged { focused = it.isFocused }
            .focusRing(focused, colors.accentSoft, 10.dp)
            .size(width = 36.dp, height = 20.dp)
            .clip(CircleShape)
            .background(lerp(colors.lineStrong, colors.accent, fraction))
            .toggleable(
                value = checked,
                enabled = enabled,
                role = Role.Switch,
                onValueChange = onCheckedChange,
            )
            .then(if (label != null) Modifier.semantics { contentDescription = label } else Modifier),
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
