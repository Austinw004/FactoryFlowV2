import { randomUUID } from "crypto";

export function buildDecisionTrace(input: {
  recommendation: any;
  trustScore: number;
  evidence: any;
}) {
  return {
    ...input,
    traceId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
