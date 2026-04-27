// Real sensor ingest service.
//
// Customers POST sensor readings here from their PLC bridge / MQTT broker /
// OPC-UA bridge / edge gateway. We authenticate via the per-company API
// key (companies.api_key), validate the payload, run real anomaly detection
// from anomalyDetection.ts, persist the reading, and create alerts +
// predictions when warranted.
//
// Auth: customer sends `Authorization: Bearer <company-api-key>` OR
//       `X-Api-Key: <company-api-key>` header. We look up the company by
//       the key and scope all writes to that company.
//
// Rate limiting: ingest is hot — many sensors at high frequency. We accept
// batched payloads (up to MAX_BATCH readings per request) so a customer
// edge gateway can bundle 1000 readings/minute into a few requests instead
// of 1000.
//
// Idempotency: the customer can include `clientReadingId` per reading; we
// dedupe inside a single request batch (same clientReadingId twice in the
// batch is rejected). Cross-request dedupe is the customer's responsibility
// for now — most edge bridges already maintain ack state.

import { z } from "zod";
import { db } from "../db";
import {
  companies,
  equipmentSensors,
  sensorReadings,
  maintenanceAlerts,
  maintenancePredictions,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  evaluateReading,
  estimateHoursToThreshold,
  type Severity,
} from "./anomalyDetection";

export const MAX_BATCH = 1000;

// Single reading the customer sends.
export const sensorReadingInputSchema = z.object({
  // Customer-side sensor identifier. We map this to equipmentSensors.sensorId
  // (the external IoT sensor identifier the customer registered). Required.
  sensorExternalId: z.string().min(1).max(200),
  // Numeric reading, typically a single scalar (temperature, vibration RMS,
  // pressure, current draw, etc.). Vector signals (e.g. spectrum) are out
  // of scope for this baseline endpoint.
  value: z.number().finite(),
  // ISO 8601 timestamp when the reading was taken at the sensor. If absent
  // we use server-receipt time, but we strongly recommend the customer send
  // it — wall-clock skew on a PLC is typically modest and the chronology
  // matters for the rolling-z-score window.
  timestamp: z.string().datetime().optional(),
  // Free-form metadata pass-through (units, sensor firmware version,
  // operator shift, etc.). Stored as-is in the reading row.
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Customer-side dedupe key, optional.
  clientReadingId: z.string().max(120).optional(),
});

export const sensorIngestBodySchema = z.object({
  readings: z.array(sensorReadingInputSchema).min(1).max(MAX_BATCH),
});

export type SensorReadingInput = z.infer<typeof sensorReadingInputSchema>;

export interface IngestResult {
  acceptedCount: number;
  rejectedCount: number;
  alertsCreated: number;
  predictionsCreated: number;
  rejected: Array<{ index: number; reason: string }>;
}

// Authenticate by API key and return the company id, or null.
export async function authenticateByApiKey(rawKey: string | undefined): Promise<string | null> {
  if (!rawKey || typeof rawKey !== "string") return null;
  const key = rawKey.replace(/^Bearer\s+/i, "").trim();
  if (key.length < 16) return null; // sanity floor — real keys are 32+ chars
  const [row] = await db
    .select({ id: companies.id, apiAccessEnabled: companies.apiAccessEnabled })
    .from(companies)
    .where(eq(companies.apiKey, key))
    .limit(1);
  if (!row) return null;
  if (row.apiAccessEnabled !== 1) return null; // company hasn't enabled API
  return row.id;
}

// Process a batch and return a structured result. All writes are scoped to
// `companyId`; rows on sensors that don't belong to this company are
// rejected.
export async function ingestSensorBatch(
  companyId: string,
  body: z.infer<typeof sensorIngestBodySchema>,
): Promise<IngestResult> {
  const result: IngestResult = {
    acceptedCount: 0,
    rejectedCount: 0,
    alertsCreated: 0,
    predictionsCreated: 0,
    rejected: [],
  };

  // Resolve all referenced sensors in one query — saves N round-trips.
  const externalIds = Array.from(new Set(body.readings.map(r => r.sensorExternalId)));
  const sensorRows = await db
    .select()
    .from(equipmentSensors)
    .where(and(
      eq(equipmentSensors.companyId, companyId),
      // Drizzle doesn't have a typed inArray import here in the snippet, use a
      // simple in-memory filter against the query result. For large fleets we
      // can swap to inArray with the proper import. The query plan still
      // benefits from the companyId index.
    ));
  const sensorByExternal = new Map<string, (typeof sensorRows)[number]>();
  for (const s of sensorRows) {
    if (externalIds.includes(s.sensorId)) sensorByExternal.set(s.sensorId, s);
  }

  // Per-sensor rolling window. We pull the last 60 readings per sensor once,
  // then update an in-memory copy as we process the batch — avoids a query
  // per reading when ingesting big batches.
  const windowBySensorPk = new Map<string, { values: number[]; timestamps: Date[] }>();
  for (const [, s] of sensorByExternal) {
    const recent = await db
      .select({ value: sensorReadings.value, timestamp: sensorReadings.timestamp })
      .from(sensorReadings)
      .where(eq(sensorReadings.sensorId, s.id))
      .orderBy(desc(sensorReadings.timestamp))
      .limit(60);
    // Reverse to chronological order.
    const ordered = recent.slice().reverse();
    windowBySensorPk.set(s.id, {
      values: ordered.map(r => r.value),
      timestamps: ordered.map(r => r.timestamp),
    });
  }

  const seenClientIds = new Set<string>();

  for (let i = 0; i < body.readings.length; i++) {
    const r = body.readings[i];

    if (r.clientReadingId) {
      if (seenClientIds.has(r.clientReadingId)) {
        result.rejectedCount++;
        result.rejected.push({ index: i, reason: "duplicate clientReadingId in batch" });
        continue;
      }
      seenClientIds.add(r.clientReadingId);
    }

    const sensor = sensorByExternal.get(r.sensorExternalId);
    if (!sensor) {
      result.rejectedCount++;
      result.rejected.push({
        index: i,
        reason: `sensor not registered: ${r.sensorExternalId}`,
      });
      continue;
    }

    const ts = r.timestamp ? new Date(r.timestamp) : new Date();
    if (Number.isNaN(ts.getTime())) {
      result.rejectedCount++;
      result.rejected.push({ index: i, reason: "invalid timestamp" });
      continue;
    }

    const window = windowBySensorPk.get(sensor.id) ?? { values: [], timestamps: [] };
    const evalResult = evaluateReading(r.value, {
      thresholds: {
        normalMin: sensor.normalMin,
        normalMax: sensor.normalMax,
        warningMin: sensor.warningMin,
        warningMax: sensor.warningMax,
        criticalMin: sensor.criticalMin,
        criticalMax: sensor.criticalMax,
      },
      recentValues: window.values,
    });

    // Persist the reading.
    await db.insert(sensorReadings).values({
      sensorId: sensor.id,
      value: r.value,
      status: evalResult.status,
      timestamp: ts,
      metadata: r.metadata ?? null,
    });

    // Update the in-memory window so the next reading in this batch sees it.
    window.values.push(r.value);
    window.timestamps.push(ts);
    if (window.values.length > 60) {
      window.values.shift();
      window.timestamps.shift();
    }
    windowBySensorPk.set(sensor.id, window);

    // Update the sensor's last-communication timestamp (cheap and useful for
    // showing "sensor offline" state in the UI).
    await db
      .update(equipmentSensors)
      .set({ lastCommunication: ts, updatedAt: new Date() })
      .where(eq(equipmentSensors.id, sensor.id));

    // Critical → alert + prediction.
    if (evalResult.status === "critical") {
      await db.insert(maintenanceAlerts).values({
        companyId,
        machineryId: sensor.machineryId,
        alertType: "anomaly_detected",
        severity: "high",
        title: `Critical ${sensor.sensorType} reading on ${sensor.location}`,
        description: evalResult.reasons.join("; "),
        affectedSensors: [sensor.id],
        status: "active",
      });
      result.alertsCreated++;

      // Project a coarse RUL estimate from the rolling window so the
      // operator sees a "by when" rather than just an alert.
      const rul = estimateHoursToThreshold({
        recentValues: window.values,
        recentTimestamps: window.timestamps,
        thresholds: {
          normalMin: sensor.normalMin,
          normalMax: sensor.normalMax,
          warningMin: sensor.warningMin,
          warningMax: sensor.warningMax,
          criticalMin: sensor.criticalMin,
          criticalMax: sensor.criticalMax,
        },
      });

      const predictedDate = rul.hoursToThreshold !== null
        ? new Date(Date.now() + rul.hoursToThreshold * 3_600_000)
        : new Date(Date.now() + 24 * 3_600_000); // fallback: 24h horizon

      await db.insert(maintenancePredictions).values({
        companyId,
        machineryId: sensor.machineryId,
        predictionType: "failure",
        failureMode: `${sensor.sensorType}_anomaly`,
        predictedDate,
        confidence: evalResult.confidence,
        timeToFailure: rul.hoursToThreshold,
        // Methodology kept neutral — never expose the algorithm internals
        // here. "statistical_v1" is informative enough for operations.
        mlModel: "statistical_v1",
      });
      result.predictionsCreated++;
    }

    result.acceptedCount++;
  }

  return result;
}
