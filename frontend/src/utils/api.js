import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || "Network error";
    return Promise.reject(new Error(message));
  }
);

export const deploymentsApi = {
  list: (params) => api.get("/deployments", { params }),
  get: (id) => api.get(`/deployments/${id}`),
  create: (data) => api.post("/deployments", data),
  delete: (id) => api.delete(`/deployments/${id}`),
  redeploy: (id) => api.post(`/deployments/${id}/redeploy`),
  getLogs: (id, params) => api.get(`/logs/${id}`, { params }),
  getStatus: (id) => api.get(`/status/${id}`),
  getMetrics: (id) => api.get(`/status/${id}/metrics`),
};

export default api;
