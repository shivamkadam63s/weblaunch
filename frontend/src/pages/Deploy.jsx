import React from "react";
import { Rocket, Zap, Shield, Globe } from "lucide-react";
import DeployForm from "../components/deploy/DeployForm";

const FEATURES = [
  { icon: Zap,    title: "Auto Stack Detection", desc: "Node.js, Python, Go, Rust, Java, Ruby — detected automatically" },
  { icon: Globe,  title: "Instant Kubernetes",   desc: "Deployed to K8s with health checks, auto-scaling & load balancing" },
  { icon: Shield, title: "Secure & Isolated",    desc: "Each deployment runs in its own container with resource limits" },
];

export default function Deploy() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">New Deployment</h1>
        <p className="text-slate-500 text-sm mt-0.5">Paste a GitHub URL. We handle everything else.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Form */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Rocket size={18} className="text-brand-400" />
            <h2 className="font-semibold text-slate-200">Repository Details</h2>
          </div>
          <DeployForm />
        </div>

        {/* Info panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Supported Stacks</h3>
            <div className="space-y-2.5">
              {[
                ["⬢", "Node.js",  "Express, Next, React, Vue, Angular, Svelte, NestJS"],
                ["🐍", "Python",  "Django, Flask, FastAPI"],
                ["🐹", "Go",      "Any Go module"],
                ["⚙️", "Rust",   "Cargo projects"],
                ["☕", "Java",    "Spring Boot, Maven/Gradle"],
                ["💎", "Ruby",    "Ruby on Rails"],
                ["🌐", "Static", "HTML/CSS/JS sites"],
              ].map(([emoji, name, desc]) => (
                <div key={name} className="flex items-start gap-2.5 text-sm">
                  <span className="text-base w-5 text-center">{emoji}</span>
                  <div>
                    <span className="text-slate-300 font-medium">{name}</span>
                    <span className="text-slate-600"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-4 flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
