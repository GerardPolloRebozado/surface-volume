package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import org.surfacevolume.core.AppCatalogueEntry
import org.surfacevolume.core.ConnectionResource
import org.surfacevolume.surface.ActionPayload
import org.surfacevolume.surface.DefinitionPayload
import org.surfacevolume.surface.LinkPayload
import org.surfacevolume.surface.LocalApiConfig
import org.surfacevolume.surface.MobileApi
import org.surfacevolume.surface.TriggerPayload
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.ButtonVariant
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.ListRow
import org.surfacevolume.surface.components.Page
import org.surfacevolume.surface.components.TextField

private data class EditableNode(
    var appId: String = "",
    var actionKey: String = "",
    var credentialId: String = "",
    var status: String = "",
)

private fun <T> next(items: List<T>, current: T?): T? =
    if (items.isEmpty()) null else items[(items.indexOf(current) + 1) % items.size]

@Composable
internal fun BuilderScreen(
    workflowId: String?,
    apps: List<AppCatalogueEntry>,
    connections: List<ConnectionResource>,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    val colors = LocalAppColors.current
    val api = LocalApiConfig.current
    val scope = rememberCoroutineScope()
    val triggerApps = apps.filter { it.triggers.isNotEmpty() }
    var name by remember { mutableStateOf("Untitled workflow") }
    var triggerApp by remember { mutableStateOf(triggerApps.firstOrNull()?.id.orEmpty()) }
    var triggerKey by remember { mutableStateOf("") }
    var triggerConnection by remember { mutableStateOf("") }
    val nodes = remember { mutableStateListOf<EditableNode>() }
    var message by remember { mutableStateOf<String?>(null) }

    fun patch(index: Int, transform: (EditableNode) -> Unit) {
        val node = nodes[index]
        transform(node)
        nodes[index] = node.copy()
    }

    val triggerOptions = triggerApps.firstOrNull { it.id == triggerApp }?.triggers?.keys?.toList().orEmpty()
    val activeConnections = { appId: String -> connections.filter { it.appId == appId && it.status.name == "ACTIVE" } }

    fun definition(): DefinitionPayload {
        val inputs = mutableMapOf<String, kotlinx.serialization.json.JsonElement>()
        inputs["intervalSec"] = JsonPrimitive(60)
        if (triggerKey == "new_notification") {
            inputs["types"] = JsonArray(listOf(JsonPrimitive("mention"), JsonPrimitive("status")))
        }
        return DefinitionPayload(
            trigger = TriggerPayload(
                appId = triggerApp,
                triggerKey = triggerKey,
                credentialId = triggerConnection.ifBlank { null },
                inputs = inputs,
            ),
            nodes = nodes.mapIndexed { index, node ->
                ActionPayload(
                    id = "step-${index + 1}",
                    appId = node.appId,
                    actionKey = node.actionKey,
                    credentialId = node.credentialId.ifBlank { null },
                    inputs = mapOf("status" to node.status),
                )
            },
            links = nodes.mapIndexed { index, _ ->
                LinkPayload(
                    id = "link-${index + 1}",
                    from = if (index == 0) "trigger" else "step-$index",
                    to = "step-${index + 1}",
                )
            },
        )
    }

    fun save(onDone: () -> Unit) {
        if (workflowId == null) {
            message = "Workflow could not be identified"
            return
        }
        scope.launch {
            try {
                MobileApi.saveWorkflow(api, workflowId, name, definition())
                onDone()
            } catch (error: Exception) {
                message = error.message ?: "Could not save"
            }
        }
    }

    Page {
        Card(contentPadding = 16.dp) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(text = "Back", onClick = onBack, variant = ButtonVariant.Quiet, small = true)
                Text(text = "Builder", color = colors.ink, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            }
            TextField(value = name, onValueChange = { name = it }, label = "Workflow name", modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
            message?.let { Text(text = it, color = colors.mute, fontSize = 11.5.sp, modifier = Modifier.padding(top = 8.dp)) }
        }

        Card(contentPadding = 16.dp) {
            Text(text = "Trigger", color = colors.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            ListRow(
                content = { Text(text = "Service", color = colors.mute, fontSize = 12.sp) },
                trailing = {
                    Button(
                        text = triggerApps.firstOrNull { it.id == triggerApp }?.name ?: "Choose",
                        onClick = { triggerApp = next(triggerApps.map { it.id }, triggerApp).orEmpty(); triggerKey = ""; triggerConnection = "" },
                        variant = ButtonVariant.Quiet,
                        small = true,
                    )
                },
            )
            ListRow(
                content = { Text(text = "Trigger", color = colors.mute, fontSize = 12.sp) },
                trailing = {
                    Button(
                        text = triggerOptions.firstOrNull { it == triggerKey } ?: "Choose",
                        onClick = { triggerKey = next(triggerOptions, triggerKey).orEmpty() },
                        variant = ButtonVariant.Quiet,
                        small = true,
                    )
                },
            )
            ListRow(
                content = { Text(text = "Connection", color = colors.mute, fontSize = 12.sp) },
                trailing = {
                    Button(
                        text = activeConnections(triggerApp).firstOrNull { it.id == triggerConnection }?.account ?: "None",
                        onClick = { triggerConnection = next(activeConnections(triggerApp).map { it.id }, triggerConnection).orEmpty() },
                        variant = ButtonVariant.Quiet,
                        small = true,
                    )
                },
            )
        }

        nodes.forEachIndexed { index, node ->
            Card(contentPadding = 16.dp) {
                Text(text = "Step ${index + 1}", color = colors.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                val actionKeys = apps.firstOrNull { it.id == node.appId }?.actions?.keys?.toList().orEmpty()
                ListRow(
                    content = { Text(text = "Service", color = colors.mute, fontSize = 12.sp) },
                    trailing = {
                        Button(
                            text = apps.firstOrNull { it.id == node.appId }?.name ?: "Choose",
                            onClick = { patch(index) { it.appId = next(apps.map { item -> item.id }, it.appId).orEmpty(); it.actionKey = ""; it.credentialId = "" } },
                            variant = ButtonVariant.Quiet,
                            small = true,
                        )
                    },
                )
                ListRow(
                    content = { Text(text = "Action", color = colors.mute, fontSize = 12.sp) },
                    trailing = {
                        Button(
                            text = actionKeys.firstOrNull { it == node.actionKey } ?: "Choose",
                            onClick = { patch(index) { it.actionKey = next(actionKeys, it.actionKey).orEmpty() } },
                            variant = ButtonVariant.Quiet,
                            small = true,
                        )
                    },
                )
                ListRow(
                    content = { Text(text = "Connection", color = colors.mute, fontSize = 12.sp) },
                    trailing = {
                        Button(
                            text = activeConnections(node.appId).firstOrNull { it.id == node.credentialId }?.account ?: "None",
                            onClick = { patch(index) { it.credentialId = next(activeConnections(it.appId).map { item -> item.id }, it.credentialId).orEmpty() } },
                            variant = ButtonVariant.Quiet,
                            small = true,
                        )
                    },
                )
                TextField(
                    value = node.status,
                    onValueChange = { value -> patch(index) { it.status = value } },
                    label = "Status text",
                    placeholder = "Thanks {{ trigger.account }}",
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
                Button(
                    text = "Remove step",
                    onClick = { nodes.remove(node) },
                    variant = ButtonVariant.Ghost,
                    small = true,
                )
            }
        }

        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(text = "+ Step", onClick = { nodes.add(EditableNode()) }, variant = ButtonVariant.Quiet, small = true)
            Button(text = "Save", onClick = { save(onSaved) }, variant = ButtonVariant.Accent, small = true)
            Button(
                text = "Enable",
                onClick = {
                    save {
                        if (workflowId != null) {
                            scope.launch {
                                try {
                                    MobileApi.enableWorkflow(api, workflowId)
                                    onSaved()
                                } catch (error: Exception) {
                                    message = error.message
                                }
                            }
                        }
                    }
                },
                variant = ButtonVariant.Quiet,
                small = true,
            )
            Button(
                text = "Run now",
                onClick = {
                    scope.launch {
                        try {
                            if (workflowId != null) MobileApi.runWorkflow(api, workflowId)
                            onSaved()
                        } catch (error: Exception) {
                            message = error.message
                        }
                    }
                },
                variant = ButtonVariant.Quiet,
                small = true,
            )
        }
    }
}
