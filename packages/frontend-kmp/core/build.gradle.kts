import org.jetbrains.kotlin.gradle.ExperimentalWasmDsl
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.androidMultiplatformLibrary)
}

val generateFixtures by tasks.registering {
    val fixturesDir = layout.projectDirectory.dir("../../contract/fixtures").asFile
    val outputDir = layout.buildDirectory.dir("generated/fixtures/kotlin").get().asFile

    inputs.dir(fixturesDir).withPropertyName("fixtures")
    outputs.dir(outputDir).withPropertyName("sources")

    doLast {
        val packageDir = outputDir.resolve("org/surfacevolume/core")
        packageDir.mkdirs()

        val sources = fixturesDir
            .listFiles { file -> file.isFile && file.extension == "json" }
            .orEmpty()
            .sortedBy { it.name }

        val code = buildString {
            appendLine("package org.surfacevolume.core")
            appendLine()
            appendLine("// Generated from packages/contract/fixtures. Do not edit.")
            appendLine("internal object Fixtures {")
            sources.forEach { file ->
                val property = file.nameWithoutExtension.replaceFirstChar { it.uppercase() }
                // Raw strings do not process escapes, so `$` must become `${'$'}`.
                val json = file.readText().trimEnd().replace("\$", "\${'\$'}")
                appendLine("    val ${property}Json: String = \"\"\"")
                appendLine(json)
                appendLine("\"\"\"")
                appendLine()
            }
            appendLine("}")
        }

        packageDir.resolve("Fixtures.kt").writeText(code)
    }
}

kotlin {
    jvm()

    js {
        browser()
    }

    @OptIn(ExperimentalWasmDsl::class)
    wasmJs {
        browser()
    }

    listOf(
        iosArm64(),
        iosSimulatorArm64(),
    )

    android {
        namespace = "org.surfacevolume.core"
        compileSdk = libs.versions.android.compileSdk.get().toInt()
        minSdk = libs.versions.android.minSdk.get().toInt()
        compilerOptions {
            jvmTarget = JvmTarget.JVM_11
        }
    }

    sourceSets {
        commonMain {
            kotlin.srcDir(generateFixtures)

            dependencies {
                api(libs.kotlinx.serialization.json)
            }
        }

        commonTest.dependencies {
            implementation(libs.kotlin.test)
        }
    }
}
