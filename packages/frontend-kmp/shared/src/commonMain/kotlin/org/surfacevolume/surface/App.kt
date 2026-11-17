package org.surfacevolume.surface

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.surfacevolume.surface.components.Brand
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.Card

@Composable
fun App() {
    AppTheme {
        var signedInEmail by remember { mutableStateOf<String?>(null) }
        val email = signedInEmail
        if (email == null) {
            LoginScreen(onSignIn = { signedInEmail = it })
        } else {
            SignedInScreen(email = email, onSignOut = { signedInEmail = null })
        }
    }
}

/**
 * Until we have a dashboard ui, this works as a placeholder
 */
@Composable
private fun SignedInScreen(
    email: String,
    onSignOut: () -> Unit,
) {
    val colors = LocalAppColors.current
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.win)
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier
                .widthIn(max = 400.dp)
                .fillMaxWidth(),
            contentPadding = 20.dp,
            contentSpacing = 12.dp,
        ) {
            Brand(fontSize = 20.sp)
            Text(
                text = "Signed in",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "You are signed in as $email.",
                color = colors.mute,
                fontSize = 12.sp,
                lineHeight = 19.sp,
            )
            Button(
                text = "Sign out",
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
