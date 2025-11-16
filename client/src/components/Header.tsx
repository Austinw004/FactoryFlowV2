import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Bell, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-2">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
        </Button>
        
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-user-menu">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-profile">Profile</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings">Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="menu-logout">
              <a href="/api/logout">Logout</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
