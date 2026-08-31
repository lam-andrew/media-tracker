"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Compass,
  Search,
  Library,
  Heart,
  Settings,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth-actions";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "My Library", icon: Library },
  { href: "/favorites", label: "Favorites", icon: Heart },
];

export function DashboardShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  function navItem(
    href: string,
    label: string,
    Icon: LucideIcon,
    onNavigate?: () => void,
  ) {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
          active
            ? "bg-surface-2 font-medium text-ink"
            : "text-muted hover:text-ink"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            active ? "bg-accent text-surface" : "text-muted"
          }`}
        >
          <Icon size={17} />
        </span>
        {label}
      </Link>
    );
  }

  const initial = userEmail ? userEmail[0].toUpperCase() : "?";
  const username = userEmail ? userEmail.split("@")[0] : "Account";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <Link
          href="/"
          className="px-1.5 font-serif text-2xl font-medium tracking-tight text-ink"
        >
          {BRAND.name}
        </Link>

        <p className="mt-8 px-2.5 text-xs uppercase tracking-widest text-muted">
          Menu
        </p>
        <nav className="mt-2 flex flex-col gap-1">
          {NAV.map((n) => navItem(n.href, n.label, n.icon))}
        </nav>

        <div className="my-5 border-t border-border" />
        <nav className="flex flex-col gap-1">
          {navItem("/settings", "Settings", Settings)}
        </nav>

        <div className="mt-auto flex items-center gap-3 px-1.5 pt-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent font-serif text-surface">
            {BRAND.name.charAt(0)}
          </span>
          <span className="text-xs uppercase tracking-wider text-muted">
            Media library
          </span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col bg-bg">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-8">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="text-muted hover:text-ink md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link
            href="/"
            className="font-serif text-xl font-medium text-ink md:hidden"
          >
            {BRAND.name}
          </Link>

          <div className="ml-auto flex items-center gap-2.5">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-ink"
            >
              <Bell size={16} />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 transition-colors hover:border-border-strong"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-medium text-surface">
                  {initial}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm text-ink sm:inline">
                  {username}
                </span>
                <ChevronDown
                  size={14}
                  className="hidden text-muted sm:inline"
                />
              </button>

              {profileOpen ? (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setProfileOpen(false)}
                    className="fixed inset-0 z-20 cursor-default"
                  />
                  <div className="absolute right-0 z-30 mt-2 w-60 rounded-lg border border-border bg-surface p-1 shadow-lg">
                    <div className="px-3 py-2">
                      <p className="text-xs text-muted">Signed in as</p>
                      <p className="truncate text-sm text-ink">{userEmail}</p>
                    </div>
                    <div className="my-1 border-t border-border" />
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
                    >
                      <Settings size={15} className="text-muted" /> Settings
                    </Link>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
                      >
                        <LogOut size={15} className="text-muted" /> Sign out
                      </button>
                    </form>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        {menuOpen ? (
          <nav className="flex flex-col gap-1 border-b border-border bg-surface px-4 py-3 md:hidden">
            {NAV.map((n) =>
              navItem(n.href, n.label, n.icon, () => setMenuOpen(false)),
            )}
            {navItem("/settings", "Settings", Settings, () =>
              setMenuOpen(false),
            )}
          </nav>
        ) : null}

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
