import { db } from "@db";
import { permissions, roles, rolePermissions, userRoleAssignments } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Permission definitions organized by category
export const PERMISSIONS = {
  // Forecasting & Demand Planning
  VIEW_FORECAST: "view_forecast",
  EDIT_FORECAST: "edit_forecast",
  APPROVE_FORECAST: "approve_forecast",
  
  // Procurement & Suppliers
  VIEW_PROCUREMENT: "view_procurement",
  EDIT_PROCUREMENT: "edit_procurement",
  APPROVE_PROCUREMENT: "approve_procurement",
  VIEW_SUPPLIERS: "view_suppliers",
  EDIT_SUPPLIERS: "edit_suppliers",
  
  // Materials & Inventory
  VIEW_MATERIALS: "view_materials",
  EDIT_MATERIALS: "edit_materials",
  VIEW_INVENTORY: "view_inventory",
  
  // Production & SKUs
  VIEW_SKUS: "view_skus",
  EDIT_SKUS: "edit_skus",
  VIEW_PRODUCTION: "view_production",
  EDIT_PRODUCTION: "edit_production",
  
  // Allocations
  VIEW_ALLOCATIONS: "view_allocations",
  RUN_ALLOCATIONS: "run_allocations",
  APPROVE_ALLOCATIONS: "approve_allocations",
  
  // Financials
  VIEW_FINANCIALS: "view_financials",
  EDIT_BUDGET: "edit_budget",
  VIEW_COSTS: "view_costs",
  
  // Administration
  MANAGE_USERS: "manage_users",
  MANAGE_ROLES: "manage_roles",
  MANAGE_COMPANY_SETTINGS: "manage_company_settings",
  MANAGE_INTEGRATIONS: "manage_integrations",
  VIEW_AUDIT_LOGS: "view_audit_logs",
  
  // Data Management
  IMPORT_DATA: "import_data",
  EXPORT_DATA: "export_data",
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Permission metadata for UI
export const PERMISSION_METADATA: Record<PermissionName, { description: string; category: string }> = {
  [PERMISSIONS.VIEW_FORECAST]: { description: "View demand forecasts", category: "Forecasting" },
  [PERMISSIONS.EDIT_FORECAST]: { description: "Edit and adjust forecasts", category: "Forecasting" },
  [PERMISSIONS.APPROVE_FORECAST]: { description: "Approve forecast changes", category: "Forecasting" },
  
  [PERMISSIONS.VIEW_PROCUREMENT]: { description: "View procurement data", category: "Procurement" },
  [PERMISSIONS.EDIT_PROCUREMENT]: { description: "Create and edit purchase orders", category: "Procurement" },
  [PERMISSIONS.APPROVE_PROCUREMENT]: { description: "Approve purchase orders", category: "Procurement" },
  [PERMISSIONS.VIEW_SUPPLIERS]: { description: "View supplier information", category: "Procurement" },
  [PERMISSIONS.EDIT_SUPPLIERS]: { description: "Add and edit suppliers", category: "Procurement" },
  
  [PERMISSIONS.VIEW_MATERIALS]: { description: "View materials catalog", category: "Materials" },
  [PERMISSIONS.EDIT_MATERIALS]: { description: "Add and edit materials", category: "Materials" },
  [PERMISSIONS.VIEW_INVENTORY]: { description: "View inventory levels", category: "Materials" },
  
  [PERMISSIONS.VIEW_SKUS]: { description: "View SKUs and products", category: "Production" },
  [PERMISSIONS.EDIT_SKUS]: { description: "Add and edit SKUs", category: "Production" },
  [PERMISSIONS.VIEW_PRODUCTION]: { description: "View production data", category: "Production" },
  [PERMISSIONS.EDIT_PRODUCTION]: { description: "Edit production runs", category: "Production" },
  
  [PERMISSIONS.VIEW_ALLOCATIONS]: { description: "View allocation results", category: "Allocations" },
  [PERMISSIONS.RUN_ALLOCATIONS]: { description: "Run material allocations", category: "Allocations" },
  [PERMISSIONS.APPROVE_ALLOCATIONS]: { description: "Approve allocation plans", category: "Allocations" },
  
  [PERMISSIONS.VIEW_FINANCIALS]: { description: "View financial reports", category: "Financials" },
  [PERMISSIONS.EDIT_BUDGET]: { description: "Edit budget settings", category: "Financials" },
  [PERMISSIONS.VIEW_COSTS]: { description: "View cost data", category: "Financials" },
  
  [PERMISSIONS.MANAGE_USERS]: { description: "Add and manage users", category: "Administration" },
  [PERMISSIONS.MANAGE_ROLES]: { description: "Create and assign roles", category: "Administration" },
  [PERMISSIONS.MANAGE_COMPANY_SETTINGS]: { description: "Edit company settings", category: "Administration" },
  [PERMISSIONS.MANAGE_INTEGRATIONS]: { description: "Configure and manage integrations", category: "Administration" },
  [PERMISSIONS.VIEW_AUDIT_LOGS]: { description: "View audit logs", category: "Administration" },
  
  [PERMISSIONS.IMPORT_DATA]: { description: "Import data from files", category: "Data" },
  [PERMISSIONS.EXPORT_DATA]: { description: "Export company data", category: "Data" },
};

// Default role definitions
export const DEFAULT_ROLES = {
  ADMIN: {
    name: "Admin",
    description: "Full system access including user and role management",
    permissions: Object.values(PERMISSIONS), // All permissions
  },
  EXECUTIVE: {
    name: "Executive",
    description: "View-only access to dashboards, reports, and financials",
    permissions: [
      PERMISSIONS.VIEW_FORECAST,
      PERMISSIONS.VIEW_PROCUREMENT,
      PERMISSIONS.VIEW_SUPPLIERS,
      PERMISSIONS.VIEW_MATERIALS,
      PERMISSIONS.VIEW_INVENTORY,
      PERMISSIONS.VIEW_SKUS,
      PERMISSIONS.VIEW_PRODUCTION,
      PERMISSIONS.VIEW_ALLOCATIONS,
      PERMISSIONS.VIEW_FINANCIALS,
      PERMISSIONS.VIEW_COSTS,
      PERMISSIONS.EXPORT_DATA,
    ],
  },
  PROCUREMENT_MANAGER: {
    name: "Procurement Manager",
    description: "Full access to procurement, suppliers, and materials",
    permissions: [
      PERMISSIONS.VIEW_FORECAST,
      PERMISSIONS.VIEW_PROCUREMENT,
      PERMISSIONS.EDIT_PROCUREMENT,
      PERMISSIONS.APPROVE_PROCUREMENT,
      PERMISSIONS.VIEW_SUPPLIERS,
      PERMISSIONS.EDIT_SUPPLIERS,
      PERMISSIONS.VIEW_MATERIALS,
      PERMISSIONS.EDIT_MATERIALS,
      PERMISSIONS.VIEW_INVENTORY,
      PERMISSIONS.VIEW_ALLOCATIONS,
      PERMISSIONS.VIEW_COSTS,
      PERMISSIONS.IMPORT_DATA,
      PERMISSIONS.EXPORT_DATA,
    ],
  },
  PRODUCTION_PLANNER: {
    name: "Production Planner",
    description: "Manage SKUs, forecasts, and production allocations",
    permissions: [
      PERMISSIONS.VIEW_FORECAST,
      PERMISSIONS.EDIT_FORECAST,
      PERMISSIONS.VIEW_MATERIALS,
      PERMISSIONS.VIEW_INVENTORY,
      PERMISSIONS.VIEW_SKUS,
      PERMISSIONS.EDIT_SKUS,
      PERMISSIONS.VIEW_PRODUCTION,
      PERMISSIONS.EDIT_PRODUCTION,
      PERMISSIONS.VIEW_ALLOCATIONS,
      PERMISSIONS.RUN_ALLOCATIONS,
      PERMISSIONS.IMPORT_DATA,
      PERMISSIONS.EXPORT_DATA,
    ],
  },
  ANALYST: {
    name: "Analyst",
    description: "View and export data for analysis",
    permissions: [
      PERMISSIONS.VIEW_FORECAST,
      PERMISSIONS.VIEW_PROCUREMENT,
      PERMISSIONS.VIEW_SUPPLIERS,
      PERMISSIONS.VIEW_MATERIALS,
      PERMISSIONS.VIEW_INVENTORY,
      PERMISSIONS.VIEW_SKUS,
      PERMISSIONS.VIEW_PRODUCTION,
      PERMISSIONS.VIEW_ALLOCATIONS,
      PERMISSIONS.VIEW_COSTS,
      PERMISSIONS.EXPORT_DATA,
    ],
  },
} as const;

// Initialize permissions in database (idempotent)
export async function initializePermissions() {
  const permissionList = Object.values(PERMISSIONS).map(name => ({
    name,
    description: PERMISSION_METADATA[name].description,
    category: PERMISSION_METADATA[name].category,
  }));
  
  for (const perm of permissionList) {
    await db.insert(permissions)
      .values(perm)
      .onConflictDoNothing()
      .execute();
  }
  
  console.log(`[RBAC] Initialized ${permissionList.length} permissions`);
}

// Initialize default roles for a company (idempotent)
export async function initializeDefaultRoles(companyId: string) {
  // Get all permissions
  const allPermissions = await db.select().from(permissions);
  const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]));
  
  for (const [key, roleDef] of Object.entries(DEFAULT_ROLES)) {
    // Create role
    const [role] = await db.insert(roles)
      .values({
        companyId,
        name: roleDef.name,
        description: roleDef.description,
        isDefault: 1,
      })
      .onConflictDoUpdate({
        target: [roles.companyId, roles.name],
        set: {
          description: roleDef.description,
        },
      })
      .returning();
    
    // Assign permissions to role
    for (const permName of roleDef.permissions) {
      const permissionId = permissionMap.get(permName);
      if (permissionId) {
        await db.insert(rolePermissions)
          .values({
            roleId: role.id,
            permissionId,
          })
          .onConflictDoNothing()
          .execute();
      }
    }
  }
  
  console.log(`[RBAC] Initialized ${Object.keys(DEFAULT_ROLES).length} default roles for company ${companyId}`);
}

// Assign default Admin role to first user in company
export async function assignDefaultAdminRole(userId: string, companyId: string) {
  const [adminRole] = await db.select()
    .from(roles)
    .where(and(
      eq(roles.companyId, companyId),
      eq(roles.name, DEFAULT_ROLES.ADMIN.name)
    ));
  
  if (adminRole) {
    await db.insert(userRoleAssignments)
      .values({
        userId,
        roleId: adminRole.id,
        companyId,
        assignedBy: userId, // Self-assigned
      })
      .onConflictDoNothing()
      .execute();
    
    console.log(`[RBAC] Assigned Admin role to user ${userId}`);
  }
}

// Get user's permissions
export async function getUserPermissions(userId: string, companyId: string): Promise<string[]> {
  const result = await db
    .select({ permissionName: permissions.name })
    .from(userRoleAssignments)
    .innerJoin(rolePermissions, eq(userRoleAssignments.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(
      eq(userRoleAssignments.userId, userId),
      eq(userRoleAssignments.companyId, companyId)
    ));
  
  return result.map(r => r.permissionName);
}

// Check if user has permission
export async function userHasPermission(
  userId: string,
  companyId: string,
  permissionName: PermissionName
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, companyId);
  return userPermissions.includes(permissionName);
}

// Get user's roles
export async function getUserRoles(userId: string, companyId: string) {
  return db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      isDefault: roles.isDefault,
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
    .where(and(
      eq(userRoleAssignments.userId, userId),
      eq(userRoleAssignments.companyId, companyId)
    ));
}
