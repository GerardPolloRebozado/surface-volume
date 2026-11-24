package org.surfacevolume.surface

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import io.ktor.client.request.header
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpMethod
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import org.surfacevolume.core.AppCatalogueEntry
import org.surfacevolume.core.ConnectionResource
import org.surfacevolume.core.WorkflowListItem
import org.surfacevolume.core.WorkflowRun

@Serializable
data class ApiWorkflowInfo(
    val id: String,
    val name: String,
    val description: String? = null,
    val status: String,
    val statusReason: String? = null,
    val version: Int,
    val trigger: JsonElement? = null,
    val nodes: List<JsonElement> = emptyList(),
    val lastRunAt: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class ApiWorkflowListItem(
    val workflow: ApiWorkflowInfo,
    val services: List<String> = emptyList(),
    val lastRun: WorkflowRun? = null,
    val runsLast7Days: List<Int> = emptyList(),
)

@Serializable
data class ApiWorkflowDetail(
    val id: String,
    val name: String,
    val description: String? = null,
    val status: String,
    val version: Int,
    val trigger: JsonElement,
    val nodes: List<JsonElement> = emptyList(),
    val links: List<JsonElement> = emptyList(),
)

@Serializable
data class ApiRunNow(val runId: String)

@Serializable
data class ApiConnectionTest(val ok: Boolean, val message: String? = null)

@Serializable
data class TriggerPayload(
    val id: String = "trigger",
    val appId: String,
    val triggerKey: String,
    val credentialId: String? = null,
    val inputs: Map<String, JsonElement> = emptyMap(),
)

@Serializable
data class ActionPayload(
    val id: String,
    val type: String = "action",
    val appId: String,
    val actionKey: String,
    val credentialId: String? = null,
    val inputs: Map<String, String> = emptyMap(),
)

@Serializable
data class LinkPayload(val id: String, val from: String, val to: String)

@Serializable
data class DefinitionPayload(
    val trigger: TriggerPayload,
    val nodes: List<ActionPayload>,
    val links: List<LinkPayload>,
)

@Serializable
data class CreateWorkflowPayload(val name: String)

@Serializable
data class CreateConnectionPayload(val appId: String, val credentials: Map<String, String>)

@Serializable
data class SaveWorkflowPayload(val name: String, val definition: DefinitionPayload)

object MobileApi {
    private val serializerJson = Json { ignoreUnknownKeys = true; isLenient = true }

    private fun client(): HttpClient = HttpClient {
        install(ContentNegotiation) { json(serializerJson) }
    }

    private fun url(config: ApiConfig, path: String): String =
        "${config.baseUrl.trimEnd('/')}$path"

    private suspend inline fun <reified T> call(
        config: ApiConfig,
        path: String,
        method: HttpMethod = HttpMethod.Get,
        body: String? = null,
    ): T {
        val client = client()
        try {
            val token = AuthSession.accessToken
            val response: HttpResponse = client.request(url(config, path)) {
                this.method = method
                if (token != null) header("Authorization", "Bearer $token")
                if (body != null) {
                    contentType(ContentType.Application.Json)
                    setBody(body)
                }
            }
            if (!response.status.isSuccess()) {
                throw Exception("Request failed (${response.status.value})")
            }
            return response.body<T>()
        } finally {
            client.close()
        }
    }

    suspend fun apps(config: ApiConfig): List<AppCatalogueEntry> =
        call(config, "/apps")

    suspend fun connections(config: ApiConfig): List<ConnectionResource> =
        call(config, "/connections")

    suspend fun workflows(config: ApiConfig): List<ApiWorkflowListItem> =
        call(config, "/workflows")

    suspend fun runs(config: ApiConfig): List<WorkflowRun> =
        call(config, "/runs")

    suspend fun connect(config: ApiConfig, appId: String, credentials: Map<String, String>): ConnectionResource =
        call(config, "/connections", HttpMethod.Post, serializerJson.encodeToString(CreateConnectionPayload(appId, credentials)))

    suspend fun testConnection(config: ApiConfig, id: String): ApiConnectionTest =
        call(config, "/connections/$id/test", HttpMethod.Post)

    suspend fun disconnect(config: ApiConfig, id: String) {
        call<Unit>(config, "/connections/$id", HttpMethod.Delete)
    }

    suspend fun createWorkflow(config: ApiConfig, name: String): ApiWorkflowInfo =
        call(config, "/workflows", HttpMethod.Post, serializerJson.encodeToString(CreateWorkflowPayload(name)))

    suspend fun workflow(config: ApiConfig, id: String): ApiWorkflowDetail =
        call(config, "/workflows/$id")

    suspend fun saveWorkflow(config: ApiConfig, id: String, name: String, definition: DefinitionPayload): ApiWorkflowInfo =
        call(config, "/workflows/$id", HttpMethod.Put, serializerJson.encodeToString(SaveWorkflowPayload(name, definition)))

    suspend fun enableWorkflow(config: ApiConfig, id: String): ApiWorkflowInfo =
        call(config, "/workflows/$id/enable", HttpMethod.Post)

    suspend fun disableWorkflow(config: ApiConfig, id: String): ApiWorkflowInfo =
        call(config, "/workflows/$id/disable", HttpMethod.Post)

    suspend fun runWorkflow(config: ApiConfig, id: String): ApiRunNow =
        call(config, "/workflows/$id/run", HttpMethod.Post)

    suspend fun deleteWorkflow(config: ApiConfig, id: String) {
        call<Unit>(config, "/workflows/$id", HttpMethod.Delete)
    }
}
