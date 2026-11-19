package org.surfacevolume.surface

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import org.surfacevolume.surface.screens.LoginScreen
import org.surfacevolume.surface.screens.dashboard.DashboardScreen

@Composable
fun App(config: ApiConfig) {
    var signedInEmail by remember { mutableStateOf<String?>(null) }
    val systemDark = isSystemInDarkTheme()
    var darkTheme by remember { mutableStateOf(systemDark) }

    CompositionLocalProvider(LocalApiConfig provides config) {
        AppTheme(darkTheme = darkTheme) {
            val email = signedInEmail
            if (email == null) {
                LoginScreen(onSignIn = { signedInEmail = it })
            } else {
                DashboardScreen(
                    email = email,
                    darkTheme = darkTheme,
                    onToggleTheme = { darkTheme = !darkTheme },
                    onSignOut = { signedInEmail = null },
                )
            }
        }
    }
}
