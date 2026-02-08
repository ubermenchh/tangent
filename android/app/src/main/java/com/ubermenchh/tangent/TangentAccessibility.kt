package com.ubermenchh.tangent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

class TangentAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile
        private var instance: TangentAccessibilityService? = null

        fun getInstance(): TangentAccessibilityService? = instance
        fun isRunning(): Boolean = instance != null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this

        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPES_ALL_MASK
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }

    fun getScreenContent(): String {
        return try {
            val root = rootInActiveWindow ?: return """{"error": "No active window"}"""
            
            val result = JSONObject().apply {
                put("packageName", root.packageName?.toString() ?: "unknown")
                put("elements", traverseNode(root, 0))
            }
            root.recycle()
            result.toString()
        } catch (e: Exception) {
            """{"error": "${e.message}"}"""
        }
    }

    private fun traverseNode(node: AccessibilityNodeInfo?, depth: Int): JSONArray {
        val elements = JSONArray()
        if (node == null || depth > 15) return elements

        try {
            val text = node.text?.toString() ?: ""
            val desc = node.contentDescription?.toString() ?: ""
            val className = node.className?.toString() ?: ""
            
            val isInteractive = node.isClickable || node.isScrollable || 
                               node.isEditable || node.isCheckable
            val hasContent = text.isNotEmpty() || desc.isNotEmpty()

            if (isInteractive || hasContent) {
                val bounds = Rect()
                node.getBoundsInScreen(bounds)

                elements.put(JSONObject().apply {
                    put("id", node.viewIdResourceName ?: "")
                    put("class", className.substringAfterLast("."))
                    put("text", text)
                    put("description", desc)
                    put("bounds", "${bounds.left},${bounds.top},${bounds.right},${bounds.bottom}")
                    put("centerX", bounds.centerX())
                    put("centerY", bounds.centerY())
                    put("clickable", node.isClickable)
                    put("scrollable", node.isScrollable)
                    put("editable", node.isEditable)
                    put("enabled", node.isEnabled)
                })
            }

            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { child ->
                    val childElements = traverseNode(child, depth + 1)
                    for (j in 0 until childElements.length()) {
                        elements.put(childElements.get(j))
                    }
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            // Skip problematic nodes
        }

        return elements
    }

    fun tapElement(identifier: String): Boolean {
        val root = rootInActiveWindow ?: return false
        return try {
            val target = findNode(root, identifier)
            val result = target?.performAction(AccessibilityNodeInfo.ACTION_CLICK) ?: false
            target?.recycle()
            root.recycle()
            result
        } catch (e: Exception) {
            root.recycle()
            false
        }
    }

    fun tapAt(x: Int, y: Int): Boolean {
        val path = Path().apply { moveTo(x.toFloat(), y.toFloat()) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 100))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    fun typeText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        return try {
            val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            val result = if (focused?.isEditable == true) {
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
                }
                focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            } else false
            focused?.recycle()
            root.recycle()
            result
        } catch (e: Exception) {
            root.recycle()
            false
        }
    }

    fun scroll(direction: String): Boolean {
        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels
        val screenHeight = displayMetrics.heightPixels
    
        val centerX = screenWidth / 2f
    
        val startY: Float
        val endY: Float
    
        when (direction) {
            "down", "forward" -> {
                startY = screenHeight * 0.7f
                endY = screenHeight * 0.3f
            }
            "up", "backward" -> {
                startY = screenHeight * 0.3f
                endY = screenHeight * 0.7f
            }
            else -> return false
        }
    
        val path = Path().apply {
            moveTo(centerX, startY)
            lineTo(centerX, endY)
        }
    
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 300))
            .build()
    
        return dispatchGesture(gesture, null, null)
    }

    fun pressBack(): Boolean = performGlobalAction(GLOBAL_ACTION_BACK)
    fun pressHome(): Boolean = performGlobalAction(GLOBAL_ACTION_HOME)
    fun openRecents(): Boolean = performGlobalAction(GLOBAL_ACTION_RECENTS)
    fun openNotifications(): Boolean = performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)

    private fun findNode(root: AccessibilityNodeInfo, identifier: String): AccessibilityNodeInfo? {
        val search = identifier.lowercase()
        
        val text = root.text?.toString()?.lowercase() ?: ""
        val desc = root.contentDescription?.toString()?.lowercase() ?: ""
        val id = root.viewIdResourceName?.lowercase() ?: ""

        if (text.contains(search) || desc.contains(search) || id.contains(search)) {
            return AccessibilityNodeInfo.obtain(root)
        }

        for (i in 0 until root.childCount) {
            root.getChild(i)?.let { child ->
                val result = findNode(child, identifier)
                child.recycle()
                if (result != null) return result
            }
        }
        return null
    }

    private fun findScrollable(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isScrollable) return AccessibilityNodeInfo.obtain(node)

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                val result = findScrollable(child)
                child.recycle()
                if (result != null) return result
            }
        }
        return null
    }
}