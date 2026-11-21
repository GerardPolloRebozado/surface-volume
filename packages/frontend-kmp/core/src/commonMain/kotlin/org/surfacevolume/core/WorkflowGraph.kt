package org.surfacevolume.core

val WorkflowResource.servicesUsed: List<String>
    get() = buildList {
        add(trigger.appId)
        nodes.forEach { node ->
            when (node) {
                is ActionNode -> add(node.appId)
                else -> Unit
            }
        }
    }.distinct()

val WorkflowResource.actionNodes: List<ActionNode>
    get() = nodes.filterIsInstance<ActionNode>()

val WorkflowResource.isRunnable: Boolean
    get() {
        if (actionNodes.isEmpty()) return false
        val known = buildSet {
            add(trigger.id)
            nodes.forEach { add(it.id) }
        }
        return links.all { it.from in known && it.to in known }
    }
