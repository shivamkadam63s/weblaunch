import React from "react";

const ICONS = {
  nodejs:  { emoji: "⬢", bg: "bg-green-500/20",  text: "text-green-400",  label: "Node.js"  },
  python:  { emoji: "🐍", bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Python"   },
  go:      { emoji: "🐹", bg: "bg-cyan-500/20",   text: "text-cyan-400",   label: "Go"       },
  rust:    { emoji: "⚙️", bg: "bg-orange-500/20", text: "text-orange-400", label: "Rust"     },
  java:    { emoji: "☕", bg: "bg-red-500/20",     text: "text-red-400",    label: "Java"     },
  ruby:    { emoji: "💎", bg: "bg-rose-500/20",    text: "text-rose-400",   label: "Ruby"     },
  static:  { emoji: "🌐", bg: "bg-slate-500/20",  text: "text-slate-400",  label: "Static"   },
};

export default function StackIcon({ stack, framework, showLabel = false }) {
  const cfg = ICONS[stack] || ICONS.static;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center text-sm`} title={stack}>
        {cfg.emoji}
      </span>
      {showLabel && (
        <div>
          <p className={`text-xs font-semibold ${cfg.text}`}>{framework || stack}</p>
          <p className="text-xs text-slate-500">{cfg.label}</p>
        </div>
      )}
    </div>
  );
}
