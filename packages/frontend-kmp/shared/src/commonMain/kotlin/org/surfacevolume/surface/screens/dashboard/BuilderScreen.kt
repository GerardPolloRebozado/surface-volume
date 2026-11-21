package org.surfacevolume.surface.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.AppIcon
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.ButtonVariant
import org.surfacevolume.surface.components.Icon
import org.surfacevolume.surface.components.ServiceIcon
import org.surfacevolume.surface.components.TextField

private enum class NodeKind(val label: String) { Trigger("Trigger"), Action("Action"), Condition("If"), Loop("Loop") }

private data class BuilderNode(
    val id: String,
    val kind: NodeKind,
    var x: Float,
    var y: Float,
    val svc: Service = Service.Gmail,
    val label: String = "",
) {
    val outputX: Float get() = x + 220f
    val outputY: Float get() = y + 38f
    val inputX: Float get() = x
    val inputY: Float get() = y + 38f
}

private data class BuilderEdge(val from: String, val fromPath: String? = null, val to: String)

data class BuilderResult(
    val name: String,
    val services: List<Service>,
    val trigger: String,
    val steps: Int,
)

@Composable
internal fun BuilderScreen(
    onBack: () -> Unit,
    onSave: (BuilderResult) -> Unit,
) {
    val colors = LocalAppColors.current
    var name by remember { mutableStateOf("New workflow") }
    var nextId by remember { mutableStateOf(1) }
    val nodes = remember {
        mutableStateListOf(
            BuilderNode(id = "trigger", kind = NodeKind.Trigger, x = 40f, y = 120f, svc = Service.Gmail),
        )
    }
    val edges = remember { mutableStateListOf<BuilderEdge>() }
    var linkingFrom by remember { mutableStateOf<Pair<String, String?>?>(null) }
    var running by remember { mutableStateOf(false) }
    var runMessage by remember { mutableStateOf<String?>(null) }
    val runScope = rememberCoroutineScope()

    fun runTest() {
        if (running) return
        running = true
        runMessage = if (edges.isEmpty()) "No steps connected yet" else "Starting test run…"
        runScope.launch {
            delay(700)
            if (edges.isNotEmpty()) runMessage = "Test run succeeded"
            running = false
        }
    }

    fun addNode(kind: NodeKind) {
        val last = nodes.lastOrNull()
        nodes.add(
            BuilderNode(
                id = "n${nextId++}",
                kind = kind,
                x = (last?.x ?: 40f) + 250f,
                y = last?.y ?: 120f,
                svc = Service.Gmail,
                label = when (kind) {
                    NodeKind.Action -> "Send a message"
                    NodeKind.Condition -> "over 500"
                    NodeKind.Loop -> "each item"
                    NodeKind.Trigger -> ""
                },
            ),
        )
        if (last != null) edges.add(BuilderEdge(from = last.id, to = "n${nextId - 1}"))
    }

    fun moveNode(id: String, dx: Float, dy: Float) {
        val index = nodes.indexOfFirst { it.id == id }
        if (index >= 0) {
            val current = nodes[index]
            nodes[index] = current.copy(x = current.x + dx, y = current.y + dy)
        }
    }

    fun onPortTap(node: BuilderNode, isOutput: Boolean, path: String? = null) {
        if (isOutput) {
            linkingFrom = node.id to path
        } else if (linkingFrom != null && linkingFrom!!.first != node.id) {
            edges.add(BuilderEdge(from = linkingFrom!!.first, fromPath = linkingFrom!!.second, to = node.id))
            linkingFrom = null
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(colors.win)) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Button(text = "Back", variant = ButtonVariant.Quiet, onClick = onBack, small = true)
            TextField(value = name, onValueChange = { name = it }, label = "Workflow name", modifier = Modifier.weight(1f))
            Button(
                text = if (running) "Running…" else "Play",
                variant = ButtonVariant.Accent,
                small = true,
                enabled = !running,
                onClick = { runTest() },
            )
            Button(
                text = "Save",
                variant = ButtonVariant.Accent,
                small = true,
                onClick = {
                    val actions = nodes.filter { it.kind == NodeKind.Action }
                    onSave(
                        BuilderResult(
                            name = name.ifBlank { "Untitled workflow" },
                            services = nodes.map { it.svc }.distinct(),
                            trigger = "Mail from ${Service.Gmail.label}",
                            steps = actions.size + nodes.count { it.kind == NodeKind.Condition || it.kind == NodeKind.Loop },
                        ),
                    )
                },
            )
        }

        runMessage?.let { msg ->
            Text(text = msg, color = colors.mute, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 12.dp))
        }

        Row(modifier = Modifier.padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Button(text = "+ Action", variant = ButtonVariant.Quiet, small = true, onClick = { addNode(NodeKind.Action) })
            Button(text = "+ If", variant = ButtonVariant.Quiet, small = true, onClick = { addNode(NodeKind.Condition) })
            Button(text = "+ Loop", variant = ButtonVariant.Quiet, small = true, onClick = { addNode(NodeKind.Loop) })
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
        ) {
            val density = LocalDensity.current.density
            fun outPoint(node: BuilderNode, path: String?): Offset = when (path) {
                "yes" -> Offset(node.x + 60f * density, node.y + 70f * density)
                "no" -> Offset(node.x + 160f * density, node.y + 70f * density)
                else -> Offset(node.x + 220f * density, node.y + 38f * density)
            }
            fun inPoint(node: BuilderNode): Offset = Offset(node.x, node.y + 38f * density)

            androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
                edges.forEach { e ->
                    val from = nodes.firstOrNull { it.id == e.from } ?: return@forEach
                    val to = nodes.firstOrNull { it.id == e.to } ?: return@forEach
                    val a = outPoint(from, e.fromPath)
                    val b = inPoint(to)
                    val midX = (a.x + b.x) / 2f
                    val r = 12f.coerceAtMost((b.x - a.x).coerceAtLeast(0f) / 2f)
                    val dir = if (b.y >= a.y) 1f else -1f
                    val path = Path().apply {
                        moveTo(a.x, a.y)
                        lineTo(midX - r, a.y)
                        if (r > 0f) quadraticBezierTo(midX, a.y, midX, a.y + dir * r)
                        lineTo(midX, b.y - dir * r)
                        if (r > 0f) quadraticBezierTo(midX, b.y, midX + r, b.y)
                        lineTo(b.x, b.y)
                    }
                    drawPath(path, color = colors.lineStrong.copy(alpha = 0.35f), style = Stroke(width = 8f))
                    drawPath(path, color = if (e.fromPath == "yes") colors.ok else if (e.fromPath == "no") colors.bad else colors.lineStrong, style = Stroke(width = 2.5f))
                }
            }

            edges.forEach { e ->
                val from = nodes.firstOrNull { it.id == e.from } ?: return@forEach
                val to = nodes.firstOrNull { it.id == e.to } ?: return@forEach
                val a = outPoint(from, e.fromPath)
                val b = inPoint(to)
                val mid = Offset((a.x + b.x) / 2f, (a.y + b.y) / 2f)
                Box(
                    modifier = Modifier
                        .offset { IntOffset(mid.x.toInt() - 10, mid.y.toInt() - 10) }
                        .size(20.dp)
                        .clip(CircleShape)
                        .background(colors.card)
                        .border(1.dp, colors.line, CircleShape)
                        .clickable { edges.remove(e) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon = AppIcon.X, size = 10.dp, tint = colors.mute)
                }
            }

            nodes.forEach { node ->
                NodeCard(
                    node = node,
                    modifier = Modifier.offset { IntOffset(node.x.toInt(), node.y.toInt()) },
                    selected = linkingFrom?.first == node.id,
                    onMove = { dx, dy -> moveNode(node.id, dx, dy) },
                    onOutput = { path -> onPortTap(node, true, path) },
                    onInput = { onPortTap(node, false) },
                )
            }
        }
    }
}

@Composable
private fun NodeCard(
    node: BuilderNode,
    modifier: Modifier,
    selected: Boolean,
    onMove: (Float, Float) -> Unit,
    onOutput: (String?) -> Unit,
    onInput: () -> Unit,
) {
    val colors = LocalAppColors.current
    val accent = when (node.kind) {
        NodeKind.Trigger -> colors.accent
        NodeKind.Condition -> colors.warn
        NodeKind.Loop -> colors.ok
        NodeKind.Action -> colors.mute
    }
    Box(
        modifier = modifier
            .size(width = 220.dp, height = 76.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(colors.card)
            .border(1.5.dp, if (selected) colors.accent else colors.line, RoundedCornerShape(12.dp))
            .pointerInput(node.id) {
                detectDragGestures { _, drag -> onMove(drag.x, drag.y) }
            }
            .padding(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (node.kind != NodeKind.Trigger) {
                Box(
                    modifier = Modifier
                        .offset(x = (-20).dp, y = 18.dp)
                        .size(20.dp)
                        .clip(CircleShape)
                        .background(colors.line)
                        .clickable { onInput() },
                )
            }
            ServiceIcon(icon = node.svc.icon, tint = accent, size = 22.dp)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = node.kind.label,
                    color = accent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = node.label.ifBlank { node.svc.label },
                    color = colors.ink,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                )
            }
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(accent)
                    .clickable { onOutput(null) },
            )

        }
        if (node.kind == NodeKind.Condition) {
            Box(
                modifier = Modifier
                    .offset(x = 50.dp, y = 60.dp)
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(colors.ok)
                    .clickable { onOutput("yes") },
            )
            Box(
                modifier = Modifier
                    .offset(x = 150.dp, y = 60.dp)
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(colors.bad)
                    .clickable { onOutput("no") },
            )
        }
    }
}
