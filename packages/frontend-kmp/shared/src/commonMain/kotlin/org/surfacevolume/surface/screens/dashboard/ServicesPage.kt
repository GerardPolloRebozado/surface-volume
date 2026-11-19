package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.Banner
import org.surfacevolume.surface.components.BannerTone
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.ButtonVariant
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.ListRow
import org.surfacevolume.surface.components.Page
import org.surfacevolume.surface.components.Pill
import org.surfacevolume.surface.components.PillTone
import org.surfacevolume.surface.components.ServiceIcon
import org.surfacevolume.surface.components.TopRule

@Composable
internal fun ServicesPage() {
    val colors = LocalAppColors.current
    val connected = DemoServices.count { it.connected }
    Page {
        Card(contentPadding = 8.dp, contentSpacing = 0.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Your connections",
                    color = colors.ink,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "$connected of ${DemoServices.size} connected",
                    color = colors.mute,
                    fontSize = 11.5.sp,
                )
            }
            TopRule()
            DemoServices.forEachIndexed { index, connection ->
                if (index > 0) TopRule()
                ListRow(
                    leading = {
                        ServiceIcon(
                            icon = connection.service.icon,
                            tint = connection.service.tint,
                            size = 28.dp,
                        )
                    },
                    content = {
                        Text(
                            text = connection.service.label,
                            color = colors.ink,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            text = connection.account,
                            color = colors.mute,
                            fontSize = 11.5.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    trailing = {
                        Pill(
                            text = if (connection.connected) "Connected" else "Expired",
                            tone = if (connection.connected) PillTone.Ok else PillTone.Warn,
                        )
                        Button(
                            text = if (connection.connected) "Manage" else "Reconnect",
                            onClick = {},
                            variant = if (connection.connected) ButtonVariant.Quiet else ButtonVariant.Default,
                            small = true,
                        )
                    },
                )
            }
        }
        Banner(
            tone = BannerTone.Accent,
            title = "Connect another service",
            body = "Gmail, Drive, Slack, Notion, Calendar and GitHub are linked for the prototype. More services arrive in the future.",
            actions = {
                Button(text = "Browse services", onClick = {}, small = true)
            },
        )
    }
}
