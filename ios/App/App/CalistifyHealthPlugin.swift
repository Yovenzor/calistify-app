import Capacitor
import HealthKit

/// CALISTIFY's local Capacitor plugin for Apple Health.
///
/// This talks directly to HealthKit, so `requestAccess` presents the REAL
/// Apple Health permission screen (never a web mock), `checkAccess` reports
/// the current grant/revocation state without prompting, and `writeWorkout`
/// saves a finished workout as a HealthKit workout session.
@objc(CalistifyHealthPlugin)
public class CalistifyHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CalistifyHealthPlugin"
    public let jsName = "CalistifyHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeWorkout", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    /// The only data CALISTIFY touches: steps, active energy and workouts
    /// (read), plus writing the workouts the user finishes (share).
    private var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]
        if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) {
            types.insert(steps)
        }
        if let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            types.insert(energy)
        }
        return types
    }

    private var writeTypes: Set<HKSampleType> {
        [HKObjectType.workoutType()]
    }

    /// Presents the native Apple Health permission screen.
    @objc func requestAccess(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device", "UNAVAILABLE")
            return
        }
        healthStore.requestAuthorization(toShare: writeTypes, read: readTypes) { [weak self] _, error in
            guard let self = self else { return }
            if let error = error {
                call.reject(error.localizedDescription, "REQUEST_FAILED", error)
                return
            }
            self.resolveStatus(call)
        }
    }

    /// Reports the current authorization state without showing any UI.
    @objc func checkAccess(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device", "UNAVAILABLE")
            return
        }
        resolveStatus(call)
    }

    /// Saves a finished workout as a HealthKit workout session.
    @objc func writeWorkout(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device", "UNAVAILABLE")
            return
        }
        guard
            let startString = call.getString("startDate"),
            let endString = call.getString("endDate"),
            let start = ISO8601DateFormatter().date(from: startString),
            let end = ISO8601DateFormatter().date(from: endString),
            end.timeIntervalSince(start) > 0
        else {
            call.reject("startDate and endDate are required", "BAD_ARGS")
            return
        }

        let writeStatus = healthStore.authorizationStatus(for: HKObjectType.workoutType())
        guard writeStatus == .sharingAuthorized else {
            call.reject("Workout access has not been granted", "NOT_AUTHORIZED")
            return
        }

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .functionalStrengthTraining
        configuration.locationType = .indoor

        let builder = HKWorkoutBuilder(healthStore: healthStore, configuration: configuration, device: .local())
        builder.beginCollection(withStart: start) { success, error in
            guard success else {
                call.reject(error?.localizedDescription ?? "Could not start the workout", "WRITE_FAILED", error)
                return
            }
            builder.endCollection(withEnd: end) { success, error in
                guard success else {
                    call.reject(error?.localizedDescription ?? "Could not finish the workout", "WRITE_FAILED", error)
                    return
                }
                builder.finishWorkout { workout, error in
                    if let error = error {
                        call.reject(error.localizedDescription, "WRITE_FAILED", error)
                        return
                    }
                    guard workout != nil else {
                        call.reject("HealthKit did not return the saved workout", "WRITE_FAILED")
                        return
                    }
                    call.resolve(["ok": true])
                }
            }
        }
    }

    /// Apple does not expose per-type READ authorization to third-party apps,
    /// but the workout WRITE status is exact and reflects changes the user
    /// makes later in the Health app — so it is the connection signal. Reads
    /// are reported as granted only once workout access is granted; otherwise
    /// everything is reported as denied and the UI must never claim to be
    /// connected.
    private func resolveStatus(_ call: CAPPluginCall) {
        let writeStatus = healthStore.authorizationStatus(for: HKObjectType.workoutType())
        healthStore.getRequestStatusForAuthorization(toShare: writeTypes, read: readTypes) { requestStatus, _ in
            let asked = requestStatus == .unnecessary
            let writeGranted = writeStatus == .sharingAuthorized

            let readAuthorized = writeGranted ? ["steps", "calories", "workouts"] : []
            let readDenied = writeGranted ? [] : ["steps", "calories", "workouts"]
            let writeAuthorized = writeGranted ? ["workouts"] : []
            let writeDenied = writeGranted ? [] : ["workouts"]

            call.resolve([
                "readAuthorized": readAuthorized,
                "readDenied": readDenied,
                "writeAuthorized": writeAuthorized,
                "writeDenied": writeDenied,
                // .unnecessary means a permission request covering these
                // types has already been shown once.
                "requested": asked,
            ])
        }
    }
}

/// Hosts the Capacitor bridge and registers CALISTIFY's local health plugin
/// (local plugins are not discovered through packageClassList, so they are
/// registered here exactly as documented by Capacitor).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CalistifyHealthPlugin())
    }
}
