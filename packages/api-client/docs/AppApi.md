# AppApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**appControllerGetHello**](AppApi.md#appControllerGetHello) | **GET** / |  |


<a id="appControllerGetHello"></a>
# **appControllerGetHello**
> kotlin.String appControllerGetHello()



### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import surfacevolume.api.models.*

val apiInstance = AppApi()
try {
    val result : kotlin.String = apiInstance.appControllerGetHello()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AppApi#appControllerGetHello")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AppApi#appControllerGetHello")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

**kotlin.String**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

