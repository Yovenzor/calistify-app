package app.calistify.mobile

import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Metadata
import androidx.health.connect.client.records.StepsRecord
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.ZoneId
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * CALISTIFY's local Capacitor plugin for Health Connect.
 *
 * `requestAccess` opens the REAL Health Connect permission screen, `checkAccess`
 * reports the current grant/revocation state without any UI, and `writeWorkout`
 * saves a finished workout as a Health Connect exercise session.
 */
@CapacitorPlugin(name = "CalistifyHealth")
class CalistifyHealthPlugin : Plugin() {

    private val pluginScope = CoroutineScope(
        SupervisorJob() + Dispatchers.Main.immediate +
            CoroutineExceptionHandler { _, throwable ->
                Log.e(TAG, "CalistifyHealth failure", throwable)
            },
    )

    private val permissionContract = PermissionController.createRequestPermissionResultContract()

    @PluginMethod
    fun requestAccess(call: PluginCall) {
        pluginScope.launch {
            try {
                val status = HealthConnectClient.getSdkStatus(context)
                if (status == HealthConnectClient.SDK_UNAVAILABLE) {
                    call.reject("Health Connect is not available on this device", "UNAVAILABLE")
                    return@launch
                }
                if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                    call.reject("Health Connect needs to be installed or updated", "NOT_INSTALLED")
                    return@launch
                }

                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                if (granted.containsAll(ALL_PERMISSIONS)) {
                    resolveStatus(call, client)
                    return@launch
                }

                val intent = permissionContract.createIntent(context, ALL_PERMISSIONS)
                startActivityForResult(this@CalistifyHealthPlugin, intent, "handleAccessResult")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "requestAccess failed", e)
                call.reject("Could not open the Health Connect permission screen", "UNAVAILABLE", e)
            }
        }
    }

    @ActivityCallback
    private fun handleAccessResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        pluginScope.launch {
            try {
                resolveStatus(call, HealthConnectClient.getOrCreate(context))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "handleAccessResult failed", e)
                call.reject("Could not read Health Connect permissions", "UNAVAILABLE", e)
            }
        }
    }

    @PluginMethod
    fun checkAccess(call: PluginCall) {
        pluginScope.launch {
            try {
                val status = HealthConnectClient.getSdkStatus(context)
                if (status != HealthConnectClient.SDK_AVAILABLE) {
                    call.reject("Health Connect is not available", "UNAVAILABLE")
                    return@launch
                }
                resolveStatus(call, HealthConnectClient.getOrCreate(context))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "checkAccess failed", e)
                call.reject("Could not read Health Connect permissions", "UNAVAILABLE", e)
            }
        }
    }

    @PluginMethod
    fun writeWorkout(call: PluginCall) {
        val startString = call.getString("startDate")
        val endString = call.getString("endDate")
        if (startString == null || endString == null) {
            call.reject("startDate and endDate are required", "BAD_ARGS")
            return
        }

        val start: Instant
        val end: Instant
        try {
            start = Instant.parse(startString)
            end = Instant.parse(endString)
        } catch (e: Exception) {
            call.reject("startDate and endDate must be ISO 8601 timestamps", "BAD_ARGS", e)
            return
        }
        if (!start.isBefore(end)) {
            call.reject("endDate must be after startDate", "BAD_ARGS")
            return
        }

        val title = call.getString("title") ?: "Workout"

        pluginScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val zone = ZoneId.systemDefault()
                val session = ExerciseSessionRecord(
                    startTime = start,
                    startZoneOffset = start.atZone(zone).offset,
                    endTime = end,
                    endZoneOffset = end.atZone(zone).offset,
                    metadata = Metadata.manualEntry(),
                    exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS,
                    title = title,
                )
                client.insertRecords(listOf(session))
                val result = JSObject()
                result.put("ok", true)
                call.resolve(result)
            } catch (e: SecurityException) {
                call.reject("Workout access has not been granted", "NOT_AUTHORIZED", e)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "writeWorkout failed", e)
                call.reject("Could not save the workout to Health Connect", "WRITE_FAILED", e)
            }
        }
    }

    /** Reports granted/denied state for exactly the types CALISTIFY uses. */
    private suspend fun resolveStatus(call: PluginCall, client: HealthConnectClient) {
        val granted = client.permissionController.getGrantedPermissions()

        val readAuthorized = JSArray()
        val readDenied = JSArray()
        for ((identifier, permission) in READ_PERMISSIONS) {
            if (granted.contains(permission)) readAuthorized.put(identifier) else readDenied.put(identifier)
        }

        val writeAuthorized = JSArray()
        val writeDenied = JSArray()
        if (granted.contains(HealthPermission.getWritePermission(ExerciseSessionRecord::class))) {
            writeAuthorized.put("workouts")
        } else {
            writeDenied.put("workouts")
        }

        val result = JSObject()
        result.put("readAuthorized", readAuthorized)
        result.put("readDenied", readDenied)
        result.put("writeAuthorized", writeAuthorized)
        result.put("writeDenied", writeDenied)
        result.put("requested", true)
        call.resolve(result)
    }

    companion object {
        private const val TAG = "CalistifyHealth"

        /** Exactly what the app uses: read today's activity, save workouts. */
        private val READ_PERMISSIONS = listOf(
            "steps" to HealthPermission.getReadPermission(StepsRecord::class),
            "calories" to HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            "workouts" to HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        )

        private val ALL_PERMISSIONS: Set<String> = buildSet {
            READ_PERMISSIONS.forEach { add(it.second) }
            add(HealthPermission.getWritePermission(ExerciseSessionRecord::class))
        }
    }
}
