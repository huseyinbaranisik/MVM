package expo.modules.mvmsteps

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Telefonun donanım adım sayacı (TYPE_STEP_COUNTER): son açılıştan beri toplam adım. Uygulama kapalıyken de
 * sayar; uygulama açılınca okunur ve önceki okumayla farkı alınır. Sensör yoksa ya da 4 sn içinde değer gelmezse null.
 */
class MvmStepsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MvmSteps")

    AsyncFunction("readStepCounter") { promise: Promise ->
      val ctx = appContext.reactContext
      val sm = ctx?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      val sensor = sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (sm == null || sensor == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      var done = false
      val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
          if (done) return
          done = true
          sm.unregisterListener(this)
          promise.resolve(mapOf(
            "steps" to event.values[0].toDouble(),
            "bootTime" to (System.currentTimeMillis() - SystemClock.elapsedRealtime()).toDouble(),
          ))
        }

        override fun onAccuracyChanged(s: Sensor?, accuracy: Int) {}
      }
      sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
      Handler(Looper.getMainLooper()).postDelayed({
        if (!done) {
          done = true
          sm.unregisterListener(listener)
          promise.resolve(null)
        }
      }, 4000)
    }
  }
}
