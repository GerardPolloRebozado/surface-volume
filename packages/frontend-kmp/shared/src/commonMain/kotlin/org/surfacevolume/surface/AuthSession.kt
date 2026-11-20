package org.surfacevolume.surface

object AuthSession {
    var accessToken: String? = null
        private set

    var refreshToken: String? = null
        private set

    fun store(access: String?, refresh: String?) {
        accessToken = access
        refreshToken = refresh
    }

    fun clear() {
        accessToken = null
        refreshToken = null
    }
}
