import { Request, Response, NextFunction } from "express";
import { userHasPermission, PermissionName } from "../lib/rbac";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        companyId?: string;
      };
    }
  }
}

// Middleware to require specific permission
export function requirePermission(permissionName: PermissionName) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
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
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
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
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
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

// Helper to attach user info from session to request
export function attachUser(req: Request, res: Response, next: NextFunction) {
  // Replit Auth attaches user to req.session
  if (req.session && (req.session as any).passport?.user) {
    const sessionUser = (req.session as any).passport.user;
    req.user = {
      id: sessionUser.id,
      email: sessionUser.email,
      companyId: sessionUser.companyId,
    };
  }
  next();
}
