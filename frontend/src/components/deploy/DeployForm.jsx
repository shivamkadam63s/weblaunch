import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Github, Plus, Trash2, ChevronDown, ChevronUp, Rocket } from "lucide-react";
import { useCreateDeployment } from "../../hooks/useDeployments";
import LoadingSpinner from "../common/LoadingSpinner";

export default function DeployForm() {
  const navigate = useNavigate();
  const { mutate: createDeployment, isPending } = useCreateDeployment();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({ repoUrl: "", branch: "", replicas: 1, projectName: "", envVars: [] });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.repoUrl) e.repoUrl = "Repository URL is required";
    else if (!form.repoUrl.includes("github.com")) e.repoUrl = "Only GitHub URLs supported";
    if (form.projectName && !/^[a-z0-9-]+$/.test(form.projectName)) e.projectName = "Only lowercase letters, numbers, hyphens";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const envVarsObj = form.envVars.reduce((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value;
      return acc;
    }, {});
    createDeployment({ repoUrl: form.repoUrl, branch: form.branch, replicas: form.replicas, projectName: form.projectName || undefined, envVars: envVarsObj }, {
      onSuccess: (res) => navigate(`/deployments/${res.data.deploymentId}`),
    });
  };

  const addEnvVar = () => setForm(f => ({ ...f, envVars: [...f.envVars, { key: "", value: "" }] }));
  const removeEnvVar = (i) => setForm(f => ({ ...f, envVars: f.envVars.filter((_, idx) => idx !== i) }));
  const updateEnvVar = (i, field, val) => setForm(f => ({ ...f, envVars: f.envVars.map((ev, idx) => idx === i ? { ...ev, [field]: val } : ev) }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Repo URL */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">GitHub Repository URL *</label>
        <div className="relative">
          <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="url" placeholder="https://github.com/username/repo"
            className={`input pl-9 ${errors.repoUrl ? "border-red-500 focus:ring-red-500" : ""}`}
            value={form.repoUrl} onChange={e => setForm(f => ({ ...f, repoUrl: e.target.value }))} />
        </div>
        {errors.repoUrl && <p className="text-red-400 text-xs mt-1">{errors.repoUrl}</p>}
        <p className="text-slate-500 text-xs mt-1">Paste any public GitHub repository URL. WebLaunch will auto-detect the stack.</p>
      </div>

      {/* Branch */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Branch</label>
          <input className="input" placeholder="main" value={form.branch}
            onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Replicas</label>
          <input type="number" min={1} max={10} className="input" value={form.replicas}
            onChange={e => setForm(f => ({ ...f, replicas: +e.target.value }))} />
        </div>
      </div>

      {/* Advanced toggle */}
      <button type="button" onClick={() => setShowAdvanced(v => !v)}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Advanced Options
      </button>

      {showAdvanced && (
        <div className="space-y-5 animate-slide-up">
          {/* Project name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Name (optional)</label>
            <input className={`input ${errors.projectName ? "border-red-500" : ""}`} placeholder="my-project"
              value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value.toLowerCase() }))} />
            {errors.projectName && <p className="text-red-400 text-xs mt-1">{errors.projectName}</p>}
          </div>

          {/* Env vars */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Environment Variables</label>
              <button type="button" onClick={addEnvVar} className="btn-secondary py-1 text-xs">
                <Plus size={13} /> Add Variable
              </button>
            </div>
            {form.envVars.length === 0 && <p className="text-slate-600 text-xs">No environment variables defined.</p>}
            <div className="space-y-2">
              {form.envVars.map((ev, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" placeholder="KEY" value={ev.key}
                    onChange={e => updateEnvVar(i, "key", e.target.value)} />
                  <input className="input" placeholder="VALUE" value={ev.value}
                    onChange={e => updateEnvVar(i, "value", e.target.value)} />
                  <button type="button" onClick={() => removeEnvVar(i)}
                    className="px-2 text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full justify-center py-3">
        {isPending ? <><LoadingSpinner size={16} /> Analyzing & Queuing...</> : <><Rocket size={16} /> Deploy Repository</>}
      </button>
    </form>
  );
}
