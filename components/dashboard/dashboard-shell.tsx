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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "My Library", icon: Library },
  { href: "/favorites", label: "Favorites", icon: Heart },
];

/**
 * The dashboard frame: a left sidebar (Discover / Search / My Library / Favorites)
 * plus a main area with a slim top bar. Collapses to a top bar + drawer on mobile.
 * Layout language follows the "Digital Book Library Dashboard" reference, in the
 * Literary-light / Warm-dark palette.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navList = (onNavigate?: () => void) =>
    NAV.map(({ href, label, icon: Icon }) => {
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
    });

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
        <nav className="mt-2 flex flex-col gap-1">{navList()}</nav>

        <div className="my-5 border-t border-border" />
        <div className="flex flex-col gap-1">
          <span className="flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted/70">
            <span className="flex h-8 w-8 items-center justify-center">
              <Settings size={17} />
            </span>
            Settings
          </span>
        </div>

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
            <span className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-medium text-ink">
                Y
              </span>
              <span className="hidden text-sm text-ink sm:inline">You</span>
              <ChevronDown size={14} className="hidden text-muted sm:inline" />
            </span>
          </div>
        </header>

        {/* Mobile drawer */}
        {menuOpen ? (
          <nav className="flex flex-col gap-1 border-b border-border bg-surface px-4 py-3 md:hidden">
            {navList(() => setMenuOpen(false))}
          </nav>
        ) : null}

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
