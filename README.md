# SmartSense 
## BLE Device Identification

SmartSense identifies students via their phone's Bluetooth MAC address,
used as a unique `bleId` per student.

### Why MAC address (not a companion app)
A dedicated mobile app broadcasting a custom BLE signal would be more
robust, but is a separate app-development project on its own. Using the
phone's existing Bluetooth MAC address requires no new app — students
enroll once via the web dashboard (`ble-enroll.html`), and the ESP32
reads MAC addresses directly during its BLE scan.

### Known limitation: MAC address randomization
Modern phones can randomize their Bluetooth MAC address for privacy,
which would break matching over time if enabled.

- **Android:** Most phones allow disabling "Private address" / "Use
  random MAC" per paired connection, under Bluetooth device settings.
  Students are guided through this during enrollment.
- **iPhone:** iOS does not allow disabling MAC randomization for
  general Bluetooth use. iPhone users may see inconsistent automatic
  detection. Fallback: teacher manual override via
  `POST /api/attendance/manual`.

### Enrollment flow
1. Student logs in and opens `ble-enroll.html`
2. Finds their Bluetooth MAC address (in-page instructions per platform)
3. Submits it via `POST /api/students/enroll/ble`
4. ESP32 later matches detected MAC addresses against enrolled students
   via `POST /api/attendance/checkin/ble`