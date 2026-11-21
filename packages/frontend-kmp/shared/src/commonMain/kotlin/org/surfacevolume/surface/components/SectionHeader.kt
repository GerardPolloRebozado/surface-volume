package org.surfacevolume.surface.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

/** card header: a title, optional caption. */
@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    caption: String? = null,
    trailing: @Composable RowScope.() -> Unit = {},
) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(1.dp),
        ) {
            Text(
                text = title,
                color = colors.ink,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
            )
            if (caption != null) {
                Text(
                    text = caption,
                    color = colors.mute,
                    fontSize = 11.5.sp,
                )
            }
        }
        trailing()
    }
}
