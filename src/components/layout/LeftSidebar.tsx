"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Folder } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";

import config from "config";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Folder,
};

interface NavigationItem {
  label: string;
  path: string;
  icon: string;
}

interface DashboardConfig {
  brand?: {
    name?: string;
    logo?: string;
  };
  navigation?: NavigationItem[];
  user?: {
    name?: string;
    role?: string;
  };
}

export default function LeftSidebar() {
  const pathname = usePathname();
  const dashboard = (config as { dashboard?: DashboardConfig }).dashboard;

  const brandName = dashboard?.brand?.name ?? "Drive";
  const brandLogo = dashboard?.brand?.logo ?? "/logo.svg";
  const userName = dashboard?.user?.name ?? "Admin";
  const userRole = dashboard?.user?.role ?? "Owner";
  const navigation = dashboard?.navigation ?? [];

  return (
    <aside className="flex h-full w-[240px] flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <img
            src={brandLogo}
            alt={brandName}
            className="h-8 w-8"
          />
          <span className="font-semibold">{brandName}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto p-2">
        <div className="flex flex-col gap-1">
          {navigation.map((item) => {
            const Icon = iconMap[item.icon] ?? Folder;
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");

            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "bg-secondary"
                )}
                asChild
              >
                <Link href={item.path}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>

      <Separator />

      {/* User Profile */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{userName}</span>
          <span className="text-xs text-muted-foreground">{userRole}</span>
        </div>
      </div>
    </aside>
  );
}
