package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.core.AppCatalogueEntry
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
import org.surfacevolume.surface.components.TextField
import org.surfacevolume.surface.components.TopRule

@Composable
internal fun ServicesPage(
    apps: List<AppCatalogueEntry>,
    connections: List<ServiceConnection>,
    error: String?,
    onConnect: (String, Map<String, String>) -> Unit,
    onDisconnect: (String) -> Unit,
    onTest: (String) -> Unit,
) {
    val colors = LocalAppColors.current
    var open by remember { mutableStateOf<String?>(null) }
    val values = remember { mutableStateMapOf<String, String>() }
    val connected = connections.count { it.connected }

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
                    text = "$connected of ${connections.size} connected",
                    color = colors.mute,
                    fontSize = 11.5.sp,
                )
            }
            if (connections.isEmpty()) {
                TopRule()
                Text(
                    text = "No connections yet. Connect a service below.",
                    color = colors.mute,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 14.dp),
                )
            }
            connections.forEachIndexed { index, connection ->
                TopRule()
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
                            text = when {
                                connection.connected -> "Connected"
                                connection.needsAttention -> "Needs reconnecting"
                                else -> "Disconnected"
                            },
                            tone = when {
                                connection.connected -> PillTone.Ok
                                connection.needsAttention -> PillTone.Warn
                                else -> PillTone.Neutral
                            },
                        )
                    },
                )
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        text = "Test",
                        onClick = { onTest(connection.id) },
                        variant = ButtonVariant.Quiet,
                        small = true,
                    )
                    Button(
                        text = "Disconnect",
                        onClick = { onDisconnect(connection.id) },
                        variant = ButtonVariant.Ghost,
                        small = true,
                    )
                }
            }
        }

        error?.let { message ->
            Banner(tone = BannerTone.Warn, title = "Connection error", body = message)
        }

        Card(contentPadding = 8.dp, contentSpacing = 0.dp) {
            Text(
                text = "Available services",
                color = colors.ink,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            )
            apps.forEachIndexed { index, app ->
                TopRule()
                val fields = app.auth.fields
                ListRow(
                    leading = {
                        ServiceIcon(
                            icon = Service.from(app.id, app.name).icon,
                            tint = Service.from(app.id, app.name).tint,
                            size = 28.dp,
                        )
                    },
                    content = {
                        Text(text = app.name, color = colors.ink, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text(
                            text = "${app.triggers.size} triggers · ${app.actions.size} actions",
                            color = colors.mute,
                            fontSize = 11.5.sp,
                        )
                    },
                    trailing = {
                        if (fields.isEmpty()) {
                            Pill(text = "OAuth only")
                        } else {
                            Button(
                                text = if (open == app.id) "Close" else "Connect",
                                onClick = {
                                    open = if (open == app.id) null else app.id
                                    values.clear()
                                },
                                variant = ButtonVariant.Accent,
                                small = true,
                            )
                        }
                    },
                )
                if (open == app.id) {
                    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                        fields.forEach { field ->
                            TextField(
                                value = values[field.key] ?: "",
                                onValueChange = { values[field.key] = it },
                                label = field.label,
                                placeholder = if (field.key == "instanceUrl") "https://mastodon.social" else "",
                                visualTransformation = if (field.secret) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
                                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                            )
                        }
                        Button(
                            text = "Connect ${app.name}",
                            onClick = { onConnect(app.id, values.toMap()) },
                            variant = ButtonVariant.Accent,
                            small = true,
                        )
                    }
                }
            }
        }
    }
}
