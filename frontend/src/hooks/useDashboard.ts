import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:8000/api/v1';

interface DashboardSummary {
  total_claims: number;
  pending_claims: number;
  approved_this_month: number;
  total_amount_claimed: number;
  average_processing_time_days: number;
}

interface ClaimByStatus {
  status: string;
  count: number;
}

interface ClaimByCategory {
  category: string;
  count: number;
  total_amount: number;
}

interface RecentActivity {
  id: string;
  claim_number: string;
  employee_name: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  updated_at: string;
}

interface AIMetrics {
  total_ai_processed: number;
  average_confidence_score: number;
  success_rate_percentage: number;
  total_time_saved_hours: number;
}

interface PendingApprovals {
  manager_pending: number;
  hr_pending: number;
  finance_pending: number;
  total_pending: number;
}

// Helper function to format currency
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // Default to INR
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Helper function to build URL with optional params
function buildUrl(base: string, params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}

// Fetch dashboard summary
async function fetchDashboardSummary(employeeId?: string, tenantId?: string): Promise<DashboardSummary> {
  const url = buildUrl(`${API_BASE_URL}/dashboard/summary`, { employee_id: employeeId, tenant_id: tenantId });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard summary');
  }
  return response.json();
}

// Fetch claims by status
async function fetchClaimsByStatus(employeeId?: string, tenantId?: string): Promise<ClaimByStatus[]> {
  const url = buildUrl(`${API_BASE_URL}/dashboard/claims-by-status`, { employee_id: employeeId, tenant_id: tenantId });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch claims by status');
  }
  return response.json();
}

// Fetch claims by category
async function fetchClaimsByCategory(employeeId?: string, tenantId?: string): Promise<ClaimByCategory[]> {
  const url = buildUrl(`${API_BASE_URL}/dashboard/claims-by-category`, { employee_id: employeeId, tenant_id: tenantId });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch claims by category');
  }
  return response.json();
}

// Fetch recent activity
async function fetchRecentActivity(limit: number = 10, employeeId?: string, tenantId?: string): Promise<RecentActivity[]> {
  const url = buildUrl(`${API_BASE_URL}/dashboard/recent-activity`, { limit, employee_id: employeeId, tenant_id: tenantId });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch recent activity');
  }
  return response.json();
}

// Fetch AI metrics
async function fetchAIMetrics(tenantId?: string): Promise<AIMetrics> {
  const url = buildUrl(`${API_BASE_URL}/dashboard/ai-metrics`, { tenant_id: tenantId });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch AI metrics');
  }
  return response.json();
}

// Fetch pending approvals
async function fetchPendingApprovals(tenantId?: string): Promise<PendingApprovals> {
  const url = buildUrl(`${API_BASE_URL}/dashboard/pending-approvals`, { tenant_id: tenantId });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch pending approvals');
  }
  return response.json();
}

// Hooks
export function useDashboardSummary(employeeId?: string, tenantId?: string) {
  return useQuery({
    queryKey: ['dashboard-summary', employeeId, tenantId],
    queryFn: () => fetchDashboardSummary(employeeId, tenantId),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useClaimsByStatus(employeeId?: string, tenantId?: string) {
  return useQuery({
    queryKey: ['claims-by-status', employeeId, tenantId],
    queryFn: () => fetchClaimsByStatus(employeeId, tenantId),
    refetchInterval: 30000,
  });
}

export function useClaimsByCategory(employeeId?: string, tenantId?: string) {
  return useQuery({
    queryKey: ['claims-by-category', employeeId, tenantId],
    queryFn: () => fetchClaimsByCategory(employeeId, tenantId),
    refetchInterval: 30000,
  });
}

export function useRecentActivity(limit: number = 10, employeeId?: string, tenantId?: string) {
  return useQuery({
    queryKey: ['recent-activity', limit, employeeId, tenantId],
    queryFn: () => fetchRecentActivity(limit, employeeId, tenantId),
    refetchInterval: 15000, // Refetch every 15 seconds for more real-time data
  });
}

export function useAIMetrics(tenantId?: string) {
  return useQuery({
    queryKey: ['ai-metrics', tenantId],
    queryFn: () => fetchAIMetrics(tenantId),
    refetchInterval: 60000, // Refetch every minute
  });
}

export function usePendingApprovals(tenantId?: string) {
  return useQuery({
    queryKey: ['pending-approvals', tenantId],
    queryFn: () => fetchPendingApprovals(tenantId),
    refetchInterval: 30000,
  });
}

// Fetch draft claims (AI suggestions)
async function fetchDraftClaims(employeeId?: string, limit: number = 5, tenantId?: string): Promise<RecentActivity[]> {
  const url = buildUrl(`${API_BASE_URL}/dashboard/recent-activity`, { limit, employee_id: employeeId, tenant_id: tenantId, status: 'DRAFT' });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch draft claims');
  }
  return response.json();
}

export function useDraftClaims(employeeId?: string, limit: number = 5, tenantId?: string) {
  return useQuery({
    queryKey: ['draft-claims', employeeId, limit, tenantId],
    queryFn: () => fetchDraftClaims(employeeId, limit, tenantId),
    refetchInterval: 15000,
  });
}

// Fetch allowance summary
interface AllowanceSummary {
  category: string;
  total: number;
  pending: number;
  approved: number;
  total_value: number;
}

async function fetchAllowanceSummary(employeeId?: string, tenantId?: string): Promise<AllowanceSummary[]> {
  const url = buildUrl(`${API_BASE_URL}/dashboard/allowance-summary`, { employee_id: employeeId, tenant_id: tenantId });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch allowance summary');
  }
  return response.json();
}

export function useAllowanceSummary(employeeId?: string, tenantId?: string) {
  return useQuery({
    queryKey: ['allowance-summary', employeeId, tenantId],
    queryFn: () => fetchAllowanceSummary(employeeId, tenantId),
    refetchInterval: 30000,
  });
}
