package org.surfacevolume.surface.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

/** Centred paragraph used for hints and footnotes. */
@Composable
fun HintText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = LocalAppColors.current.mute,
    fontSize: TextUnit = 11.sp,
    lineHeight: TextUnit = 18.sp,
) {
    Text(
        text = text,
        modifier = modifier.fillMaxWidth(),
        color = color,
        fontSize = fontSize,
        lineHeight = lineHeight,
        textAlign = TextAlign.Center,
    )
}
