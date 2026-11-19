package org.surfacevolume.core

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
enum class WorkflowStatus {
    @SerialName("draft")
    DRAFT,

    @SerialName("on")
    ON,

    @SerialName("off")
    OFF,

    @SerialName("error")
    ERROR,
}

@Serializable
data class TriggerNode(
    val id: String,
    val appId: String,
    val triggerKey: String,
    val credentialId: String? = null,
    val inputs: Map<String, JsonElement> = emptyMap(),
    val webhook: WebhookAddress? = null,
)

@Serializable
data class WebhookAddress(
    val url: String,
    val secret: String,
    val subscriptionId: String? = null,
)

@Serializable
data class WorkflowResource(
    val id: String,
    val userId: String,
    val name: String,
    val description: String? = null,
    val status: WorkflowStatus,
    val statusReason: String? = null,
    val version: Int,
    val trigger: TriggerNode,
    val nodes: List<WorkflowNode>,
    val links: List<Link>,
    val createdAt: String,
    val updatedAt: String,
    val lastRunAt: String? = null,
)

@Serializable
data class Link(
    val id: String,
    val from: String,
    val fromPath: String? = null,
    val to: String,
)

@Serializable
sealed interface WorkflowNode {
    val id: String
    val name: String?
    val onError: NodeErrorPolicy?
}

@Serializable
data class NodeErrorPolicy(
    val strategy: ErrorStrategy,
    val maxRetries: Int? = null,
)

@Serializable
enum class ErrorStrategy {
    @SerialName("stop")
    STOP,

    @SerialName("continue")
    CONTINUE,

    @SerialName("retry")
    RETRY,
}

@Serializable
@SerialName("action")
data class ActionNode(
    override val id: String,
    override val name: String? = null,
    override val onError: NodeErrorPolicy? = null,
    val appId: String,
    val actionKey: String,
    val credentialId: String? = null,
    val inputs: Map<String, JsonElement> = emptyMap(),
) : WorkflowNode

@Serializable
@SerialName("filter")
data class FilterNode(
    override val id: String,
    override val name: String? = null,
    override val onError: NodeErrorPolicy? = null,
    val conditions: List<List<Condition>>,
) : WorkflowNode

@Serializable
data class Condition(
    val left: String,
    val op: ConditionOp,
    val right: String? = null,
)

@Serializable
enum class ConditionOp {
    @SerialName("eq")
    EQ,

    @SerialName("neq")
    NEQ,

    @SerialName("gt")
    GT,

    @SerialName("lt")
    LT,

    @SerialName("contains")
    CONTAINS,

    @SerialName("exists")
    EXISTS,

    @SerialName("not_exists")
    NOT_EXISTS,

    @SerialName("regex")
    REGEX,
}

@Serializable
@SerialName("delay")
data class DelayNode(
    override val id: String,
    override val name: String? = null,
    override val onError: NodeErrorPolicy? = null,
    val forMs: Long? = null,
    val until: String? = null,
) : WorkflowNode

@Serializable
@SerialName("branch")
data class BranchNode(
    override val id: String,
    override val name: String? = null,
    override val onError: NodeErrorPolicy? = null,
    val paths: List<BranchPath>,
) : WorkflowNode

@Serializable
data class BranchPath(
    val name: String,
    val conditions: List<List<Condition>>,
)

@Serializable
@SerialName("loop")
data class LoopNode(
    override val id: String,
    override val name: String? = null,
    override val onError: NodeErrorPolicy? = null,
    val items: String,
) : WorkflowNode

@Serializable
data class WorkflowListItem(
    val workflow: WorkflowResource,
    val services: List<String>,
    val lastRun: WorkflowRun? = null,
    val runsLast7Days: List<Int> = emptyList(),
)

@Serializable
enum class RunStatus {
    @SerialName("queued")
    QUEUED,

    @SerialName("running")
    RUNNING,

    @SerialName("waiting")
    WAITING,

    @SerialName("succeeded")
    SUCCEEDED,

    @SerialName("failed")
    FAILED,

    @SerialName("cancelled")
    CANCELLED,
}

@Serializable
enum class RunMode {
    @SerialName("live")
    LIVE,

    @SerialName("test")
    TEST,

    @SerialName("manual")
    MANUAL,

    @SerialName("retry")
    RETRY,
}

@Serializable
enum class ErrorKind {
    @SerialName("retryable")
    RETRYABLE,

    @SerialName("fatal")
    FATAL,

    @SerialName("auth_expired")
    AUTH_EXPIRED,

    @SerialName("rate_limited")
    RATE_LIMITED,
}

@Serializable
data class WorkflowRun(
    val id: String,
    val workflowId: String,
    val versionId: String,
    val mode: RunMode,
    val status: RunStatus,
    val queuedAt: String,
    val startedAt: String? = null,
    val finishedAt: String? = null,
    val errorNodeId: String? = null,
    val errorKind: ErrorKind? = null,
    val errorMessage: String? = null,
)

@Serializable
enum class ConnectionStatus {
    @SerialName("active")
    ACTIVE,

    @SerialName("expired")
    EXPIRED,

    @SerialName("revoked")
    REVOKED,

    @SerialName("error")
    ERROR,
}

@Serializable
data class ConnectionResource(
    val id: String,
    val appId: String,
    val appName: String,
    val account: String? = null,
    val status: ConnectionStatus,
)

@Serializable
data class AppCatalogueEntry(
    val id: String,
    val name: String,
    val triggers: Map<String, String> = emptyMap(),
    val actions: Map<String, String> = emptyMap(),
)

@Serializable
data class Account(
    val id: String,
    val name: String,
    val email: String,
    val plan: String,
)

@Serializable
data class DashboardStats(
    val weekRuns: Int,
    val failed: Int,
    val successRate: Double,
    val delta: Double,
    val runsToday: Int,
    val runsPerDay: List<Int>,
)
