"use client";

// app/dashboard/layout.tsx
// Composant Layout principal pour le dashboard médecin

import React, { useState } from 'react';
import {
  Stethoscope,
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  UserCircle2,
  LogOut,
  Activity,
  CircleDot,
  FileWarning,
  CalendarClock,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserProvider, useUser } from '@/app/components/UserProvider';

// ── Inner layout (uses useUser — must be inside UserProvider) ──────────────
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 overflow-hidden font-sans">

      {/* ==================== SIDEBAR MODERNE ==================== */}
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-xl shadow-slate-200/20 flex flex-col transition-all duration-300 z-20 whitespace-nowrap`}
      >
        {/* Logo + Brand */}
        <div className={`px-6 pt-8 pb-6 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center px-2' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-br from-cyan-600 to-blue-600 p-2.5 rounded-2xl shadow-lg shadow-cyan-500/20 shrink-0 ${isCollapsed ? 'mb-2' : ''}`}>
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="transition-opacity duration-300 opacity-100">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  MayouDashboard
                </h1>
                <p className="text-xs text-slate-400 font-medium">Les Babors</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation principale */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 space-y-1.5 overflow-hidden`}>
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Tableau de bord"
            href="/dashboard"
            active={pathname === '/dashboard'}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<Users size={20} />}
            label="Patients"
            href="/dashboard/patients"
            active={pathname.startsWith('/dashboard/patients')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<CalendarClock size={20} />}
            label="ATL à faire"
            href="/dashboard/atl-a-faire"
            active={pathname.startsWith('/dashboard/atl-a-faire')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<Activity size={20} />}
            label="Patients CTO"
            href="/dashboard/cto"
            active={pathname.startsWith('/dashboard/cto')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<CircleDot size={20} />}
            label="Patients calcification"
            href="/dashboard/calcifications"
            active={pathname.startsWith('/dashboard/calcifications')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<FileWarning size={20} />}
            label="Cas spécifiques"
            href="/dashboard/cas-specifiques"
            active={pathname.startsWith('/dashboard/cas-specifiques')}
            isCollapsed={isCollapsed}
          />
          <div className="pt-4 mt-2 border-t border-slate-100">
            <NavItem
              icon={<Settings size={20} />}
              label="Paramètres"
              href="/dashboard/settings"
              active={pathname.startsWith('/dashboard/settings')}
              isCollapsed={isCollapsed}
            />
          </div>
        </nav>

        {/* Profil médecin AVEC DÉCONNEXION */}
        <div className={`p-4 border-t border-slate-100 bg-slate-50/50 m-3 rounded-2xl transition-all duration-300 ${isCollapsed ? 'flex justify-center px-1' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md">
                <UserCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm truncate">
                    {user.role === "doctor" ? "Dr. " : ""}{user.nom} {user.prenom}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user.role === "admin" ? "Administrateur" : "Médecin"}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ==================== MAIN + HEADER ==================== */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header moderne */}
        <header className="bg-white/70 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-all duration-300">

          <div className="flex items-center gap-4">
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-cyan-600 transition"
              title="Toggle Sidebar"
            >
              {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            {/* Titre de bienvenue */}
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
                Bonjour, {user.role === "doctor" ? "Dr. " : ""}{user.nom}
              </h2>
              <p className="text-sm text-slate-400 flex items-center gap-1.5 capitalize" suppressHydrationWarning>
                <Sparkles size={14} className="text-amber-400" />
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Actions Rapides & Statut */}
          <div className="flex items-center gap-5">

            {/* Statut Cabinet Live */}
            <div className="hidden md:flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
              <span className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Cabinet ouvert
              </span>
              <div className="w-px h-4 bg-slate-200 mx-2" />
              <span className="px-3 py-1.5 text-xs font-medium text-slate-500 flex items-center gap-1.5 hover:text-slate-700 cursor-pointer transition-colors group">
                <Activity size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                Performances
              </span>
            </div>

            <div className="w-px h-8 bg-slate-200 hidden md:block"></div>

            {/* Notifications */}
            <div className="flex items-center gap-2">
              <button className="relative p-2.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:bg-white hover:text-cyan-600 hover:shadow-md transition-all duration-200 group">
                <Bell size={18} className="text-slate-500 group-hover:text-cyan-600 transition-colors" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Contenu dynamique (children) — no extra padding here, each page owns its own */}
        <main className="flex-1 overflow-y-auto custom-scroll">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Outer layout — provides UserProvider scoped to /dashboard/* only ────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </UserProvider>
  );
}

// ── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({
  icon,
  label,
  active = false,
  badge,
  href,
  isCollapsed,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  href?: string;
  isCollapsed?: boolean;
}) {
  const content = (
    <div
      title={isCollapsed ? label : undefined}
      className={`
        w-full flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 ease-in-out group cursor-pointer
        ${active
          ? 'bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-200/60'
          : 'bg-transparent border border-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
        }
        ${isCollapsed ? 'justify-center gap-0' : 'gap-3'}
      `}
    >
      <span className={`shrink-0 transition-colors duration-300 ${active ? 'text-cyan-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </span>
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-opacity duration-300 opacity-100">
            {label}
          </span>
          {badge && (
            <span className="text-xs font-semibold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full shrink-0">
              {badge}
            </span>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}