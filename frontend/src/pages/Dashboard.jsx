import React from "react";
import { Link } from "react-router-dom";
import { Rocket, CheckCircle, AlertCircle, Clock, TrendingUp, Plus, RefreshCw, Trash2, RotateCcw } from "lucide-react";
import { useDeployments, useDeleteDeployment, useRedeployment } from "../hooks/useDeployments";
import StatusBadge from "../components/common/StatusBadge";
import StackIcon from "../components/common/StackIcon";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-slate-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, refetch } = useDeployments({ page: 1, limit: 20 });
  const { mutate: deleteDeployment } = useDeleteDeployment();
  const { mutate: redeploy } = useRedeployment();

  const deployments = data?.deployments || [];
  const stats = {
    total:    deployments.length,
    running:  deployments.filter(d => d.status === "running").length,
    failed:   deployments.filter(d => d.status === "failed").length,
    building: deployments.filter(d => ["queued","building","deploying"].includes(d.status)).length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">All your deployments in one place</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary">
            <RefreshCw size={15} /> Refresh
          </button>
          <Link to="/deploy" className="btn-primary">
            <Plus size={15} /> New Deployment
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total"    value={stats.total}    icon={Rocket}      color="bg-brand-600"  />
        <StatCard label="Running"  value={stats.running}  icon={CheckCircle} color="bg-emerald-600" />
        <StatCard label="Building" value={stats.building} icon={Clock}       color="bg-blue-600"   />
        <StatCard label="Failed"   value={stats.failed}   icon={AlertCircle} color="bg-red-600"    />
      </div>

      {/* Deployments list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between">
          <h2 className="font-semibold text-slate-200">Recent Deployments</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>
        ) : deployments.length === 0 ? (
          <div className="py-16 text-center">
            <Rocket size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No deployments yet</p>
            <p className="text-slate-600 text-sm mb-4">Deploy your first repository to get started</p>
            <Link to="/deploy" className="btn-primary inline-flex">Deploy Now</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {deployments.map(d => (
              <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors">
                <StackIcon stack={d.stack} framework={d.framework} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/deployments/${d.id}`} className="font-medium text-slate-200 hover:text-white truncate">
                      {d.name}
                    </Link>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{d.repoUrl}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</p>
                  <p className="text-xs text-slate-600">{d.framework}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => redeploy(d.id)} title="Redeploy"
                    className="p-1.5 text-slate-500 hover:text-brand-400 transition-colors rounded">
                    <RotateCcw size={14} />
                  </button>
                  <button onClick={() => { if (confirm("Delete this deployment?")) deleteDeployment(d.id); }}
                    title="Delete" className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
