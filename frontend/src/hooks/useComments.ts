import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface Comment {
  id: string;
  claim_id: string;
  comment_text: string;
  comment_type: string;
  user_id?: string;
  user_name: string;
  user_role: string;
  visible_to_employee: boolean;
  created_at: string;
}

export interface CommentCreate {
  claim_id: string;
  comment_text: string;
  comment_type?: string;
  user_name: string;
  user_role: string;
  visible_to_employee?: boolean;
}

// Fetch comments for a claim
async function fetchComments(claimId: string): Promise<Comment[]> {
  const response = await fetch(`${API_BASE_URL}/comments/?claim_id=${claimId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }
  return response.json();
}

// Create a comment
async function createComment(comment: CommentCreate): Promise<Comment> {
  const response = await fetch(`${API_BASE_URL}/comments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(comment),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create comment');
  }
  
  return response.json();
}

// Delete a comment
async function deleteComment(commentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete comment');
  }
}

// Hook to fetch comments for a claim
export function useComments(claimId: string) {
  return useQuery({
    queryKey: ['comments', claimId],
    queryFn: () => fetchComments(claimId),
    enabled: !!claimId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Hook to create a comment
export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createComment,
    onSuccess: (_, variables) => {
      // Invalidate comments query to refetch
      queryClient.invalidateQueries({ queryKey: ['comments', variables.claim_id] });
    },
  });
}

// Hook to delete a comment
export function useDeleteComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      // Invalidate all comments queries
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}
