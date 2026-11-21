package org.surfacevolume.surface.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.surfacevolume.surface.AuthApi
import org.surfacevolume.surface.LocalApiConfig
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.Brand
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.ButtonVariant
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.FieldLabel
import org.surfacevolume.surface.components.TextField
import org.surfacevolume.surface.components.TextLink

@Composable
fun RegisterScreen(
    modifier: Modifier = Modifier,
    onBack: () -> Unit = {},
    onRegistered: (email: String) -> Unit = {},
) {
    val colors = LocalAppColors.current
    val config = LocalApiConfig.current
    val scope = rememberCoroutineScope()

    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showingPassword by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun submit() {
        if (busy) return
        error = null
        if (username.isBlank() || email.isBlank() || password.length < 12) {
            error = "Enter a username, email and a password of at least 12 characters."
            return
        }
        busy = true


        scope.launch {
            val result = AuthApi.signUp(config, username, email, password)
            if (result.isFailure) {
                error = result.exceptionOrNull()?.message ?: "Registration failed"
                busy = false
                return@launch
            }
            AuthApi.signIn(config, email, password).fold(
                onSuccess = { onRegistered(it) },
                onFailure = {
                    error = "Account created, but sign in failed. Please sign in."
                    busy = false
                },
            )
        }
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(colors.win)
            .windowInsetsPadding(androidx.compose.foundation.layout.WindowInsets.safeDrawing)
            .imePadding(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .heightIn(min = maxHeight)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Column(
                modifier = Modifier.widthIn(max = 400.dp).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Brand()
                Text(
                    text = "Create your account",
                    color = colors.ink,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = 20.dp,
                    contentSpacing = 14.dp,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        FieldLabel("Username")
                        TextField(
                            value = username,
                            onValueChange = { username = it; error = null },
                            placeholder = "lskywalker",
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                            modifier = Modifier.fillMaxWidth(),
                            label = "Username",
                        )
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        FieldLabel("Email")
                        TextField(
                            value = email,
                            onValueChange = { email = it; error = null },
                            placeholder = "you@company.com",
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Email,
                                imeAction = ImeAction.Next,
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            label = "Email",
                            contentType = ContentType.EmailAddress,
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        FieldLabel("Password")
                        TextLink(
                            text = if (showingPassword) "Hide" else "Show",
                            onClick = { showingPassword = !showingPassword },
                            color = colors.mute,
                            hoverColor = colors.ink,
                            fontSize = 10.sp,
                        )
                    }
                    TextField(
                        value = password,
                        onValueChange = { password = it; error = null },
                        placeholder = "At least 12 characters",
                        visualTransformation = if (showingPassword) {
                            VisualTransformation.None
                        } else {
                            PasswordVisualTransformation()
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .semantics { contentType = ContentType.Password },
                        label = "Password",
                    )

                    error?.let { message ->
                        Text(
                            text = message,
                            color = colors.bad,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }

                    Button(
                        text = if (busy) "Creating…" else "Create account",
                        onClick = { submit() },
                        variant = ButtonVariant.Accent,
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        TextLink(
                            text = "Already have an account? Sign in",
                            onClick = onBack,
                            fontSize = 11.sp,
                        )
                    }
                }
            }
        }
    }
}
