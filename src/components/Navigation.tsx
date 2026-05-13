"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser } from "@/firebase";
import { LayoutDashboard, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navigation component that provides a persistent bottom navigation bar.
 * Follows visibility rules: hidden on landing, auth, onboarding, and assessment pages.
 * Only shown after Day 0 baseline is complete.
 * Locked nav items are grayed out and non-interactive.
 */
export function Navigation() {
  const { user, profile, isUserLoading, isProfileLoading } = useUser();
  const pathname = usePathname();

  // Route exclusion logic
  const excludedRoutes = ["/", "/auth", "/onboarding", "/assessment"];
  const isExcluded = excludedRoutes.includes(pathname);

  // Don't render if loading, not logged in, hasn't finished baseline, or on excluded route
  if (isUserLoading || isProfileLoading || !user || !profile?.isDay0Complete || isExcluded) {
    return null;
  }

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: LayoutDashboard,
      locked: false,
    },
    {
      label: "Library",
      href: "/exercises",
      icon: BookOpen,
      locked: false,
    },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 h-14 flex items-center">
        <Link href="/dashboard">
          <Image src="/logo.png" alt="JIT" height={35} width={88} className="object-contain" />
        </Link>
      </header>
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border px-6 h-20 safe-area-inset-bottom">
      <div className="max-w-md mx-auto h-full flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/exercises" && pathname.startsWith("/exercises"));
          const isLocked = item.locked;
          const Icon = item.icon;

          if (isLocked) {
            return (
              <div
                key={item.href}
                className="flex flex-col items-center gap-1 opacity-35 cursor-not-allowed"
                aria-disabled="true"
              >
                <div className="p-2 rounded-xl">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 group transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive ? "bg-primary/10" : "group-hover:bg-accent/50"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
