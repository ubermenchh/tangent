package com.ubermenchh.tangent

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.concurrent.thread

class TangentAccessibilityModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TangentAccessibility"

    /**
     * Check if the accessibility service is enabled by querying the system setting
     * directly, not the in-process static instance. This returns true even if
     * onServiceConnected() hasn't fired yet (e.g. user just toggled it on).
     */
    @ReactMethod
    fun isEnabled(promise: Promise) {
        try {
            val expectedComponent = ComponentName(
                reactApplicationContext.packageName,
                TangentAccessibilityService::class.java.canonicalName!!
            ).flattenToString()

            val enabledServices = Settings.Secure.getString(
                reactApplicationContext.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""

            val isEnabled = TextUtils.SimpleStringSplitter(':').let { splitter ->
                splitter.setString(enabledServices)
                var found = false
                while (splitter.hasNext()) {
                    if (splitter.next().equals(expectedComponent, ignoreCase = true)) {
                        found = true
                        break
                    }
                }
                found
            }

            promise.resolve(isEnabled)
        } catch (e: Exception) {
            // Fallback to static instance check if system query fails
            promise.resolve(TangentAccessibilityService.isRunning())
        }
    }

    @ReactMethod
    fun openSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Wait for the accessibility service instance to become available.
     * After the user enables the service, there is a brief window where
     * isEnabled() returns true (system setting) but onServiceConnected()
     * has not yet fired (instance is null). This polls for up to 3 seconds.
     */
    private fun awaitService(timeoutMs: Long = 3000): TangentAccessibilityService? {
        TangentAccessibilityService.getInstance()?.let { return it }

        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < timeoutMs) {
            Thread.sleep(100)
            TangentAccessibilityService.getInstance()?.let { return it }
        }
        return null
    }

    @ReactMethod
    fun getScreenContent(promise: Promise) {
        thread {
            val service = awaitService()
            if (service == null) {
                promise.reject("NOT_ENABLED", "Accessibility service not enabled")
                return@thread
            }
            promise.resolve(service.getScreenContent())
        }
    }

    @ReactMethod
    fun tapElement(identifier: String, promise: Promise) {
        thread {
            val service = awaitService()
            if (service == null) {
                promise.reject("NOT_ENABLED", "Accessibility service not enabled")
                return@thread
            }
            promise.resolve(service.tapElement(identifier))
        }
    }

    @ReactMethod
    fun tapAt(x: Int, y: Int, promise: Promise) {
        thread {
            val service = awaitService()
            if (service == null) {
                promise.reject("NOT_ENABLED", "Accessibility service not enabled")
                return@thread
            }
            promise.resolve(service.tapAt(x, y))
        }
    }

    @ReactMethod
    fun typeText(text: String, promise: Promise) {
        thread {
            val service = awaitService()
            if (service == null) {
                promise.reject("NOT_ENABLED", "Accessibility service not enabled")
                return@thread
            }
            promise.resolve(service.typeText(text))
        }
    }

    @ReactMethod
    fun scroll(direction: String, promise: Promise) {
        thread {
            val service = awaitService()
            if (service == null) {
                promise.reject("NOT_ENABLED", "Accessibility service not enabled")
                return@thread
            }
            promise.resolve(service.scroll(direction))
        }
    }

    @ReactMethod
    fun pressBack(promise: Promise) {
        thread {
            val service = awaitService()
            if (service == null) {
                promise.reject("NOT_ENABLED", "Accessibility service not enabled")
                return@thread
            }
            promise.resolve(service.pressBack())
        }
    }

    @ReactMethod
    fun pressHome(promise: Promise) {
        thread {
            val service = awaitService()
            if (service == null) {
                promise.reject("NOT_ENABLED", "Accessibility service not enabled")
                return@thread
            }
            promise.resolve(service.pressHome())
        }
    }

    @ReactMethod
    fun openNotifications(promise: Promise) {
        thread {
            val service = awaitService()
            if (service == null) {
                promise.reject("NOT_ENABLED", "Accessibility service not enabled")
                return@thread
            }
            promise.resolve(service.openNotifications())
        }
    }

    @ReactMethod
    fun launchApp(packageName: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", e.message)
        }
    }
}
