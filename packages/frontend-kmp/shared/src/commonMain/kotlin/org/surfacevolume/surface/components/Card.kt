package org.surfacevolume.surface.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import org.surfacevolume.surface.LocalAppColors

@Composable
fun Card(
    modifier: Modifier = Modifier,
    contentPadding: Dp = 16.dp,
    contentSpacing: Dp = 8.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    val shape = RoundedCornerShape(13.dp)
    Column(
        modifier = modifier
            .shadow(
                elevation = 4.dp,
                shape = shape,
                clip = false,
                ambientColor = Color(0x0F14121A),
                spotColor = Color(0x0A14121A),
            )
            .background(colors.card, shape)
            .border(1.dp, colors.line, shape)
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(contentSpacing),
        content = content,
    )
}
