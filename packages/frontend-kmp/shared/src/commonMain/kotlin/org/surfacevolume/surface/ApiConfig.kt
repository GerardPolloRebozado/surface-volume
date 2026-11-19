package org.surfacevolume.surface

import androidx.compose.runtime.staticCompositionLocalOf

data class ApiConfig(val baseUrl: String) {
    fun url(path: String): String = baseUrl.trimEnd('/') + path
}

val LocalApiConfig = staticCompositionLocalOf<ApiConfig> {
    error("No ApiConfig provided. Call App(config = ApiConfig(baseUrl)).")
}
