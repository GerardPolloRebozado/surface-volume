# AuthApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**authControllerGetMe**](AuthApi.md#authControllerGetMe) | **GET** /auth/me | Get profile of the currently authenticated user |
| [**authControllerRefresh**](AuthApi.md#authControllerRefresh) | **POST** /auth/refresh | Refresh JWT access token using body or cookie |
| [**authControllerSignIn**](AuthApi.md#authControllerSignIn) | **POST** /auth/sign-in | Authenticate user with email and password |
| [**authControllerSignOut**](AuthApi.md#authControllerSignOut) | **POST** /auth/sign-out | Sign out and invalidate all tokens for current user |
| [**authControllerSignUp**](AuthApi.md#authControllerSignUp) | **POST** /auth/sign-up | Register a new user account |
| [**emailVerificationControllerResend**](AuthApi.md#emailVerificationControllerResend) | **POST** /auth/email/verification | Resend verification email to current user |
| [**emailVerificationControllerVerify**](AuthApi.md#emailVerificationControllerVerify) | **POST** /auth/email/verify | Verify email address with token |


<a id="authControllerGetMe"></a>
# **authControllerGetMe**
> UserResponseDto authControllerGetMe()

Get profile of the currently authenticated user

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import surfacevolume.api.models.*

val apiInstance = AuthApi()
try {
    val result : UserResponseDto = apiInstance.authControllerGetMe()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AuthApi#authControllerGetMe")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#authControllerGetMe")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**UserResponseDto**](UserResponseDto.md)

### Authorization


Configure bearer statically:
```kotlin
ApiClient.accessToken = ""
```
Configure bearer dynamically:
```kotlin
apiInstance.accessTokenProvider = { "" }
```

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="authControllerRefresh"></a>
# **authControllerRefresh**
> SignInResponseDto authControllerRefresh(refreshTokenDto)

Refresh JWT access token using body or cookie

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import surfacevolume.api.models.*

val apiInstance = AuthApi()
val refreshTokenDto : RefreshTokenDto =  // RefreshTokenDto | 
try {
    val result : SignInResponseDto = apiInstance.authControllerRefresh(refreshTokenDto)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AuthApi#authControllerRefresh")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#authControllerRefresh")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **refreshTokenDto** | [**RefreshTokenDto**](RefreshTokenDto.md)|  | |

### Return type

[**SignInResponseDto**](SignInResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="authControllerSignIn"></a>
# **authControllerSignIn**
> SignInResponseDto authControllerSignIn(signInDto)

Authenticate user with email and password

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import surfacevolume.api.models.*

val apiInstance = AuthApi()
val signInDto : SignInDto =  // SignInDto | 
try {
    val result : SignInResponseDto = apiInstance.authControllerSignIn(signInDto)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AuthApi#authControllerSignIn")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#authControllerSignIn")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **signInDto** | [**SignInDto**](SignInDto.md)|  | |

### Return type

[**SignInResponseDto**](SignInResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="authControllerSignOut"></a>
# **authControllerSignOut**
> authControllerSignOut()

Sign out and invalidate all tokens for current user

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import surfacevolume.api.models.*

val apiInstance = AuthApi()
try {
    apiInstance.authControllerSignOut()
} catch (e: ClientException) {
    println("4xx response calling AuthApi#authControllerSignOut")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#authControllerSignOut")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization


Configure bearer statically:
```kotlin
ApiClient.accessToken = ""
```
Configure bearer dynamically:
```kotlin
apiInstance.accessTokenProvider = { "" }
```

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

<a id="authControllerSignUp"></a>
# **authControllerSignUp**
> authControllerSignUp(signUpDto)

Register a new user account

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import surfacevolume.api.models.*

val apiInstance = AuthApi()
val signUpDto : SignUpDto =  // SignUpDto | 
try {
    apiInstance.authControllerSignUp(signUpDto)
} catch (e: ClientException) {
    println("4xx response calling AuthApi#authControllerSignUp")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#authControllerSignUp")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **signUpDto** | [**SignUpDto**](SignUpDto.md)|  | |

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

<a id="emailVerificationControllerResend"></a>
# **emailVerificationControllerResend**
> emailVerificationControllerResend()

Resend verification email to current user

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import surfacevolume.api.models.*

val apiInstance = AuthApi()
try {
    apiInstance.emailVerificationControllerResend()
} catch (e: ClientException) {
    println("4xx response calling AuthApi#emailVerificationControllerResend")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#emailVerificationControllerResend")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

<a id="emailVerificationControllerVerify"></a>
# **emailVerificationControllerVerify**
> VerifyEmailResponseDto emailVerificationControllerVerify(verifyEmailDto)

Verify email address with token

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import surfacevolume.api.models.*

val apiInstance = AuthApi()
val verifyEmailDto : VerifyEmailDto =  // VerifyEmailDto | 
try {
    val result : VerifyEmailResponseDto = apiInstance.emailVerificationControllerVerify(verifyEmailDto)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AuthApi#emailVerificationControllerVerify")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AuthApi#emailVerificationControllerVerify")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **verifyEmailDto** | [**VerifyEmailDto**](VerifyEmailDto.md)|  | |

### Return type

[**VerifyEmailResponseDto**](VerifyEmailResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

