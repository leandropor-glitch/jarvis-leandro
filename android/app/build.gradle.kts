import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// chave de envio da Play Store: fica só no Mac (keystore.properties fora do Git)
val chave = Properties().apply { rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) } }

android {
    namespace = "com.vinci.felyx"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.vinci.felyx"
        minSdk = 26
        targetSdk = 36
        versionCode = 3
        versionName = "1.0.4"
    }
    signingConfigs {
        if (chave.getProperty("storeFile") != null) create("envio") {
            storeFile = file(chave.getProperty("storeFile"))
            storePassword = chave.getProperty("storePassword")
            keyAlias = chave.getProperty("keyAlias")
            keyPassword = chave.getProperty("keyPassword")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfigs.findByName("envio")?.let { signingConfig = it }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.14.0")
}
