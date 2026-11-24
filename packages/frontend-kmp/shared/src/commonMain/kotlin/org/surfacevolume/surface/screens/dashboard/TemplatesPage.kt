package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.Page
import org.surfacevolume.surface.components.ServiceIcon

@Composable
internal fun TemplatesPage(onUse: (Template) -> Unit) {
    val colors = LocalAppColors.current
    Page(contentMaxWidth = 900.dp) {
        Text(
            text = "Ready-made workflows",
            color = colors.ink,
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = "Copy a template, then change the trigger and the steps. Nothing runs until it is enabled.",
            color = colors.mute,
            fontSize = 13.sp,
            lineHeight = 19.sp,
        )
        Text(
            text = "No templates available yet.",
            color = colors.mute,
            fontSize = 12.sp,
        )
        emptyList<Template>().forEach { template ->
            Card(contentPadding = 16.dp, contentSpacing = 10.dp) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        template.services.forEach { service ->
                            ServiceIcon(icon = service.icon, tint = service.tint, size = 24.dp)
                        }
                    }
                    Text(
                        text = template.name,
                        color = colors.ink,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Button(text = "Use template", onClick = { onUse(template) }, small = true)
                }
                Text(
                    text = template.body,
                    color = colors.mute,
                    fontSize = 12.5.sp,
                    lineHeight = 18.sp,
                )
            }
        }
    }
}
