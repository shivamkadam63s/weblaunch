import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, RotateCcw, Trash2, Server, Clock, Tag } from "lucide-react";
import { useDeployment, useDeleteDeployment, useRedeployment } from "../hooks/useDeployments";
import StatusBadge from "../components/common/StatusBadge";
import StackIcon from "../components/common/StackIcon";
import LogViewer from "../components/deploy/LogViewer";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-700/40 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`text-slate-300 text-sm text-right max-w-xs truncate ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function DeploymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: deployment, isLoading } = useDeployment(id);
  const { mutate: deleteDeployment } = useDeleteDeployment();
  const { mutate: redeploy } = useRedeployment();

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner size={36} /></div>;
  if (!deployment) return <div className="text-center py-24 text-slate-500">Deployment not found.</div>;

  const handleDelete = () => {
    if (confirm("Delete this deployment? This cannot be undone.")) {
      deleteDeployment(id, { onSuccess: () => navigate("/dashboard") });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <StackIcon stack={deployment.stack} framework={deployment.framework} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{deployment.name}</h1>
              <StatusBadge status={deployment.status} />
            </div>
            <p className="text-slate-500 text-sm">{deployment.repoUrl}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {deployment.url && (
            <a href={deployment.url} target="_blank" rel="noreferrer" className="btn-secondary">
              <ExternalLink size={14} /> Open URL
            </a>
          )}
          <button onClick={() => redeploy(id)} className="btn-secondary">
            <RotateCcw size={14} /> Redeploy
          </button>
          <button onClick={handleDelete} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium text-sm transition-all">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Metadata */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Details</h2>
            <InfoRow label="ID"         value={id}                        mono />
            <InfoRow label="Stack"      value={`${deployment.stack} / ${deployment.framework}`} />
            <InfoRow label="Branch"     value={deployment.branch}         />
            <InfoRow label="Replicas"   value={deployment.replicas}       />
            <InfoRow label="Port"       value={deployment.port}           />
            <InfoRow label="Image"      value={deployment.imageName}      mono />
            <InfoRow label="K8s Name"   value={deployment.k8sName}        mono />
            <InfoRow label="Namespace"  value={deployment.namespace}      mono />
            <InfoRow label="Created"    value={deployment.createdAt ? format(new Date(deployment.createdAt), "MMM d, yyyy HH:mm") : "—"} />
            <InfoRow label="Deployed"   value={deployment.deployedAt ? formatDistanceToNow(new Date(deployment.deployedAt), { addSuffix: true }) : "—"} />
          </div>

          {deployment.error && (
            <div className="card p-4 border-red-500/30 bg-red-500/5">
              <p className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wider">Error</p>
              <p className="text-sm text-red-300 font-mono">{deployment.error}</p>
            </div>
          )}

          {Object.keys(deployment.envVars || {}).length > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Env Variables</h2>
              {Object.entries(deployment.envVars).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                  <span className="text-slate-400 text-xs font-mono">{k}</span>
                  <span className="text-slate-600 text-xs font-mono">••••••</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="lg:col-span-2 card overflow-hidden flex flex-col">
          <LogViewer deploymentId={id} status={deployment.status} />
        </div>
      </div>
    </div>
  );
}
