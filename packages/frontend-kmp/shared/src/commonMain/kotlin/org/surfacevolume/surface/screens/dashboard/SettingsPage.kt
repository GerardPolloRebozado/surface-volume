package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.AppIcon
import org.surfacevolume.surface.components.Avatar
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.ButtonVariant
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.Icon
import org.surfacevolume.surface.components.ListRow
import org.surfacevolume.surface.components.Page
import org.surfacevolume.surface.components.Pill
import org.surfacevolume.surface.components.PillTone
import org.surfacevolume.surface.components.SectionHeader
import org.surfacevolume.surface.components.Switch
import org.surfacevolume.surface.components.TopRule

@Composable
internal fun SettingsPage(
    name: String,
    email: String,
    darkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onSignOut: () -> Unit,
) {
    val colors = LocalAppColors.current
    Page(contentMaxWidth = 720.dp) {
        Card(contentPadding = 16.dp, contentSpacing = 14.dp) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Avatar(initials = name, size = 48.dp)
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = name,
                        color = colors.ink,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(text = email, color = colors.mute, fontSize = 12.5.sp)
                    Pill(text = "Prototype account", tone = PillTone.Accent, fontSize = 10.sp)
                }
            }
            TopRule()
            ListRow(
                content = {
                    Text(
                        text = "Dark mode",
                        color = colors.ink,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        text = "Follows your system setting until you toggle it here.",
                        color = colors.mute,
                        fontSize = 11.5.sp,
                    )
                },
                trailing = {
                    Switch(
                        checked = darkTheme,
                        onCheckedChange = { onToggleTheme() },
                        label = "Dark mode",
                    )
                },
            )
            ListRow(
                content = {
                    Text(
                        text = "Sessions",
                        color = colors.ink,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        text = "Signed in on this device. Sessions expire after 30 days.",
                        color = colors.mute,
                        fontSize = 11.5.sp,
                    )
                },
                trailing = { Icon(AppIcon.Shield, size = 16.dp, tint = colors.mute) },
            )
        }

        Card(contentPadding = 16.dp, contentSpacing = 10.dp) {
            SectionHeader(title = "Sign out", caption = "You can sign back in with any email in the prototype.")
            Button(
                text = "Sign out",
                onClick = onSignOut,
                variant = ButtonVariant.Danger,
                modifier = Modifier.widthIn(max = 180.dp),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(AppIcon.Info, size = 14.dp, tint = colors.faint)
            Text(
                text = "Mock data",
                color = colors.faint,
                fontSize = 11.sp,
            )
        }
    }
}
