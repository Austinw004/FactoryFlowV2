import { createHash } from "crypto";

export function buildEvidenceBundle(input: {
  entityIds: string[];
  queryTimestamp: string;
  rowCount: number;
  version: string;
}) {
  if (!input.entityIds || input.entityIds.length === 0) {
    throw new Error("MISSING_EVIDENCE");
  }

  return {
    ...input,
    hash: createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex"),
  };
}
