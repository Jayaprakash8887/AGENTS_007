import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Extracted claim category from API (includes both PolicyCategory and CustomClaim)
export interface ExtractedClaimCategory {
  id: string;
  policy_id: string | null;  // null for custom claims
  policy_name: string;
  policy_region: string | null;
  policy_status: string;
  category_code: string;
  category_name: string;
  category_type: 'ALLOWANCE' | 'REIMBURSEMENT';
  max_amount: number | null;
  description: string | null;
  eligibility_criteria: {
    requirements?: string[];
    conditions?: string[];
    exclusions?: string[];
    allowance_frequency?: string;
    [key: string]: any;
  } | null;
  document_requirements: string[] | null;
  created_at: string;
  updated_at: string;
  is_custom_claim?: boolean;  // True if this is a custom claim (not from policy)
}

// Fetch extracted claims from policies
async function fetchExtractedClaims(tenantId?: string): Promise<ExtractedClaimCategory[]> {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenant_id', tenantId);
  
  const url = `${API_BASE_URL}/policies/extracted-claims${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch extracted claims');
  }
  return response.json();
}

// Hook to get all extracted claims
export function useExtractedClaims() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['extracted-claims', user?.tenant_id],
    queryFn: () => fetchExtractedClaims(user?.tenant_id),
    enabled: !!user?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get allowances filtered by region
export function useAllowancesByRegion(region: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['extracted-claims', 'allowances', region, user?.tenant_id],
    queryFn: () => fetchExtractedClaims(user?.tenant_id),
    enabled: !!user?.tenant_id,
    select: (data) => {
      // Filter by category type ALLOWANCE and matching region
      return data.filter(
        (category) =>
          category.category_type === 'ALLOWANCE' &&
          category.policy_status === 'ACTIVE' &&
          (!region || category.policy_region === region)
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get reimbursement categories filtered by region
export function useReimbursementsByRegion(region: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['extracted-claims', 'reimbursements', region, user?.tenant_id],
    queryFn: () => fetchExtractedClaims(user?.tenant_id),
    enabled: !!user?.tenant_id,
    select: (data) => {
      // Filter by category type REIMBURSEMENT and matching region
      return data.filter(
        (category) =>
          category.category_type === 'REIMBURSEMENT' &&
          category.policy_status === 'ACTIVE' &&
          (!region || category.policy_region === region)
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
