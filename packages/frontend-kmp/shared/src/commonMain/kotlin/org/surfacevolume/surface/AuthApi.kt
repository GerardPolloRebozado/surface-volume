package org.surfacevolume.surface

import surfacevolume.api.client.AuthApi
import surfacevolume.api.models.RefreshTokenDto
import surfacevolume.api.models.SignInDto
import surfacevolume.api.models.SignUpDto
import surfacevolume.api.models.VerifyEmailDto
import org.openapitools.client.infrastructure.HttpResponse
import kotlin.Result

object AuthApi {

    private fun createClient(baseUrl: String): AuthApi = AuthApi(baseUrl = baseUrl)

    suspend fun signIn(config: ApiConfig, email: String, password: String): Result<String> {
        val client = createClient(config.baseUrl)
        return try {
            val dto = SignInDto(email.trim(), password)
            val response: HttpResponse<surfacevolume.api.models.SignInResponseDto> = client.authControllerSignIn(dto)
            if (!response.success) {
                return Result.failure(Exception("Invalid email or password"))
            }
            val tokens = response.body()
            AuthSession.storeTokens(tokens.accessToken, tokens.refreshToken)

            // Fetch user profile
            val meResponse: HttpResponse<surfacevolume.api.models.UserResponseDto> = client.authControllerGetMe()
            if (meResponse.success) {
                val user = meResponse.body()
                AuthSession.storeProfile(user.username, user.email, user.status)
            }
            Result.success(email.trim())
        } catch (e: Exception) {
            println("AuthApi.signIn failed: $e")
            Result.failure(Exception("Cannot reach the server"))
        }
    }

    suspend fun signUp(
        config: ApiConfig,
        username: String,
        email: String,
        password: String,
    ): Result<Unit> {
        val client = createClient(config.baseUrl)
        return try {
            val dto = SignUpDto(username.trim(), email.trim(), password)
            val response: HttpResponse<kotlin.Unit> = client.authControllerSignUp(dto)
            if (!response.success) {
                return Result.failure(Exception("Email or username already registered"))
            }
            Result.success(Unit)
        } catch (e: Exception) {
            println("AuthApi.signUp failed: $e")
            Result.failure(Exception("Cannot reach the server"))
        }
    }

    suspend fun getMe(config: ApiConfig, token: String): Result<surfacevolume.api.models.UserResponseDto?> {
        val client = createClient(config.baseUrl)
        return try {
            val response: HttpResponse<surfacevolume.api.models.UserResponseDto> = client.authControllerGetMe()
            if (!response.success) {
                return Result.failure(Exception("Failed to get profile"))
            }
            Result.success(response.body())
        } catch (e: Exception) {
            println("AuthApi.getMe failed: $e")
            Result.failure(Exception("Cannot reach the server"))
        }
    }

    suspend fun refreshToken(config: ApiConfig, refreshToken: String): Result<surfacevolume.api.models.SignInResponseDto> {
        val client = createClient(config.baseUrl)
        return try {
            val dto = RefreshTokenDto(refreshToken)
            val response: HttpResponse<surfacevolume.api.models.SignInResponseDto> = client.authControllerRefresh(dto)
            if (!response.success) {
                return Result.failure(Exception("Token refresh failed"))
            }
            Result.success(response.body())
        } catch (e: Exception) {
            println("AuthApi.refreshToken failed: $e")
            Result.failure(Exception("Cannot reach the server"))
        }
    }

    suspend fun signOut(config: ApiConfig, token: String?): Result<Boolean> {
        val client = createClient(config.baseUrl)
        return try {
            val response: HttpResponse<kotlin.Unit> = client.authControllerSignOut()
            AuthSession.clear()
            Result.success(response.success)
        } catch (e: Exception) {
            println("AuthApi.signOut failed: $e")
            Result.failure(Exception("Cannot reach the server"))
        }
    }

    suspend fun verifyEmail(config: ApiConfig, email: String): Result<Unit> {
        val client = createClient(config.baseUrl)
        return try {
            val dto = VerifyEmailDto(email.trim())
            val response: HttpResponse<surfacevolume.api.models.VerifyEmailResponseDto> = client.emailVerificationControllerVerify(dto)
            if (!response.success) {
                return Result.failure(Exception("Email verification failed"))
            }
            Result.success(Unit)
        } catch (e: Exception) {
            println("AuthApi.verifyEmail failed: $e")
            Result.failure(Exception("Cannot reach the server"))
        }
    }
}
