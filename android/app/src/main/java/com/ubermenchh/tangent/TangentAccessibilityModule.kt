package com.ubermenchh.tangent

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TangentAccessibilityModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TangentAccessibility"

    @ReactMethod
    fun isEnabled(promise: Promise) {
        promise.resolve(TangentAccessibilityService.isRunning())
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

    @ReactMethod
    fun getScreenContent(promise: Promise) {
        val service = TangentAccessibilityService.getInstance()
        if (service == null) {
            promise.reject("NOT_ENABLED", "Accessibility service not enabled")
            return
        }
        promise.resolve(service.getScreenContent())
    }

    @ReactMethod
    fun tapElement(identifier: String, promise: Promise) {
        val service = TangentAccessibilityService.getInstance()
        if (service == null) {
            promise.reject("NOT_ENABLED", "Accessibility service not enabled")
            return
        }
        promise.resolve(service.tapElement(identifier))
    }

    @ReactMethod
    fun tapAt(x: Int, y: Int, promise: Promise) {
        val service = TangentAccessibilityService.getInstance()
        if (service == null) {
            promise.reject("NOT_ENABLED", "Accessibility service not enabled")
            return
        }
        promise.resolve(service.tapAt(x, y))
    }

    @ReactMethod
    fun typeText(text: String, promise: Promise) {
        val service = TangentAccessibilityService.getInstance()
        if (service == null) {
            promise.reject("NOT_ENABLED", "Accessibility service not enabled")
            return
        }
        promise.resolve(service.typeText(text))
    }

    @ReactMethod
    fun scroll(direction: String, promise: Promise) {
        val service = TangentAccessibilityService.getInstance()
        if (service == null) {
            promise.reject("NOT_ENABLED", "Accessibility service not enabled")
            return
        }
        promise.resolve(service.scroll(direction))
    }

    @ReactMethod
    fun pressBack(promise: Promise) {
        val service = TangentAccessibilityService.getInstance()
        if (service == null) {
            promise.reject("NOT_ENABLED", "Accessibility service not enabled")
            return
        }
        promise.resolve(service.pressBack())
    }

    @ReactMethod
    fun pressHome(promise: Promise) {
        val service = TangentAccessibilityService.getInstance()
        if (service == null) {
            promise.reject("NOT_ENABLED", "Accessibility service not enabled")
            return
        }
        promise.resolve(service.pressHome())
    }

    @ReactMethod
    fun openNotifications(promise: Promise) {
        val service = TangentAccessibilityService.getInstance()
        if (service == null) {
            promise.reject("NOT_ENABLED", "Accessibility service not enabled")
            return
        }
        promise.resolve(service.openNotifications())
    }
}