package org.surfacevolume.surface

import androidx.compose.ui.window.ComposeUIViewController
import platform.Foundation.NSBundle
import platform.Foundation.NSProcessInfo
import platform.UIKit.UIViewController

fun MainViewController(): UIViewController {
    val baseUrl = NSProcessInfo.processInfo.environment["SURFACE_VOLUME_API_BASE_URL"] as? String
        ?: NSBundle.mainBundle.objectForInfoDictionaryKey("ApiBaseUrl") as? String
        ?: "http://localhost:8080"
    return ComposeUIViewController { App(ApiConfig(baseUrl)) }
}
