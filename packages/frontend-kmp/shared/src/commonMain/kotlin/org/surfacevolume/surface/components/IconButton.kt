package org.surfacevolume.surface.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import org.surfacevolume.surface.LocalAppColors

/** Square, label-free button used for icons in toolbars and rows */
@Composable
fun IconButton(
    icon: AppIcon,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 30.dp,
    iconSize: Dp = 16.dp,
    enabled: Boolean = true,
    selected: Boolean = false,
) {
    val colors = LocalAppColors.current
    val interaction = remember { MutableInteractionSource() }
    val hovered by interaction.collectIsHoveredAsState()
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(8.dp)
    Box(
        modifier = modifier
            .alpha(if (enabled) 1f else 0.45f)
            .onFocusChanged { focused = it.isFocused }
            .focusRing(focused, colors.accentSoft, 8.dp)
            .size(size)
            .clip(shape)
            .background(
                when {
                    selected -> colors.fill
                    hovered -> colors.fill
                    else -> androidx.compose.ui.graphics.Color.Transparent
                },
            )
            .hoverable(interaction, enabled = enabled)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon = icon, size = iconSize, tint = if (selected) colors.ink else colors.mute)
    }
}
