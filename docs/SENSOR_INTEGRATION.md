# Sensor Integration Guide

Prescient Labs ingests real sensor telemetry from your factory floor and runs it through statistical anomaly detection in real time. There are three supported paths to get readings to us. Pick the one that matches the protocol your equipment already speaks.

| Protocol you have on the plant floor | Recommended bridge | Latency | Setup time |
|---|---|---|---|
| OPC-UA (most modern PLCs) | OPC-UA → MQTT → REST bridge | seconds | 1-3 days |
| MQTT / Sparkplug B (IIoT brokers) | MQTT → REST bridge | seconds | half-day |
| Modbus / proprietary RTU | Edge gateway with REST output | seconds | 2-5 days |
| Lab / one-off / CSV exports | Direct REST POST | minute-batch | 1 hour |

All three paths terminate at the same authenticated REST endpoint:

```
POST https://prescient-labs.com/api/sensors/ingest
```

The differences are in what runs upstream of that endpoint on your side.

---

## 1. Authentication

Every request must include your company's API key in one of two headers:

```
Authorization: Bearer <your-api-key>
```

*or*

```
X-Api-Key: <your-api-key>
```

Generate or rotate your key in **Settings → Integrations → API Access**. The key authenticates the *company*, not a user; it scopes all writes to your tenant. Treat it like a database password — don't commit it, store it in your edge gateway's secret store (HashiCorp Vault, AWS SSM, Azure Key Vault, etc.).

You can verify connectivity without writing data:

```
GET https://prescient-labs.com/api/sensors/ingest/health
Authorization: Bearer <your-api-key>
```

`200 { ok: true }` = key works. `401 { ok: false }` = key invalid or API access disabled for your company.

---

## 2. Register your sensors first

Before posting readings, register the sensors in the Prescient UI under **Operations → Machinery → Sensors**, or via the management API. Each sensor has:

- `sensorId` — your external identifier. Whatever your PLC tag, MQTT topic suffix, or asset code is. **This is the value you will send as `sensorExternalId` in every reading.**
- `sensorType` — one of `vibration`, `temperature`, `pressure`, `current`, `flow`, `acoustic` (more added over time)
- `unit` — the unit you'll be sending (`celsius`, `psi`, `amps`, etc.)
- `normalMin` / `normalMax` — your operating range. Required for the anomaly detector to do anything useful. Without these, every reading registers as "normal."
- `warningMin` / `warningMax` / `criticalMin` / `criticalMax` — escalation bands. Optional but recommended; the system uses them to choose alert severity.
- `location` — text label for where on the asset (e.g. `bearing`, `pump-discharge`, `motor`).

Until a sensor is registered, readings posted with its `sensorExternalId` are rejected with `sensor not registered`.

---

## 3. POST a reading batch

```
POST /api/sensors/ingest
Content-Type: application/json
Authorization: Bearer <your-api-key>

{
  "readings": [
    {
      "sensorExternalId": "PLC-LINE3-PUMP12-VIB",
      "value": 4.21,
      "timestamp": "2026-04-26T17:14:02.117Z",
      "metadata": {
        "shift": "B",
        "firmware": "1.4.2"
      },
      "clientReadingId": "edge-gw-7a3f-118"
    }
  ]
}
```

Response:

```
200 OK
{
  "acceptedCount": 1,
  "rejectedCount": 0,
  "alertsCreated": 0,
  "predictionsCreated": 0,
  "rejected": []
}
```

### Field reference

| Field | Required | Notes |
|---|---|---|
| `sensorExternalId` | yes | Must match a registered sensor's `sensorId`. |
| `value` | yes | Single numeric reading. Vector / spectrum signals not yet supported. |
| `timestamp` | recommended | ISO 8601. Defaults to server-receipt time if omitted, but accuracy of the rolling-z-score window depends on real timestamps. |
| `metadata` | no | Free-form JSON object stored alongside the reading. Useful for shift, operator, firmware version, etc. |
| `clientReadingId` | no | Customer-side dedupe key. We dedupe duplicates within the same batch; cross-batch dedupe is your bridge's responsibility. |

### Limits

- **Max 1,000 readings per request.** Larger payloads return `413 BATCH_TOO_LARGE`.
- **Soft rate limit: 60 requests / minute / company.** That's up to 60,000 readings/minute. Above that you'll see `429 RATE_LIMITED` with a `Retry-After` header. Contact us if you need higher.
- **Synchronous response**, so your bridge knows immediately whether each reading was accepted.

---

## 4. Bridge recipes

### MQTT → REST bridge (recommended for most factories)

If your sensors already publish to an MQTT broker (Mosquitto, HiveMQ, AWS IoT, etc.), the simplest bridge is a small Node/Python service that subscribes to the topics, batches readings, and posts to `/api/sensors/ingest`. Skeleton in Node:

```js
import mqtt from "mqtt";

const PRESCIENT_KEY = process.env.PRESCIENT_API_KEY;
const PRESCIENT_URL = "https://prescient-labs.com/api/sensors/ingest";
const FLUSH_MS = 5000;
const MAX_BATCH = 500;

const client = mqtt.connect(process.env.MQTT_URL);
const buffer = [];

client.on("connect", () => client.subscribe("factory/+/+/sensor/+"));

client.on("message", (topic, payload) => {
  const value = Number(payload.toString());
  const externalId = topic; // or however you map topic → sensor id
  buffer.push({
    sensorExternalId: externalId,
    value,
    timestamp: new Date().toISOString(),
  });
});

setInterval(async () => {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, MAX_BATCH);
  await fetch(PRESCIENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PRESCIENT_KEY}`,
    },
    body: JSON.stringify({ readings: batch }),
  });
}, FLUSH_MS);
```

### OPC-UA → REST bridge

For modern PLCs that expose OPC-UA, the same pattern works with a thin OPC-UA client (Node's `node-opcua` package, Python's `asyncua`). Subscribe to the OPC-UA nodes corresponding to your sensors, map node-id to `sensorExternalId`, and batch-post.

Many customers run an existing edge gateway (Tulip, HighByte Intelligence Hub, Cognite, Litmus, Ignition with a script module) that can already do "OPC-UA in, REST out" with minimal config. Point its REST output at `https://prescient-labs.com/api/sensors/ingest` and you're done.

### Modbus / serial / proprietary

You'll need an edge gateway in the middle (Moxa, Advantech, custom Linux box). Most run Node-RED; a single function node assembling a `{readings: [...]}` payload and an `http request` node hitting our endpoint is sufficient.

### Direct CSV upload (lab / one-off)

For trial pilots before the bridge is in place, you can convert a CSV to the JSON shape and POST it directly. We recommend this only for backfill / pilot validation, not steady-state operation.

---

## 5. What happens to the data

Each accepted reading is:

1. Persisted to `sensor_readings` with the original timestamp and metadata.
2. Evaluated against the static thresholds you configured on the sensor.
3. Scored against a 60-reading rolling z-score window for drift detection.
4. If `critical`, an alert is created and a coarse remaining-useful-life estimate is computed via linear extrapolation against the threshold the trend is approaching.

The detection methodology is intentionally transparent — see `server/lib/anomalyDetection.ts` for the source. Specific calibration constants stay server-side.

---

## 6. Common rejection reasons

| `reason` | What it means |
|---|---|
| `sensor not registered: <id>` | Register the sensor first, then retry. |
| `invalid timestamp` | Send ISO 8601, e.g. `2026-04-26T17:14:02.117Z`. |
| `duplicate clientReadingId in batch` | Two readings in the same batch with the same `clientReadingId`. |

For 401/413/429 see the "Limits" and "Authentication" sections above.

---

## 7. Support

Email `support@prescient-labs.com` with your bridge's logs, the request payload, and the response body. Do not include your API key in support tickets — rotate it via Settings if you suspect leakage.
