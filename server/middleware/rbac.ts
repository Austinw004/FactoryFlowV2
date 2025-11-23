import { Request, Response, NextFunction } from "express";
import { userHasPermission, PermissionName } from "../lib/rbac";
import { storage } from "../storage";

// Custom user type for RBAC
interface RbacUser {
  id: string;
  email?: string;
  companyId?: string;
}

// Extend Request to add rbacUser (avoid conflict with existing user type)
interface AuthenticatedRequest extends Request {
  rbacUser?: RbacUser;
}

// Middleware to require specific permission
export function requirePermission(permissionName: PermissionName) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.rbacUser;
      
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      if (!user.companyId) {
        return res.status(403).json({ error: "User not associated with a company" });
      }
      
      const hasPermission = await userHasPermission(user.id, user.companyId, permissionName);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: "Insufficient permissions",
          required: permissionName 
        });
      }
      
      next();
    } catch (error) {
      console.error("[RBAC Middleware] Error checking permission:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

// Middleware to require ANY of the specified permissions (OR logic)
export function requireAnyPermission(...permissionNames: PermissionName[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.rbacUser;
      
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      if (!user.companyId) {
        return res.status(403).json({ error: "User not associated with a company" });
      }
      
      for (const permName of permissionNames) {
        const hasPermission = await userHasPermission(user.id, user.companyId, permName);
        if (hasPermission) {
          return next(); // User has at least one of the required permissions
        }
      }
      
      return res.status(403).json({ 
        error: "Insufficient permissions",
        required: `One of: ${permissionNames.join(", ")}` 
      });
    } catch (error) {
      console.error("[RBAC Middleware] Error checking permissions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

// Middleware to require ALL of the specified permissions (AND logic)
export function requireAllPermissions(...permissionNames: PermissionName[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.rbacUser;
      
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      if (!user.companyId) {
        return res.status(403).json({ error: "User not associated with a company" });
      }
      
      for (const permName of permissionNames) {
        const hasPermission = await userHasPermission(user.id, user.companyId, permName);
        if (!hasPermission) {
          return res.status(403).json({ 
            error: "Insufficient permissions",
            required: permissionNames.join(", ") 
          });
        }
      }
      
      next();
    } catch (error) {
      console.error("[RBAC Middleware] Error checking permissions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

// Helper to attach user info from session to request for RBAC
export async function attachRbacUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // First try to get user from session (primary path)
    if (req.session && (req.session as any).passport?.user) {
      const sessionUser = (req.session as any).passport.user;
      req.rbacUser = {
        id: sessionUser.id,
        email: sessionUser.email,
        companyId: sessionUser.companyId,
      };
    }
    
    // Fallback: if session doesn't have complete data, fetch from storage
    if (req.rbacUser && (!req.rbacUser.companyId || !req.rbacUser.email)) {
      const dbUser = await storage.getUser(req.rbacUser.id);
      if (dbUser) {
        req.rbacUser = {
          id: dbUser.id,
          email: dbUser.email || req.rbacUser.email,
          companyId: dbUser.companyId || req.rbacUser.companyId,
        };
      }
    }
    
    next();
  } catch (error) {
    console.error("[RBAC Middleware] Error attaching RBAC user:", error);
    next(); // Continue even if there's an error - let permission checks handle it
  }
}
