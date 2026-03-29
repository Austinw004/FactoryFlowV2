export function enforceTrust(trustScore: number) {
  if (trustScore < 0.4) {
    throw new Error("LOW_TRUST_BLOCKED_DECISION");
  }

  if (trustScore < 0.6) {
    return {
      automationBlocked: true,
      requiresApproval: true,
    };
  }

  return {
    automationBlocked: false,
    requiresApproval: false,
  };
}
