package org.surfacevolume.surface.components

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.LocalAppColors

/* "area.", the name of the project. we can update it to a logo maybe */
@Composable
fun Brand(
    modifier: Modifier = Modifier,
    fontSize: TextUnit = 26.sp,
) {
    val colors = LocalAppColors.current
    Text(
        text = buildAnnotatedString {
            append("area")
            addStyle(SpanStyle(color = colors.accent), start = 4, end = 5)
            append(".")
        },
        modifier = modifier,
        fontSize = fontSize,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = (-0.025 * fontSize.value).toFloat().sp,
    )
}
