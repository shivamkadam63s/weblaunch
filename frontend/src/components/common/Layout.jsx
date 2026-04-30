import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Rocket, Activity, Github, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const NAV = [
  { to: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { to: "/deploy",    label: "Deploy",      icon: Rocket },
  { to: "/monitoring",label: "Monitoring",  icon: Activity },
  { to: "/code-quality",label: "Code Quality", icon: ShieldCheck },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-[#0f1117]">
      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-[#161b27] border-r border-slate-700/60 transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/60">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Rocket size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">WebLaunch</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive ? "bg-brand-600/20 text-brand-400 border border-brand-500/30" : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/50"
              )}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-700/60">
          <a href="https://github.com" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            <Github size={15} /> GitHub
          </a>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 flex items-center px-4 border-b border-slate-700/60 bg-[#0f1117]/80 backdrop-blur-sm">
          <button className="lg:hidden text-slate-400 hover:text-white mr-3" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <span className="text-xs text-slate-500 font-mono">v1.0.0</span>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
