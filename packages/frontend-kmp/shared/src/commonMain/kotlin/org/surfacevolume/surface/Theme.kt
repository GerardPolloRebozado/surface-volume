package org.surfacevolume.surface

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import org.jetbrains.compose.resources.Font
import surface.shared.generated.resources.Res
import surface.shared.generated.resources.inter_bold
import surface.shared.generated.resources.inter_medium
import surface.shared.generated.resources.inter_regular
import surface.shared.generated.resources.inter_semibold

@Immutable
data class AppColors(
    val win: Color,
    val side: Color,
    val card: Color,
    val sunken: Color,
    val ink: Color,
    val mute: Color,
    val faint: Color,
    val line: Color,
    val lineStrong: Color,
    val fill: Color,
    val fillHover: Color,
    val accent: Color,
    val accentSoft: Color,
    val onAccent: Color,
    val ok: Color,
    val okSoft: Color,
    val warn: Color,
    val warnSoft: Color,
    val bad: Color,
    val badSoft: Color,
    val focus: Color,
)

private val LightAppColors = AppColors(
    win = Color(0xFFF7F6F3),
    side = Color(0xFFEFEDE9),
    card = Color(0xFFFFFFFF),
    sunken = Color(0xFFF2F0EC),
    ink = Color(0xFF1D1B21),
    mute = Color(0xFF5F5D66),
    faint = Color(0xFF8B8992),
    line = Color(0x1C1D1B21),
    lineStrong = Color(0x381D1B21),
    fill = Color(0x0E1D1B21),
    fillHover = Color(0x181D1B21),
    accent = Color(0xFF1B6FC4),
    accentSoft = Color(0x1F1B6FC4),
    onAccent = Color(0xFFFFFFFF),
    ok = Color(0xFF17764A),
    okSoft = Color(0x1F17764A),
    warn = Color(0xFF8A5A00),
    warnSoft = Color(0x1F8A5A00),
    bad = Color(0xFFBB1D28),
    badSoft = Color(0x1ABB1D28),
    focus = Color(0xFF1B6FC4),
)

private val DarkAppColors = AppColors(
    win = Color(0xFF1C1B1E),
    side = Color(0xFF171619),
    card = Color(0xFF262529),
    sunken = Color(0xFF211F24),
    ink = Color(0xFFF4F2F5),
    mute = Color(0xFFB6B3BC),
    faint = Color(0xFF8D8A94),
    line = Color(0x1FFFFFFF),
    lineStrong = Color(0x42FFFFFF),
    fill = Color(0x12FFFFFF),
    fillHover = Color(0x1FFFFFFF),
    accent = Color(0xFF7AB0F0),
    accentSoft = Color(0x297AB0F0),
    onAccent = Color(0xFF0C1C2E),
    ok = Color(0xFF6BDC9B),
    okSoft = Color(0x266BDC9B),
    warn = Color(0xFFF0C34C),
    warnSoft = Color(0x24F0C34C),
    bad = Color(0xFFFF8D80),
    badSoft = Color(0x24FF8D80),
    focus = Color(0xFF8DBCF5),
)

val LocalAppColors = staticCompositionLocalOf { LightAppColors }

private val LightColors = lightColorScheme(
    primary = Color(0xFF1B6FC4),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0x1F1B6FC4),
    onPrimaryContainer = Color(0xFF1D1B21),
    secondary = Color(0xFF5F5D66),
    onSecondary = Color(0xFFFFFFFF),
    tertiary = Color(0xFF17764A),
    onTertiary = Color(0xFFFFFFFF),
    background = Color(0xFFF7F6F3),
    onBackground = Color(0xFF1D1B21),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1D1B21),
    surfaceVariant = Color(0xFFF2F0EC),
    onSurfaceVariant = Color(0xFF5F5D66),
    outline = Color(0x1D1B211C),
    error = Color(0xFFBB1D28),
    onError = Color(0xFFFFFFFF),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF7AB0F0),
    onPrimary = Color(0xFF0C1C2E),
    primaryContainer = Color(0x297AB0F0),
    onPrimaryContainer = Color(0xFFF4F2F5),
    secondary = Color(0xFFB6B3BC),
    onSecondary = Color(0xFF1C1B1E),
    tertiary = Color(0xFF6BDC9B),
    onTertiary = Color(0xFF0C1C2E),
    background = Color(0xFF1C1B1E),
    onBackground = Color(0xFFF4F2F5),
    surface = Color(0xFF262529),
    onSurface = Color(0xFFF4F2F5),
    surfaceVariant = Color(0xFF211F24),
    onSurfaceVariant = Color(0xFFB6B3BC),
    outline = Color(0x1FFFFFFF),
    error = Color(0xFFFF8D80),
    onError = Color(0xFF0C1C2E),
)

@Composable
private fun interFontFamily(): FontFamily = FontFamily(
    Font(Res.font.inter_regular, FontWeight.Normal),
    Font(Res.font.inter_medium, FontWeight.Medium),
    Font(Res.font.inter_semibold, FontWeight.SemiBold),
    Font(Res.font.inter_bold, FontWeight.Bold),
)

@Composable
private fun wireframeTypography(family: FontFamily): Typography {
    val base = Typography()
    fun TextStyle.withFamily() = copy(fontFamily = family)
    return Typography(
        displayLarge = base.displayLarge.withFamily(),
        displayMedium = base.displayMedium.withFamily(),
        displaySmall = base.displaySmall.withFamily(),
        headlineLarge = base.headlineLarge.withFamily(),
        headlineMedium = base.headlineMedium.withFamily(),
        headlineSmall = base.headlineSmall.withFamily(),
        titleLarge = base.titleLarge.withFamily(),
        titleMedium = base.titleMedium.withFamily(),
        titleSmall = base.titleSmall.withFamily(),
        bodyLarge = base.bodyLarge.withFamily(),
        bodyMedium = base.bodyMedium.withFamily(),
        bodySmall = base.bodySmall.withFamily(),
        labelLarge = base.labelLarge.withFamily(),
        labelMedium = base.labelMedium.withFamily(),
        labelSmall = base.labelSmall.withFamily(),
    )
}

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkAppColors else LightAppColors
    val family = interFontFamily()
    CompositionLocalProvider(LocalAppColors provides colors) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColors else LightColors,
            typography = wireframeTypography(family),
        ) {
            CompositionLocalProvider(LocalContentColor provides colors.ink) {
                ProvideTextStyle(
                    TextStyle(
                        fontFamily = family,
                        color = colors.ink,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Normal,
                    ),
                ) {
                    content()
                }
            }
        }
    }
}
