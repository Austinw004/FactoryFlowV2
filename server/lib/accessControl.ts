// server/lib/accessControl.ts

export type Role = "viewer" | "analyst" | "operator" | "admin";

export function requireRole(userRole: Role, required: Role) {
  const hierarchy = ["viewer", "analyst", "operator", "admin"];
  if (hierarchy.indexOf(userRole) < hierarchy.indexOf(required)) {
    throw new Error("ACCESS_DENIED");
  }
}

// Example usage:
// requireRole(user.role, "operator");
