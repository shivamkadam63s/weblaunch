import React from "react";
import clsx from "clsx";

const STATUS = {
  queued:    { label: "Queued",    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  building:  { label: "Building",  color: "bg-blue-500/20 text-blue-300 border-blue-500/30"       },
  deploying: { label: "Deploying", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  running:   { label: "Running",   color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  failed:    { label: "Failed",    color: "bg-red-500/20 text-red-300 border-red-500/30"           },
  stopped:   { label: "Stopped",   color: "bg-slate-500/20 text-slate-300 border-slate-500/30"    },
};

const DOT_COLOR = {
  queued: "bg-yellow-400", building: "bg-blue-400 animate-pulse",
  deploying: "bg-purple-400 animate-pulse", running: "bg-emerald-400",
  failed: "bg-red-400", stopped: "bg-slate-400",
};

export default function StatusBadge({ status, size = "sm" }) {
  const cfg = STATUS[status] || STATUS.stopped;
  return (
    <span className={`badge border ${cfg.color} gap-1.5 ${size === "lg" ? "px-3 py-1 text-sm" : ""}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[status] || "bg-slate-400"}`} />
      {cfg.label}
    </span>
  );
}
