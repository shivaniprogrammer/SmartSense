package com.smartsense.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "sensorevents")
public class SensorEvent {

    @Id
    private String id;

    private boolean motionDetected;
    private boolean doorOpen;
    private String deviceId;

    private Instant receivedAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public boolean isMotionDetected() { return motionDetected; }
    public void setMotionDetected(boolean motionDetected) { this.motionDetected = motionDetected; }

    public boolean isDoorOpen() { return doorOpen; }
    public void setDoorOpen(boolean doorOpen) { this.doorOpen = doorOpen; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }
}
