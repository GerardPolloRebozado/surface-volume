package org.surfacevolume.surface

object AuthSession {
    var accessToken: String? = null
        private set

    var refreshToken: String? = null
        private set

    var username: String? = null
        private set

    var email: String? = null
        private set

    var status: String? = null
        private set

    fun storeTokens(access: String?, refresh: String?) {
        accessToken = access
        refreshToken = refresh
    }

    fun storeProfile(name: String?, mail: String?, accountStatus: String?) {
        username = name
        email = mail
        status = accountStatus
    }

    fun clear() {
        accessToken = null
        refreshToken = null
        username = null
        email = null
        status = null
    }
}
