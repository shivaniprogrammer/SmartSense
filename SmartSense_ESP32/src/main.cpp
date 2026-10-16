

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "BluetoothSerial.h"

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled! Enable it in menuconfig.
#endif

BluetoothSerial SerialBT;

// =========================
// PIR SENSOR
// =========================

const int PIR_PIN = 27;

// Remembers that motion happened
volatile bool motionDetected = false;

int lastPirState = LOW;

// PIR interrupt
void IRAM_ATTR pirInterrupt() {
    motionDetected = true;
}


// =========================
// WIFI
// =========================

const char* WIFI_SSID = "SHIVANI HOTSPOT";
const char* WIFI_PASSWORD = "Shivani123";


// =========================
// JAVA BACKEND
const char* SERVER_URL =
    "http://10.199.51.252:8081/sensor-event";// =========================

// =========================
// ABSENCE TRACKING
// =========================

const unsigned long ABSENT_TIMEOUT_MS =
    5UL * 60UL * 1000UL;

const int MAX_DEVICES = 20;


struct TrackedDevice {

    String address;

    unsigned long lastSeenMillis;

    bool absentSent;

    bool inUse;
};


TrackedDevice knownDevices[MAX_DEVICES];


// =========================
// FIND DEVICE
// =========================

int findDeviceIndex(const String& addr) {

    for (int i = 0; i < MAX_DEVICES; i++) {

        if (
            knownDevices[i].inUse &&
            knownDevices[i].address == addr
        ) {

            return i;
        }
    }

    return -1;
}


// =========================
// ADD DEVICE
// =========================

int addDeviceTracking(const String& addr) {

    for (int i = 0; i < MAX_DEVICES; i++) {

        if (!knownDevices[i].inUse) {

            knownDevices[i].address = addr;

            knownDevices[i].lastSeenMillis =
                millis();

            knownDevices[i].absentSent = false;

            knownDevices[i].inUse = true;

            return i;
        }
    }

    Serial.println(
        "WARNING: knownDevices table full, "
        "cannot track new device"
    );

    return -1;
}


// =========================
// SEND STATUS TO JAVA
// =========================

void sendStatus(
    const String& btAddress,
    const char* status
) {

    // Check WiFi
    if (WiFi.status() != WL_CONNECTED) {

        Serial.println(
            "WiFi not connected!"
        );

        return;
    }


    HTTPClient http;


    // Connect to Java server
    http.begin(SERVER_URL);


    // JSON header
    http.addHeader(
        "Content-Type",
        "application/json"
    );


    // Create JSON
    String json =
        "{\"bleId\":\"" +
        btAddress +
        "\",\"status\":\"" +
        status +
        "\"}";


    Serial.print(
        "Sending to server: "
    );

    Serial.println(json);


    // POST request
    int responseCode =
        http.POST(json);


    Serial.print(
        "Server response code: "
    );

    Serial.println(responseCode);


    // Read server response
    if (responseCode > 0) {

        String response =
            http.getString();

        Serial.print(
            "Backend says: "
        );

        Serial.println(response);

    } else {

        Serial.print(
            "HTTP error: "
        );

        Serial.println(responseCode);
    }


    http.end();
}


// =========================
// SEND BLE PRESENT
// =========================

void sendBleId(String btAddress) {

    sendStatus(
        btAddress,
        "present"
    );
}


// =========================
// CHECK ABSENT DEVICES
// =========================

void checkForAbsentDevices() {

    unsigned long now =
        millis();


    for (int i = 0; i < MAX_DEVICES; i++) {

        // Skip unused slots
        if (!knownDevices[i].inUse) {

            continue;
        }


        unsigned long silentFor =
            now -
            knownDevices[i].lastSeenMillis;


        // Device silent for 5 minutes
        if (
            silentFor >= ABSENT_TIMEOUT_MS &&
            !knownDevices[i].absentSent
        ) {

            Serial.print(
                "Device went silent, "
                "marking absent: "
            );

            Serial.println(
                knownDevices[i].address
            );


            sendStatus(
                knownDevices[i].address,
                "absent"
            );


            knownDevices[i].absentSent =
                true;
        }
    }
}


// =========================
// SETUP
// =========================

void setup() {

    // =========================
    // SERIAL
    // =========================

    Serial.begin(115200);

    delay(1000);


    // =========================
    // PIR
    // =========================

    pinMode(
        PIR_PIN,
        INPUT
    );


    attachInterrupt(
        digitalPinToInterrupt(PIR_PIN),
        pirInterrupt,
        RISING
    );


    // =========================
    // INITIALIZE DEVICE TABLE
    // =========================

    for (int i = 0; i < MAX_DEVICES; i++) {

        knownDevices[i].inUse =
            false;
    }


    // =========================
    // STARTUP MESSAGE
    // =========================

    Serial.println(
        "================================"
    );

    Serial.println(
        "       SmartSense ESP32"
    );

    Serial.println(
        "  PIR + Classic Bluetooth + WiFi"
    );

    Serial.println(
        "================================"
    );


    // =========================
    // WIFI
    // =========================

    Serial.println(
        "Connecting to WiFi..."
    );


    WiFi.mode(WIFI_STA);


    WiFi.disconnect(true);

    delay(500);


    WiFi.begin(
        WIFI_SSID,
        WIFI_PASSWORD
    );


    int attempts = 0;


    while (
        WiFi.status() != WL_CONNECTED &&
        attempts < 40
    ) {

        delay(500);

        Serial.print(".");

        attempts++;
    }


    Serial.println();


    if (WiFi.status() == WL_CONNECTED) {

        Serial.println(
            "WiFi connected!"
        );


        Serial.print(
            "ESP32 IP: "
        );


        Serial.println(
            WiFi.localIP()
        );

    } else {

        Serial.println(
            "WiFi connection FAILED!"
        );
    }


    // =========================
    // BLUETOOTH
    // =========================

    SerialBT.begin(
        "SmartSense-ESP32",
        true
    );


    Serial.println(
        "Classic Bluetooth ready!"
    );


    Serial.println(
        "PIR sensor ready!"
    );


    Serial.println(
        "Starting system..."
    );
}


// =========================
// LOOP
// =========================

void loop() {

    // =========================
    // CHECK PIR
    // =========================

    int currentPirState =
        digitalRead(PIR_PIN);


    if (
        currentPirState !=
        lastPirState
    ) {

        // =========================
        // MOTION DETECTED
        // =========================

        if (
            currentPirState == HIGH
        ) {

            Serial.println(
                "Motion DETECTED!"
            );


            // Remember motion
            motionDetected = true;

        }

        // =========================
        // MOTION STOPPED
        // =========================

        else {

            Serial.println(
                "Motion STOPPED"
            );
        }


        lastPirState =
            currentPirState;
    }


    // =========================
    // START BLUETOOTH SCAN
    // =========================

    Serial.println();

    Serial.println(
        "Scanning for Bluetooth devices (10s)..."
    );


    /*
       IMPORTANT:

       We DO NOT reset motionDetected
       before the Bluetooth scan.

       If PIR detects motion before or
       during the scan, the flag stays true.
    */


    BTScanResults* btDeviceList =
        SerialBT.discover(10000);


    // =========================
    // BLUETOOTH RESULTS
    // =========================

    if (btDeviceList) {

        Serial.print(
            "Devices found: "
        );


        Serial.println(
            btDeviceList->getCount()
        );


        // =========================
        // LOOP THROUGH DEVICES
        // =========================

        for (
            int i = 0;
            i < btDeviceList->getCount();
            i++
        ) {

            BTAdvertisedDevice* device =
                btDeviceList->getDevice(i);


            // Get Bluetooth address
            String addr =
                device
                    ->getAddress()
                    .toString()
                    .c_str();


            // =========================
            // PRINT DEVICE
            // =========================

            Serial.print(
                "Found device: "
            );


            Serial.print(addr);


            if (device->haveName()) {

                Serial.print(
                    " | Name: "
                );


                Serial.print(
                    device
                        ->getName()
                        .c_str()
                );
            }


            Serial.println();


            // =========================
            // TRACK DEVICE
            // =========================

            int idx =
                findDeviceIndex(addr);


            if (idx == -1) {

                idx =
                    addDeviceTracking(
                        addr
                    );

            } else {

                knownDevices[idx]
                    .lastSeenMillis =
                    millis();


                knownDevices[idx]
                    .absentSent =
                    false;
            }


            // =========================
            // PIR + BLE ATTENDANCE
            // =========================

            if (motionDetected) {

                Serial.println(
                    "PIR + Bluetooth detected!"
                );


                Serial.print(
                    "Marking PRESENT: "
                );


                Serial.println(
                    addr
                );


                // Send to Java
                sendBleId(addr);


                // Motion event consumed
                motionDetected =
                    false;

            }

            else {

                Serial.println(
                    "Bluetooth detected, "
                    "but no PIR motion."
                );


                Serial.println(
                    "Not sending PRESENT."
                );
            }
        }
    }

    else {

        Serial.println(
            "No devices found this scan."
        );
    }


    // =========================
    // ABSENCE CHECK
    // =========================

    checkForAbsentDevices();


    Serial.println(
        "------------------------------"
    );


    delay(2000);
}