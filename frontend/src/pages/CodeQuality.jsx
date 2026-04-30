import React, { useEffect, useState } from "react";
import { ShieldCheck, Bug, AlertTriangle, Activity, Lock, RefreshCcw } from "lucide-react";

function MetricCard({ title, value, icon: Icon, color, trend }) {
  return (
    <div className={`card p-6 bg-gradient-to-br ${color} border border-slate-700/50 hover:border-slate-600 transition-colors group relative overflow-hidden`}>
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={120} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
          <div className={`p-2 rounded-lg bg-black/20 text-white backdrop-blur-md`}>
            <Icon size={20} />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-white">{value}</span>
          {trend && <span className="text-xs font-medium text-slate-400 mb-1">{trend}</span>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isPassed = status === "PASSED" || status === "OK";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
      isPassed ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
      status === "UNKNOWN" ? "bg-slate-500/20 text-slate-400 border border-slate-500/30" : 
      "bg-red-500/20 text-red-400 border border-red-500/30"
    }`}>
      {status || "UNKNOWN"}
    </span>
  );
}

export default function CodeQuality() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/code-quality`);
      if (!res.ok) throw new Error("Failed to fetch code quality metrics");
      const json = await res.json();
      setData(json.metrics || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalBugs = data.reduce((acc, curr) => acc + (curr.bugs || 0), 0);
  const totalVulnerabilities = data.reduce((acc, curr) => acc + (curr.vulnerabilities || 0), 0);
  const totalSmells = data.reduce((acc, curr) => acc + (curr.code_smells || 0), 0);
  const totalHotspots = data.reduce((acc, curr) => acc + (curr.security_hotspots || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="text-brand-400" />
            Code Quality & Security
          </h1>
          <p className="text-slate-500 text-sm mt-1">Continuous static analysis results via SonarQube</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" disabled={loading}>
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Aggregate Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Bugs" value={totalBugs} icon={Bug} color="from-red-900/40 to-[#161b27]" trend="Across all deployments" />
        <MetricCard title="Vulnerabilities" value={totalVulnerabilities} icon={AlertTriangle} color="from-orange-900/40 to-[#161b27]" trend="Requires attention" />
        <MetricCard title="Code Smells" value={totalSmells} icon={Activity} color="from-amber-900/40 to-[#161b27]" trend="Maintainability issues" />
        <MetricCard title="Security Hotspots" value={totalHotspots} icon={Lock} color="from-purple-900/40 to-[#161b27]" trend="Manual review needed" />
      </div>

      {/* Detailed Table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Recent Analyses</h2>
          <span className="text-xs text-slate-500">{data.length} projects scanned</span>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center"><RefreshCcw className="animate-spin text-slate-500" size={32} /></div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
            <p>No code quality data available yet.</p>
            <p className="text-xs mt-1">Trigger a deployment to run a SonarQube scan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Repository</th>
                  <th className="px-6 py-4 font-semibold">Quality Gate</th>
                  <th className="px-6 py-4 font-semibold text-center">Bugs</th>
                  <th className="px-6 py-4 font-semibold text-center">Vulns</th>
                  <th className="px-6 py-4 font-semibold text-center">Smells</th>
                  <th className="px-6 py-4 font-semibold text-center">Hotspots</th>
                  <th className="px-6 py-4 font-semibold">Scanned At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{row.repo_url.split('/').pop()}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{row.deployment_id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.quality_gate_status} />
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-slate-300">{row.bugs}</td>
                    <td className="px-6 py-4 text-center font-mono text-slate-300">{row.vulnerabilities}</td>
                    <td className="px-6 py-4 text-center font-mono text-slate-300">{row.code_smells}</td>
                    <td className="px-6 py-4 text-center font-mono text-slate-300">{row.security_hotspots}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
