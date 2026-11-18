package org.surfacevolume.surface.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.surfacevolume.surface.LocalAppColors

/**
 * Two-column application frame: a fixed sidebar on wide windows, a single stacked column on phones.
 * The content never assumes which layout it got, so screens look the same everywhere.
 */
@Composable
fun AppShell(
    modifier: Modifier = Modifier,
    sidebar: @Composable ColumnScope.() -> Unit,
    bar: @Composable () -> Unit,
    content: @Composable BoxScope.() -> Unit,
    compactNav: (@Composable () -> Unit)? = null,
) {
    val colors = LocalAppColors.current
    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(colors.win),
    ) {
        val wide = maxWidth >= 1000.dp
        if (wide) {
            Row(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier = Modifier
                        .width(248.dp)
                        .fillMaxHeight()
                        .background(colors.side),
                    content = sidebar,
                )
                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .fillMaxHeight()
                        .background(colors.line),
                )
                Column(modifier = Modifier.weight(1f).fillMaxHeight()) {
                    bar()
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), content = content)
                }
            }
        } else {
            Column(modifier = Modifier.fillMaxSize()) {
                bar()
                compactNav?.invoke()
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), content = content)
            }
        }
    }
}
