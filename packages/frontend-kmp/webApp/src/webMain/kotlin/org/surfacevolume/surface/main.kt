package org.surfacevolume.surface

import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.window.ComposeViewport
import web.dom.document
import web.window.window

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    // Deploy-time override: <meta name="api-base-url" content="..."> in index.html.
    // Default is same-origin (window.location.origin), so production needs no config.
    val injected = document
        .querySelector("meta[name=\"api-base-url\"]")
        ?.getAttribute("content")
        ?.takeIf { it.isNotBlank() }
    val origin = window.location.origin.takeIf { it.isNotBlank() && it != "null" }
    ComposeViewport { App(ApiConfig(injected ?: origin ?: "http://localhost:8080")) }
}
