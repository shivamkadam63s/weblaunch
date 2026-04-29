import React, { useState, useEffect } from "react";
import { Activity, TrendingUp, Server, Wifi } from "lucide-react";
import { useDeployments } from "../hooks/useDeployments";
import { CpuChart, MemoryChart, RequestsChart } from "../components/monitoring/MetricsChart";
import StatusBadge from "../components/common/StatusBadge";

function generateMockData(points = 20) {
  return Array.from({ length: points }, (_, i) => ({
    time: `${i}m`,
    cpu:      Math.random() * 40 + 10,
    memory:   Math.random() * 200 + 100,
    requests: Math.floor(Math.random() * 80 + 20),
  }));
}

function StatTile({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-600">{sub}</p>}
      </div>
    </div>
  );
}

export default function Monitoring() {
  const { data } = useDeployments({ limit: 100 });
  const [metrics, setMetrics] = useState(generateMockData());
  const deployments = data?.deployments || [];
  const running = deployments.filter(d => d.status === "running");

  useEffect(() => {
    const iv = setInterval(() => {
      setMetrics(prev => [...prev.slice(1), {
        time: "now",
        cpu:      Math.random() * 40 + 10,
        memory:   Math.random() * 200 + 100,
        requests: Math.floor(Math.random() * 80 + 20),
      }]);
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const avgCpu = (metrics.reduce((s, d) => s + d.cpu, 0) / metrics.length).toFixed(1);
  const avgMem = (metrics.reduce((s, d) => s + d.memory, 0) / metrics.length).toFixed(0);
  const totalReq = metrics.reduce((s, d) => s + d.requests, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring</h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time infrastructure metrics via Prometheus + Grafana</p>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Avg CPU"     value={`${avgCpu}%`}   icon={TrendingUp} color="bg-brand-600"   />
        <StatTile label="Avg Memory"  value={`${avgMem}MB`}  icon={Activity}   color="bg-emerald-600" />
        <StatTile label="Running Apps" value={running.length} icon={Server}    color="bg-blue-600"    />
        <StatTile label="Total Requests" value={totalReq}    icon={Wifi}       color="bg-amber-600"   />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CpuChart    data={metrics} />
        <MemoryChart data={metrics} />
        <RequestsChart data={metrics} />

        {/* Running deployments */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Running Deployments</h3>
          {running.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">No running deployments</p>
          ) : (
            <div className="space-y-2">
              {running.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-300">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.framework} · {d.replicas} replica(s)</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grafana/Prometheus links */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { name: "Grafana Dashboard", url: `http://localhost:${import.meta.env.VITE_GRAFANA_PORT || 3001}`, color: "from-orange-600/20 to-orange-700/10", border: "border-orange-500/30" },
          { name: "Prometheus Metrics", url: `http://localhost:${import.meta.env.VITE_PROMETHEUS_PORT || 9090}`, color: "from-red-600/20 to-red-700/10", border: "border-red-500/30" },
        ].map(({ name, url, color, border }) => (
          <a key={name} href={url} target="_blank" rel="noreferrer"
            className={`card p-5 bg-gradient-to-br ${color} border ${border} hover:opacity-80 transition-opacity flex items-center justify-between group`}>
            <div>
              <p className="font-semibold text-slate-200">{name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{url}</p>
            </div>
            <span className="text-slate-400 group-hover:text-white transition-colors">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
