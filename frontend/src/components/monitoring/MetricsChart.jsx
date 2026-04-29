import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2 text-xs space-y-1">
      <p className="text-slate-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}{p.unit || ""}
        </p>
      ))}
    </div>
  );
};

export function CpuChart({ data }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">CPU Usage (%)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top:5, right:10, left:-10, bottom:0 }}>
          <defs>
            <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3448" />
          <XAxis dataKey="time" tick={{ fill:"#64748b", fontSize:11 }} />
          <YAxis domain={[0,100]} tick={{ fill:"#64748b", fontSize:11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} fill="url(#cpu)" name="CPU" unit="%" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MemoryChart({ data }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Memory Usage (MB)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top:5, right:10, left:-10, bottom:0 }}>
          <defs>
            <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3448" />
          <XAxis dataKey="time" tick={{ fill:"#64748b", fontSize:11 }} />
          <YAxis tick={{ fill:"#64748b", fontSize:11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="memory" stroke="#10b981" strokeWidth={2} fill="url(#mem)" name="Memory" unit=" MB" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RequestsChart({ data }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Requests / min</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top:5, right:10, left:-10, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3448" />
          <XAxis dataKey="time" tick={{ fill:"#64748b", fontSize:11 }} />
          <YAxis tick={{ fill:"#64748b", fontSize:11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="requests" stroke="#f59e0b" strokeWidth={2} dot={false} name="Requests" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
