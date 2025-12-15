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

// Fetch dashboard summary
async function fetchDashboardSummary(employeeId?: string): Promise<DashboardSummary> {
  const url = employeeId 
    ? `${API_BASE_URL}/dashboard/summary?employee_id=${employeeId}`
    : `${API_BASE_URL}/dashboard/summary`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard summary');
  }
  return response.json();
}

// Fetch claims by status
async function fetchClaimsByStatus(employeeId?: string): Promise<ClaimByStatus[]> {
  const url = employeeId 
    ? `${API_BASE_URL}/dashboard/claims-by-status?employee_id=${employeeId}`
    : `${API_BASE_URL}/dashboard/claims-by-status`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch claims by status');
  }
  return response.json();
}

// Fetch claims by category
async function fetchClaimsByCategory(employeeId?: string): Promise<ClaimByCategory[]> {
  const url = employeeId 
    ? `${API_BASE_URL}/dashboard/claims-by-category?employee_id=${employeeId}`
    : `${API_BASE_URL}/dashboard/claims-by-category`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch claims by category');
  }
  return response.json();
}

// Fetch recent activity
async function fetchRecentActivity(limit: number = 10, employeeId?: string): Promise<RecentActivity[]> {
  const url = employeeId 
    ? `${API_BASE_URL}/dashboard/recent-activity?limit=${limit}&employee_id=${employeeId}`
    : `${API_BASE_URL}/dashboard/recent-activity?limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch recent activity');
  }
  return response.json();
}

// Fetch AI metrics
async function fetchAIMetrics(): Promise<AIMetrics> {
  const response = await fetch(`${API_BASE_URL}/dashboard/ai-metrics`);
  if (!response.ok) {
    throw new Error('Failed to fetch AI metrics');
  }
  return response.json();
}

// Fetch pending approvals
async function fetchPendingApprovals(): Promise<PendingApprovals> {
  const response = await fetch(`${API_BASE_URL}/dashboard/pending-approvals`);
  if (!response.ok) {
    throw new Error('Failed to fetch pending approvals');
  }
  return response.json();
}

// Hooks
export function useDashboardSummary(employeeId?: string) {
  return useQuery({
    queryKey: ['dashboard-summary', employeeId],
    queryFn: () => fetchDashboardSummary(employeeId),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useClaimsByStatus(employeeId?: string) {
  return useQuery({
    queryKey: ['claims-by-status', employeeId],
    queryFn: () => fetchClaimsByStatus(employeeId),
    refetchInterval: 30000,
  });
}

export function useClaimsByCategory(employeeId?: string) {
  return useQuery({
    queryKey: ['claims-by-category', employeeId],
    queryFn: () => fetchClaimsByCategory(employeeId),
    refetchInterval: 30000,
  });
}

export function useRecentActivity(limit: number = 10, employeeId?: string) {
  return useQuery({
    queryKey: ['recent-activity', limit, employeeId],
    queryFn: () => fetchRecentActivity(limit, employeeId),
    refetchInterval: 15000, // Refetch every 15 seconds for more real-time data
  });
}

export function useAIMetrics() {
  return useQuery({
    queryKey: ['ai-metrics'],
    queryFn: fetchAIMetrics,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-approvals'],
    queryFn: fetchPendingApprovals,
    refetchInterval: 30000,
  });
}

// Fetch draft claims (AI suggestions)
async function fetchDraftClaims(employeeId?: string, limit: number = 5): Promise<RecentActivity[]> {
  const url = employeeId 
    ? `${API_BASE_URL}/dashboard/recent-activity?limit=${limit}&employee_id=${employeeId}&status=DRAFT`
    : `${API_BASE_URL}/dashboard/recent-activity?limit=${limit}&status=DRAFT`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch draft claims');
  }
  return response.json();
}

export function useDraftClaims(employeeId?: string, limit: number = 5) {
  return useQuery({
    queryKey: ['draft-claims', employeeId, limit],
    queryFn: () => fetchDraftClaims(employeeId, limit),
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

async function fetchAllowanceSummary(employeeId?: string): Promise<AllowanceSummary[]> {
  const url = employeeId 
    ? `${API_BASE_URL}/dashboard/allowance-summary?employee_id=${employeeId}`
    : `${API_BASE_URL}/dashboard/allowance-summary`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch allowance summary');
  }
  return response.json();
}

export function useAllowanceSummary(employeeId?: string) {
  return useQuery({
    queryKey: ['allowance-summary', employeeId],
    queryFn: () => fetchAllowanceSummary(employeeId),
    refetchInterval: 30000,
  });
}
