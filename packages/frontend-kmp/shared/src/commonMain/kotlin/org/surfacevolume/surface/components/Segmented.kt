package org.surfacevolume.surface.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

/** Small segmented control, used for list filters. Behaves like a radio group for screen readers. */
@Composable
fun <T> Segmented(
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(9.dp))
            .background(colors.fill)
            .padding(2.dp)
            .selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        options.forEach { (value, label) ->
            SegmentOption(
                label = label,
                active = value == selected,
                onClick = { onSelect(value) },
            )
        }
    }
}

@Composable
private fun SegmentOption(
    label: String,
    active: Boolean,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    var focused by remember { mutableStateOf(false) }
    Box(
        modifier = Modifier
            .onFocusChanged { focused = it.isFocused }
            .focusRing(focused, colors.accentSoft, 7.dp)
            .clip(RoundedCornerShape(7.dp))
            .background(if (active) colors.card else Color.Transparent)
            .selectable(
                selected = active,
                role = Role.RadioButton,
                onClick = onClick,
            )
            .padding(horizontal = 8.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            color = if (active) colors.ink else colors.mute,
            fontSize = 11.5.sp,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
        )
    }
}
