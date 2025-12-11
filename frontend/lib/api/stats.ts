import type { MetricsResponse, ServicesResponse, BusinessResponse } from "@/lib/types/stats"

const SYNTHESYS_BASE = "https://synthesys-backend.fly.dev"

export async function getSystemMetrics(): Promise<MetricsResponse> {
  const res = await fetch(`${SYNTHESYS_BASE}/api/flywatchdev/metrics`)
  if (!res.ok) {
    throw new Error(`Failed to fetch metrics: ${res.status}`)
  }
  return res.json()
}

export async function getServicesStats(): Promise<ServicesResponse> {
  const res = await fetch(`${SYNTHESYS_BASE}/api/flywatchdev/services`)
  if (!res.ok) {
    throw new Error(`Failed to fetch services: ${res.status}`)
  }
  return res.json()
}

export async function getBusinessStats(): Promise<BusinessResponse> {
  const res = await fetch(`${SYNTHESYS_BASE}/api/flywatchdev/business`)
  if (!res.ok) {
    throw new Error(`Failed to fetch business stats: ${res.status}`)
  }
  return res.json()
}

export async function getAllStats(): Promise<{
  metrics: MetricsResponse | null
  services: ServicesResponse | null
  business: BusinessResponse | null
  errors: string[]
}> {
  const errors: string[] = []

  const [metricsResult, servicesResult, businessResult] = await Promise.allSettled([
    getSystemMetrics(),
    getServicesStats(),
    getBusinessStats(),
  ])

  return {
    metrics: metricsResult.status === "fulfilled" ? metricsResult.value : (errors.push((metricsResult as PromiseRejectedResult).reason?.message || "Metrics fetch failed"), null),
    services: servicesResult.status === "fulfilled" ? servicesResult.value : (errors.push((servicesResult as PromiseRejectedResult).reason?.message || "Services fetch failed"), null),
    business: businessResult.status === "fulfilled" ? businessResult.value : (errors.push((businessResult as PromiseRejectedResult).reason?.message || "Business fetch failed"), null),
    errors,
  }
}
