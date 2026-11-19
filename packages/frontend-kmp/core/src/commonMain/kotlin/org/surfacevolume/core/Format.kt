package org.surfacevolume.core

import kotlin.time.Instant

fun relativeTime(iso: String, nowIso: String): String {
    val then = Instant.parse(iso)
    val now = Instant.parse(nowIso)
    val minutes = (now - then).inWholeMinutes.coerceAtLeast(0)
    if (minutes < 1) return "just now"
    if (minutes < 60) return "$minutes min ago"
    val hours = minutes / 60
    if (hours < 24) return "$hours h ago"
    val days = hours / 24
    return if (days == 1L) "yesterday" else "$days days ago"
}

fun runDurationMillis(run: WorkflowRun): Long? {
    val started = run.startedAt?.let(Instant::parse) ?: return null
    val finished = run.finishedAt?.let(Instant::parse) ?: return null
    return (finished - started).inWholeMilliseconds
}

fun formatDuration(millis: Long?): String {
    if (millis == null) return "—"
    if (millis < 1_000) return "$millis ms"
    val tenths = millis / 100
    return "${tenths / 10}.${tenths % 10} s"
}
