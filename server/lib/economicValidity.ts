export function assertEconomicValidity(input: any) {
  if (!input) throw new Error("INVALID_INPUT");

  for (const key in input) {
    const val = input[key];

    if (val === null || val === undefined || Number.isNaN(val)) {
      throw new Error(`INVALID_FIELD_${key}`);
    }

    if (typeof val === "number" && !Number.isFinite(val)) {
      throw new Error(`NON_FINITE_${key}`);
    }
  }
}
