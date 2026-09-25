import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

val localProperties = Properties().apply {
    val localPropertiesFile = rootProject.file("local.properties")

    if (localPropertiesFile.exists()) {
        localPropertiesFile.inputStream().use {
            load(it)
        }
    }
}

android {
    namespace = "lk.sliit.microgrid"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "lk.sliit.microgrid"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        manifestPlaceholders["MAPS_API_KEY"] =
            localProperties.getProperty("MAPS_API_KEY", "")
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.core.ktx)
    implementation(libs.material)
    implementation("com.google.android.gms:play-services-maps:19.2.0")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    
}