package org.surfacevolume.surface

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType as HttpContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

object AuthApi {
    suspend fun signIn(config: ApiConfig, email: String, password: String): Result<String> {
        val client = HttpClient { install(ContentNegotiation) }
        return try {
            val response = client.post(config.url("/auth/sign-in")) {
                contentType(HttpContentType.Application.Json)
                setBody(Json.encodeToString(mapOf("email" to email.trim(), "password" to password)))
            }
            if (response.status != HttpStatusCode.OK) {
                return Result.failure(Exception("Invalid email or password"))
            }

            val tokens = Json.parseToJsonElement(response.body<String>()).jsonObject
            val access = tokens["accessToken"]?.jsonPrimitive?.content
            AuthSession.storeTokens(access, tokens["refreshToken"]?.jsonPrimitive?.content)

            if (access != null) {
                val me = client.get(config.url("/auth/me")) {
                    header("Authorization", "Bearer $access")
                }
                if (me.status == HttpStatusCode.OK) {
                    val profile = Json.parseToJsonElement(me.body<String>()).jsonObject
                    AuthSession.storeProfile(
                        profile["username"]?.jsonPrimitive?.content,
                        profile["email"]?.jsonPrimitive?.content,
                        profile["status"]?.jsonPrimitive?.content,
                    )
                }
            }
            Result.success(email.trim())
        } catch (e: Exception) {
            println("AuthApi.signIn failed: $e")
            Result.failure(Exception("Cannot reach the server"))
        } finally {
            client.close()
        }
    }

    suspend fun signUp(
        config: ApiConfig,
        username: String,
        email: String,
        password: String,
    ): Result<Unit> {
        val client = HttpClient { install(ContentNegotiation) }
        return try {
            val response = client.post(config.url("/auth/sign-up")) {
                contentType(HttpContentType.Application.Json)
                setBody(
                    Json.encodeToString(
                        mapOf(
                            "username" to username.trim(),
                            "email" to email.trim(),
                            "password" to password,
                        ),
                    ),
                )
            }
            if (response.status == HttpStatusCode.Created) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Email or username already registered"))
            }
        } catch (e: Exception) {
            println("AuthApi.signUp failed: $e")
            Result.failure(Exception("Cannot reach the server"))
        } finally {
            client.close()
        }
    }
}
