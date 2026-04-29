import React, { useEffect, useRef, useState } from "react";
import { getSocket } from "../../utils/socket";
import { deploymentsApi } from "../../utils/api";
import { Terminal, Download, ArrowDown } from "lucide-react";

const LOG_COLORS = {
  error: "text-red-400",
  warn:  "text-yellow-400",
  info:  "text-slate-300",
  debug: "text-slate-500",
};

export default function LogViewer({ deploymentId, status }) {
  const [logs, setLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // Load initial logs
  useEffect(() => {
    if (!deploymentId) return;
    deploymentsApi.getLogs(deploymentId).then(res => {
      setLogs(res.data || []);
    }).catch(() => {});
  }, [deploymentId]);

  // Subscribe to real-time logs
  useEffect(() => {
    if (!deploymentId) return;
    const socket = getSocket();
    socket.emit("subscribe:deployment", deploymentId);
    const handler = (log) => setLogs(prev => [...prev.slice(-999), log]);
    socket.on("log", handler);
    return () => {
      socket.off("log", handler);
      socket.emit("unsubscribe:deployment", deploymentId);
    };
  }, [deploymentId]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(atBottom);
  };

  const downloadLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `deployment-${deploymentId}-logs.txt`; a.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal size={15} />
          <span className="text-sm font-medium">Deployment Logs</span>
          <span className="badge bg-slate-700 text-slate-400">{logs.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {!autoScroll && (
            <button onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              className="btn-secondary py-1 text-xs gap-1">
              <ArrowDown size={12} /> Jump to bottom
            </button>
          )}
          <button onClick={downloadLogs} className="btn-secondary py-1 text-xs gap-1">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* Log content */}
      <div ref={containerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[#0d1117] p-4 font-mono text-xs leading-5 min-h-[300px] max-h-[500px]">
        {logs.length === 0 ? (
          <p className="text-slate-600 italic">Waiting for logs...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`log-line mb-0.5 ${LOG_COLORS[log.level] || LOG_COLORS.info}`}>
              <span className="text-slate-600 select-none mr-2">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              {log.message}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
