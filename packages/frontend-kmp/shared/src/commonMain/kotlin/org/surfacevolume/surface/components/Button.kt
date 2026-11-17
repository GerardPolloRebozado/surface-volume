package org.surfacevolume.surface.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

enum class ButtonVariant { Default, Accent, Quiet, Ghost, Danger }

@Composable
fun Button(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Default,
    small: Boolean = false,
    enabled: Boolean = true,
    pill: Boolean = false,
    fontSize: TextUnit = if (small) 13.sp else 14.sp,
    fontWeight: FontWeight = FontWeight.SemiBold,
) {
    val colors = LocalAppColors.current
    val shape = RoundedCornerShape(if (pill) 99.dp else if (small) 8.dp else 9.dp)
    val interaction = remember { MutableInteractionSource() }
    val hovered by interaction.collectIsHoveredAsState()

    val background = when (variant) {
        ButtonVariant.Default -> if (hovered) colors.fillHover else colors.fill
        ButtonVariant.Accent -> if (hovered) lerp(colors.accent, Color.White, 0.06f) else colors.accent
        ButtonVariant.Quiet,
        ButtonVariant.Ghost -> if (hovered) colors.fill else Color.Transparent
        ButtonVariant.Danger -> colors.badSoft
    }
    val foreground = when (variant) {
        ButtonVariant.Accent -> colors.onAccent
        ButtonVariant.Danger -> colors.bad
        else -> colors.ink
    }
    val border = if (variant == ButtonVariant.Quiet) colors.line else null

    Box(
        modifier = modifier
            .alpha(if (enabled) 1f else 0.45f)
            .clip(shape)
            .background(background)
            .then(if (border != null) Modifier.border(1.dp, border, shape) else Modifier)
            .hoverable(interaction, enabled = enabled)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .defaultMinSize(minHeight = if (small) 30.dp else 36.dp)
            .padding(horizontal = if (small) 10.dp else 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = foreground,
            fontSize = fontSize,
            fontWeight = fontWeight,
        )
    }
}
