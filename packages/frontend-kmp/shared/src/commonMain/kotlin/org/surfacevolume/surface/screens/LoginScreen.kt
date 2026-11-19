package org.surfacevolume.surface.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.surfacevolume.surface.LocalAppColors
import org.surfacevolume.surface.components.Brand
import org.surfacevolume.surface.components.Button
import org.surfacevolume.surface.components.ButtonVariant
import org.surfacevolume.surface.components.Card
import org.surfacevolume.surface.components.Eyebrow
import org.surfacevolume.surface.components.FieldLabel
import org.surfacevolume.surface.components.HintText
import org.surfacevolume.surface.components.LabeledDivider
import org.surfacevolume.surface.components.TextField
import org.surfacevolume.surface.components.TextLink
import org.surfacevolume.surface.components.TopRule

/**
 * The prototype has no auth endpoint yet, so any log in works.
 */
@Composable
fun LoginScreen(
    modifier: Modifier = Modifier,
    onSignIn: (email: String) -> Unit = {},
    onCreateAccount: () -> Unit = {},
    onForgotPassword: () -> Unit = {},
    onSso: () -> Unit = {},
) {
    val colors = LocalAppColors.current
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showingPassword by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val passwordFocus = remember { FocusRequester() }

    fun submit() {
        if (busy) return
        error = null
        if (email.isBlank() || password.isEmpty()) {
            error = AuthStrings.errorRequired
            return
        }
        focusManager.clearFocus()
        busy = true
        scope.launch {
            delay(700)
            busy = false
            onSignIn(email.trim())
        }
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(colors.win)
            .windowInsetsPadding(WindowInsets.safeDrawing)
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
                modifier = Modifier
                    .widthIn(max = 400.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                SignInHeader()

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = 20.dp,
                    contentSpacing = 16.dp,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        FieldLabel(AuthStrings.email)
                        TextField(
                            value = email,
                            onValueChange = {
                                email = it
                                error = null
                            },
                            placeholder = AuthStrings.emailPlaceholder,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Email,
                                imeAction = ImeAction.Next,
                            ),
                            keyboardActions = KeyboardActions(
                                onNext = { passwordFocus.requestFocus() },
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            label = AuthStrings.email,
                            contentType = ContentType.EmailAddress,
                        )
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            FieldLabel(AuthStrings.password)
                            TextLink(
                                text = if (showingPassword) AuthStrings.hidePassword else AuthStrings.showPassword,
                                onClick = { showingPassword = !showingPassword },
                                color = colors.mute,
                                hoverColor = colors.ink,
                                fontSize = 10.sp,
                                modifier = Modifier.semantics {
                                    stateDescription = if (showingPassword) "Password shown" else "Password hidden"
                                },
                            )
                        }
                        TextField(
                            value = password,
                            onValueChange = {
                                password = it
                                error = null
                            },
                            placeholder = AuthStrings.passwordPlaceholder,
                            visualTransformation = if (showingPassword) {
                                VisualTransformation.None
                            } else {
                                PasswordVisualTransformation()
                            },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Done,
                            ),
                            keyboardActions = KeyboardActions(onDone = { submit() }),
                            modifier = Modifier
                                .fillMaxWidth()
                                .focusRequester(passwordFocus),
                            label = AuthStrings.password,
                            contentType = ContentType.Password,
                        )
                    }

                    error?.let { message ->
                        Text(
                            text = message,
                            color = colors.bad,
                            fontSize = 11.sp,
                            lineHeight = 18.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.semantics {
                                liveRegion = LiveRegionMode.Assertive
                            },
                        )
                    }

                    Box(modifier = Modifier.fillMaxWidth()) {
                        TextLink(
                            text = AuthStrings.forgot,
                            onClick = onForgotPassword,
                            fontSize = 11.sp,
                            hoverColor = colors.accent,
                            underlineOnHover = true,
                        )
                    }

                    Button(
                        text = if (busy) AuthStrings.signingIn else AuthStrings.signIn,
                        onClick = { submit() },
                        variant = ButtonVariant.Accent,
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    LabeledDivider(label = "or")

                    Button(
                        text = AuthStrings.sso,
                        onClick = onSso,
                        variant = ButtonVariant.Quiet,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    HintText(AuthStrings.ssoHint)

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        TopRule()
                        Spacer(modifier = Modifier.height(16.dp))
                        Eyebrow("New to area?")
                        Spacer(modifier = Modifier.height(4.dp))
                        Button(
                            text = "${AuthStrings.noAccount} ${AuthStrings.createAccount}",
                            onClick = onCreateAccount,
                            small = true,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    HintText(
                        text = AuthStrings.secure,
                        fontSize = 10.5.sp,
                        lineHeight = 17.sp,
                    )
                    HintText(
                        text = AuthStrings.server,
                        fontSize = 10.5.sp,
                        lineHeight = 17.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun SignInHeader() {
    val colors = LocalAppColors.current
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Brand()
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = AuthStrings.title,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.semantics { heading() },
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = AuthStrings.lead,
            color = colors.mute,
            fontSize = 12.sp,
            lineHeight = 19.sp,
            textAlign = TextAlign.Center,
        )
    }
}

private object AuthStrings {
    const val title = "Sign in"
    const val lead = "Your workflows kept running while you were away."
    const val email = "Email address"
    const val emailPlaceholder = "you@school.edu"
    const val password = "Password"
    const val passwordPlaceholder = "Your password"
    const val showPassword = "Show password"
    const val hidePassword = "Hide password"
    const val signIn = "Sign in"
    const val signingIn = "Signing in…"
    const val forgot = "Forgot your password?"
    const val sso = "Continue with Epitech SSO"
    const val ssoHint = "OpenID Connect · single sign-on"
    const val secure = "Sessions expire after 30 days. We never store service passwords."
    const val server = "Connected to area.epitech.eu. Prototype screens"
    const val noAccount = "No account yet?"
    const val createAccount = "Create one"
    const val errorRequired = "Enter your email address and password."
}
