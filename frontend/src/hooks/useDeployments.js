import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deploymentsApi } from "../utils/api";
import toast from "react-hot-toast";

export function useDeployments(params) {
  return useQuery({
    queryKey: ["deployments", params],
    queryFn: () => deploymentsApi.list(params),
    select: (d) => d.data,
    refetchInterval: 10000,
  });
}

export function useDeployment(id) {
  return useQuery({
    queryKey: ["deployment", id],
    queryFn: () => deploymentsApi.get(id),
    select: (d) => d.data,
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useCreateDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deploymentsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deployments"] }); toast.success("Deployment queued!"); },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deploymentsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deployments"] }); toast.success("Deployment deleted"); },
    onError: (err) => toast.error(err.message),
  });
}

export function useRedeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deploymentsApi.redeploy,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deployments"] }); toast.success("Redeployment queued!"); },
    onError: (err) => toast.error(err.message),
  });
}
