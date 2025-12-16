import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Extracted claim category from API
export interface ExtractedClaimCategory {
  id: string;
  policy_id: string;
  policy_name: string;
  policy_region: string;
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
}

// Fetch extracted claims from policies
async function fetchExtractedClaims(): Promise<ExtractedClaimCategory[]> {
  const response = await fetch(`${API_BASE_URL}/policies/extracted-claims`);
  if (!response.ok) {
    throw new Error('Failed to fetch extracted claims');
  }
  return response.json();
}

// Hook to get all extracted claims
export function useExtractedClaims() {
  return useQuery({
    queryKey: ['extracted-claims'],
    queryFn: fetchExtractedClaims,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get allowances filtered by region
export function useAllowancesByRegion(region: string | undefined) {
  return useQuery({
    queryKey: ['extracted-claims', 'allowances', region],
    queryFn: fetchExtractedClaims,
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
  return useQuery({
    queryKey: ['extracted-claims', 'reimbursements', region],
    queryFn: fetchExtractedClaims,
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
