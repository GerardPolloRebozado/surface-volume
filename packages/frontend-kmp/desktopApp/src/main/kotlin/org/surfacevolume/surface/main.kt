package org.surfacevolume.surface

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application

fun main() {
    val baseUrl = System.getProperty("SURFACE_VOLUME_API_BASE_URL")
        ?: System.getenv("SURFACE_VOLUME_API_BASE_URL")
        ?: "http://localhost:8080"
    application {
        Window(
            onCloseRequest = ::exitApplication,
            title = "Surface",
        ) {
            App(ApiConfig(baseUrl))
        }
    }
}
