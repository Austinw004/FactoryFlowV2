import { Router } from "express";
import { randomBytes } from "crypto";
import { storage } from "../storage";
import { requirePermission } from "../middleware/rbac";
import { PERMISSIONS } from "../lib/rbac";
import { insertRoleSchema, insertUserRoleAssignmentSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all permissions (available to all authenticated users)
router.get("/permissions", async (req, res) => {
  try {
    const permissions = await storage.getAllPermissions();
    res.json(permissions);
  } catch (error) {
    console.error("[RBAC Routes] Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

// Get all roles for company (requires manage_roles permission)
router.get("/roles", requirePermission(PERMISSIONS.MANAGE_ROLES), async (req, res) => {
  try {
    const user = (req as any).rbacUser;
    if (!user?.companyId) {
      return res.status(403).json({ error: "User not associated with a company" });
    }
    
    const roles = await storage.getRoles(user.companyId);
    res.json(roles);
  } catch (error) {
    console.error("[RBAC Routes] Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// Get specific role with its permissions
router.get("/roles/:roleId", requirePermission(PERMISSIONS.MANAGE_ROLES), async (req, res) => {
  try {
    const { roleId } = req.params;
    const user = (req as any).rbacUser;
    
    if (!user?.companyId) {
      return res.status(403).json({ error: "Access denied: no company association" });
    }
    
    const role = await storage.getRole(roleId, user.companyId);
    if (!role) {
      return res.status(404).json({ error: "Role not found or access denied" });
    }
    
    const permissions = await storage.getRolePermissions(roleId, user.companyId);
    
    res.json({ ...role, permissions });
  } catch (error) {
    console.error("[RBAC Routes] Error fetching role:", error);
    res.status(500).json({ error: "Failed to fetch role" });
  }
});

// Create new role
router.post("/roles", requirePermission(PERMISSIONS.MANAGE_ROLES), async (req, res) => {
  try {
    const user = (req as any).rbacUser;
    if (!user?.companyId) {
      return res.status(403).json({ error: "User not associated with a company" });
    }
    
    const roleData = insertRoleSchema.parse({
      ...req.body,
      companyId: user.companyId,
      isDefault: 0, // Custom roles are not defaults
    });
    
    const role = await storage.createRole(roleData);
    
    // Create audit log
    await storage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "create",
      entityType: "role",
      entityId: role.id,
      changes: { role },
    });
    
    res.status(201).json(role);
  } catch (error) {
    console.error("[RBAC Routes] Error creating role:", error);
    res.status(500).json({ error: "Failed to create role" });
  }
});

// Update role
router.patch("/roles/:roleId", requirePermission(PERMISSIONS.MANAGE_ROLES), async (req, res) => {
  try {
    const { roleId } = req.params;
    const user = (req as any).rbacUser;
    
    if (!user?.companyId) {
      return res.status(403).json({ error: "Access denied: no company association" });
    }
    
    // Whitelist updatable fields - prevent companyId reassignment
    const { name, description, isDefault } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    
    const role = await storage.updateRole(roleId, user.companyId, updates);
    if (!role) {
      return res.status(404).json({ error: "Role not found or access denied" });
    }
    
    // Create audit log
    if (user?.companyId && user?.id) {
      await storage.createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "update",
        entityType: "role",
        entityId: roleId,
        changes: updates,
      });
    }
    
    res.json(role);
  } catch (error) {
    console.error("[RBAC Routes] Error updating role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// Delete role
router.delete("/roles/:roleId", requirePermission(PERMISSIONS.MANAGE_ROLES), async (req, res) => {
  try {
    const { roleId } = req.params;
    const user = (req as any).rbacUser;
    
    if (!user?.companyId) {
      return res.status(403).json({ error: "Access denied: no company association" });
    }
    
    const role = await storage.getRole(roleId, user.companyId);
    if (!role) {
      return res.status(404).json({ error: "Role not found or access denied" });
    }
    
    // Don't allow deletion of default roles
    if (role.isDefault) {
      return res.status(400).json({ error: "Cannot delete default roles" });
    }
    
    // Verify company ownership before deletion
    await storage.deleteRole(roleId, user.companyId);
    
    // Create audit log
    if (user?.companyId && user?.id) {
      await storage.createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "delete",
        entityType: "role",
        entityId: roleId,
        changes: { deletedRole: role },
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("[RBAC Routes] Error deleting role:", error);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

// Assign permission to role
router.post("/roles/:roleId/permissions/:permissionId", requirePermission(PERMISSIONS.MANAGE_ROLES), async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;
    const user = (req as any).rbacUser;
    
    if (!user?.companyId) {
      return res.status(403).json({ error: "Access denied: no company association" });
    }
    
    await storage.assignPermissionToRole(roleId, permissionId, user.companyId);
    
    // Create audit log
    if (user?.companyId && user?.id) {
      await storage.createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        entityType: "role_permission",
        entityId: `${roleId}-${permissionId}`,
        changes: { roleId, permissionId },
      });
    }
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("[RBAC Routes] Error assigning permission to role:", error);
    res.status(500).json({ error: "Failed to assign permission" });
  }
});

// Remove permission from role
router.delete("/roles/:roleId/permissions/:permissionId", requirePermission(PERMISSIONS.MANAGE_ROLES), async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;
    const user = (req as any).rbacUser;
    
    if (!user?.companyId) {
      return res.status(403).json({ error: "Access denied: no company association" });
    }
    
    await storage.removePermissionFromRole(roleId, permissionId, user.companyId);
    
    // Create audit log
    if (user?.companyId && user?.id) {
      await storage.createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "delete",
        entityType: "role_permission",
        entityId: `${roleId}-${permissionId}`,
        changes: { roleId, permissionId },
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("[RBAC Routes] Error removing permission from role:", error);
    res.status(500).json({ error: "Failed to remove permission" });
  }
});

// Get user's roles
router.get("/users/:userId/roles", requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = (req as any).rbacUser;
    
    if (!user?.companyId) {
      return res.status(403).json({ error: "User not associated with a company" });
    }
    
    const roles = await storage.getUserRoles(userId, user.companyId);
    res.json(roles);
  } catch (error) {
    console.error("[RBAC Routes] Error fetching user roles:", error);
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

// Assign role to user
router.post("/users/:userId/roles", requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    const user = (req as any).rbacUser;
    
    if (!user?.companyId || !user?.id) {
      return res.status(403).json({ error: "User not associated with a company" });
    }
    
    await storage.assignRoleToUser(userId, roleId, user.companyId, user.id);
    
    // Create audit log
    await storage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "create",
      entityType: "user_role_assignment",
      entityId: `${userId}-${roleId}`,
      changes: { userId, roleId, assignedBy: user.id },
    });
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("[RBAC Routes] Error assigning role to user:", error);
    res.status(500).json({ error: "Failed to assign role to user" });
  }
});

// Remove role from user
router.delete("/users/:userId/roles/:roleId", requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    const user = (req as any).rbacUser;
    
    await storage.removeRoleFromUser(userId, roleId);
    
    // Create audit log
    if (user?.companyId && user?.id) {
      await storage.createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "delete",
        entityType: "user_role_assignment",
        entityId: `${userId}-${roleId}`,
        changes: { userId, roleId },
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("[RBAC Routes] Error removing role from user:", error);
    res.status(500).json({ error: "Failed to remove role from user" });
  }
});

// Get users with specific role
router.get("/roles/:roleId/users", requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const { roleId } = req.params;
    
    const users = await storage.getUsersWithRole(roleId);
    res.json(users);
  } catch (error) {
    console.error("[RBAC Routes] Error fetching users with role:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get audit logs for company (requires view_audit_logs permission)
router.get("/audit-logs", requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS), async (req, res) => {
  try {
    const user = (req as any).rbacUser;
    if (!user?.companyId) {
      return res.status(403).json({ error: "User not associated with a company" });
    }
    
    // Enforce company scoping for tenant isolation
    const logs = await storage.getAuditLogs(user.companyId);
    res.json(logs);
  } catch (error) {
    console.error("[RBAC Routes] Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

const inviteSchema = z.object({
  email: z.string().email("Valid email address is required"),
  roleId: z.string().optional(),
});

// Team Invitations - invite new members
router.post("/team/invite", requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const user = (req as any).rbacUser;
    if (!user?.companyId) {
      return res.status(403).json({ error: "User not associated with a company" });
    }

    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
    }
    const { email, roleId } = parsed.data;

    if (roleId) {
      const role = await storage.getRole(roleId, user.companyId);
      if (!role) {
        return res.status(400).json({ error: "Selected role does not exist in your company" });
      }
    }

    const existingUsers = await storage.getUsersByCompany(user.companyId);
    if (existingUsers.some(u => u.email === email)) {
      return res.status(400).json({ error: "This user is already a member of your company" });
    }

    const token = `inv_${randomBytes(24).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await storage.createTeamInvitation({
      companyId: user.companyId,
      email,
      roleId: roleId || null,
      invitedBy: user.id,
      status: "pending",
      token,
      expiresAt,
    });

    await storage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "create",
      entityType: "team_invitation",
      entityId: invitation.id,
      changes: { email, roleId },
    });

    res.status(201).json(invitation);
  } catch (error) {
    console.error("[RBAC Routes] Error creating invitation:", error);
    res.status(500).json({ error: "Failed to create invitation" });
  }
});

// List team invitations
router.get("/team/invitations", requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const user = (req as any).rbacUser;
    if (!user?.companyId) {
      return res.status(403).json({ error: "User not associated with a company" });
    }

    const invitations = await storage.getTeamInvitations(user.companyId);
    res.json(invitations);
  } catch (error) {
    console.error("[RBAC Routes] Error fetching invitations:", error);
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
});

// Cancel invitation
router.delete("/team/invitations/:id", requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const user = (req as any).rbacUser;
    if (!user?.companyId) {
      return res.status(403).json({ error: "User not associated with a company" });
    }

    await storage.cancelTeamInvitation(req.params.id, user.companyId);

    await storage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "delete",
      entityType: "team_invitation",
      entityId: req.params.id,
      changes: {},
    });

    res.status(204).send();
  } catch (error) {
    console.error("[RBAC Routes] Error cancelling invitation:", error);
    res.status(500).json({ error: "Failed to cancel invitation" });
  }
});

// Remove user from company
router.delete("/team/members/:userId", requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const user = (req as any).rbacUser;
    if (!user?.companyId) {
      return res.status(403).json({ error: "User not associated with a company" });
    }

    const targetUserId = req.params.userId;
    if (targetUserId === user.id) {
      return res.status(400).json({ error: "You cannot remove yourself from the company" });
    }

    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser || targetUser.companyId !== user.companyId) {
      return res.status(404).json({ error: "User not found in your company" });
    }

    await storage.removeUserFromCompany(targetUserId, user.companyId);

    await storage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "delete",
      entityType: "team_member",
      entityId: targetUserId,
      changes: { removedUserId: targetUserId },
    });

    res.status(204).send();
  } catch (error) {
    console.error("[RBAC Routes] Error removing team member:", error);
    res.status(500).json({ error: "Failed to remove team member" });
  }
});

export default router;
