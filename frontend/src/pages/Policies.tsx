import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Loader2,
  RefreshCcw,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Types
interface PolicyCategory {
  id: string;
  tenant_id: string;
  policy_upload_id: string;
  category_name: string;
  category_code: string;
  category_type: 'REIMBURSEMENT' | 'ALLOWANCE';
  description?: string;
  max_amount?: number;
  min_amount?: number;
  currency: string;
  frequency_limit?: string;
  frequency_count?: number;
  eligibility_criteria: Record<string, unknown>;
  requires_receipt: boolean;
  requires_approval_above?: number;
  allowed_document_types: string[];
  submission_window_days?: number;
  is_active: boolean;
  display_order: number;
  source_text?: string;
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
}

interface PolicyUpload {
  id: string;
  tenant_id: string;
  policy_name: string;
  policy_number: string;
  description?: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  storage_path?: string;
  gcs_uri?: string;
  storage_type: string;
  status: string;
  extracted_text?: string;
  extraction_error?: string;
  extracted_at?: string;
  extracted_data: Record<string, unknown>;
  version: number;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  uploaded_by: string;
  approved_by?: string;
  approved_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  categories: PolicyCategory[];
}

interface PolicyUploadListItem {
  id: string;
  policy_name: string;
  policy_number: string;
  file_name: string;
  status: string;
  version: number;
  is_active: boolean;
  effective_from?: string;
  categories_count: number;
  uploaded_by: string;
  created_at: string;
}

// API Functions
async function fetchPolicies(): Promise<PolicyUploadListItem[]> {
  const response = await fetch(`${API_BASE_URL}/policies/`);
  if (!response.ok) {
    throw new Error('Failed to fetch policies');
  }
  return response.json();
}

async function fetchPolicy(id: string): Promise<PolicyUpload> {
  const response = await fetch(`${API_BASE_URL}/policies/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch policy');
  }
  return response.json();
}

async function uploadPolicy(data: FormData): Promise<PolicyUpload> {
  const response = await fetch(`${API_BASE_URL}/policies/upload`, {
    method: 'POST',
    body: data,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload policy');
  }
  return response.json();
}

async function approvePolicy(id: string, data: { review_notes?: string; effective_from?: string }): Promise<PolicyUpload> {
  const response = await fetch(`${API_BASE_URL}/policies/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to approve policy');
  }
  return response.json();
}

async function rejectPolicy(id: string, review_notes: string): Promise<PolicyUpload> {
  const response = await fetch(`${API_BASE_URL}/policies/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_notes }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reject policy');
  }
  return response.json();
}

async function reExtractPolicy(id: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/policies/${id}/reextract`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to re-extract policy');
  }
  return response.json();
}

async function uploadNewVersion(id: string, formData: FormData): Promise<PolicyUpload> {
  const response = await fetch(`${API_BASE_URL}/policies/${id}/new-version`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload new version');
  }
  return response.json();
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="outline" className="text-gray-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case 'AI_PROCESSING':
      return <Badge variant="outline" className="text-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    case 'EXTRACTED':
      return <Badge variant="outline" className="text-orange-600"><AlertCircle className="h-3 w-3 mr-1" />Needs Review</Badge>;
    case 'APPROVED':
      return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    case 'ACTIVE':
      return <Badge className="bg-green-100 text-green-700"><FileCheck className="h-3 w-3 mr-1" />Active</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Policies() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const newVersionFileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [uploadForm, setUploadForm] = useState({
    policy_name: '',
    description: '',
    file: null as File | null,
  });
  const [newVersionForm, setNewVersionForm] = useState({
    description: '',
    file: null as File | null,
  });
  const [approveNotes, setApproveNotes] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  // Queries
  const { data: policies, isLoading, error } = useQuery({
    queryKey: ['policies'],
    queryFn: fetchPolicies,
  });

  const { data: selectedPolicy, isLoading: isLoadingPolicy } = useQuery({
    queryKey: ['policy', selectedPolicyId],
    queryFn: () => selectedPolicyId ? fetchPolicy(selectedPolicyId) : null,
    enabled: !!selectedPolicyId && (isViewOpen || isApproveOpen),
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: uploadPolicy,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Policy uploaded successfully. AI extraction in progress.' });
      setIsUploadOpen(false);
      setUploadForm({ policy_name: '', description: '', file: null });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { review_notes?: string; effective_from?: string } }) => 
      approvePolicy(id, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Policy approved and activated.' });
      setIsApproveOpen(false);
      setApproveNotes('');
      setEffectiveFrom('');
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => rejectPolicy(id, notes),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Policy rejected.' });
      setIsRejectOpen(false);
      setRejectNotes('');
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const reExtractMutation = useMutation({
    mutationFn: reExtractPolicy,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Re-extraction started. Refresh in a moment.' });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const newVersionMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => uploadNewVersion(id, formData),
    onSuccess: () => {
      toast({ title: 'Success', description: 'New version uploaded successfully. AI extraction in progress.' });
      setIsNewVersionOpen(false);
      setNewVersionForm({ description: '', file: null });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleUpload = () => {
    if (!uploadForm.file || !uploadForm.policy_name) {
      toast({ title: 'Error', description: 'Please provide a policy name and file.', variant: 'destructive' });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('policy_name', uploadForm.policy_name);
    if (uploadForm.description) {
      formData.append('description', uploadForm.description);
    }
    formData.append('uploaded_by', user?.id || '');
    
    uploadMutation.mutate(formData);
  };

  const handleApprove = () => {
    if (!selectedPolicyId) return;
    approveMutation.mutate({
      id: selectedPolicyId,
      data: {
        review_notes: approveNotes || undefined,
        effective_from: effectiveFrom || undefined,
      },
    });
  };

  const handleReject = () => {
    if (!selectedPolicyId || !rejectNotes.trim()) {
      toast({ title: 'Error', description: 'Please provide rejection notes.', variant: 'destructive' });
      return;
    }
    rejectMutation.mutate({ id: selectedPolicyId, notes: rejectNotes });
  };

  const toggleCategoryExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleNewVersionUpload = () => {
    if (!newVersionForm.file || !selectedPolicyId) {
      toast({ title: 'Error', description: 'Please select a file.', variant: 'destructive' });
      return;
    }

    const formData = new FormData();
    formData.append('file', newVersionForm.file);
    if (newVersionForm.description) {
      formData.append('description', newVersionForm.description);
    }
    formData.append('uploaded_by', user?.id || '');
    
    newVersionMutation.mutate({ id: selectedPolicyId, formData });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <AlertCircle className="h-8 w-8 mr-2" />
        <span>Failed to load policies</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policy Management</h1>
          <p className="text-muted-foreground">
            Upload policy documents and manage extracted claim categories
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Policy Document</DialogTitle>
              <DialogDescription>
                Upload a policy document (PDF, DOCX, or image). AI will automatically extract claim categories and rules.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="policy_name">Policy Name *</Label>
                <Input
                  id="policy_name"
                  value={uploadForm.policy_name}
                  onChange={(e) => setUploadForm({ ...uploadForm, policy_name: e.target.value })}
                  placeholder="e.g., Travel & Expense Policy 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Brief description of the policy..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Policy Document *</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadForm({ ...uploadForm, file });
                      }
                    }}
                  />
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{uploadForm.file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(uploadForm.file.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG, PNG (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policies?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {policies?.filter(p => p.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {policies?.filter(p => p.status === 'EXTRACTED').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {policies?.reduce((sum, p) => sum + p.categories_count, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policies List */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Documents</CardTitle>
          <CardDescription>
            Uploaded policy documents and their extraction status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!policies || policies.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No policies uploaded</h3>
              <p className="text-muted-foreground mb-4">
                Upload a policy document to get started with AI-powered category extraction.
              </p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload First Policy
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{policy.policy_name}</p>
                        <p className="text-sm text-muted-foreground">{policy.policy_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{policy.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(policy.status)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{policy.categories_count} categories</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(policy.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPolicyId(policy.id);
                            setIsViewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {policy.status === 'EXTRACTED' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => {
                                setSelectedPolicyId(policy.id);
                                setIsApproveOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => {
                                setSelectedPolicyId(policy.id);
                                setIsRejectOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {policy.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Upload new version"
                            onClick={() => {
                              setSelectedPolicyId(policy.id);
                              setSelectedPolicyName(policy.policy_name);
                              setIsNewVersionOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Policy Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Policy Details</DialogTitle>
            <DialogDescription>
              {selectedPolicy?.policy_name} ({selectedPolicy?.policy_number})
            </DialogDescription>
          </DialogHeader>
          {isLoadingPolicy ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedPolicy ? (
            <div className="space-y-6">
              {/* Policy Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPolicy.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Version</Label>
                  <p className="mt-1">v{selectedPolicy.version}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">File</Label>
                  <p className="mt-1">{selectedPolicy.file_name} ({formatFileSize(selectedPolicy.file_size)})</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Uploaded</Label>
                  <p className="mt-1">{format(new Date(selectedPolicy.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>

              {selectedPolicy.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedPolicy.description}</p>
                </div>
              )}

              <Separator />

              {/* Extracted Categories */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Extracted Categories ({selectedPolicy.categories.length})
                </h3>
                {selectedPolicy.categories.length === 0 ? (
                  <p className="text-muted-foreground">No categories extracted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedPolicy.categories.map((category) => (
                      <Card key={category.id} className="overflow-hidden">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleCategoryExpand(category.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={category.category_type === 'REIMBURSEMENT' ? 'default' : 'secondary'}>
                              {category.category_type}
                            </Badge>
                            <div>
                              <p className="font-medium">{category.category_name}</p>
                              <p className="text-sm text-muted-foreground">{category.category_code}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {category.max_amount && (
                              <span className="text-sm">Max: ₹{category.max_amount.toLocaleString()}</span>
                            )}
                            {category.ai_confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(category.ai_confidence * 100)}% confidence
                              </Badge>
                            )}
                            {expandedCategories.has(category.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                        {expandedCategories.has(category.id) && (
                          <div className="border-t px-4 py-3 bg-muted/30">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="text-muted-foreground text-xs">Description</Label>
                                <p>{category.description || 'N/A'}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Frequency</Label>
                                <p>{category.frequency_limit || 'Unlimited'}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Receipt Required</Label>
                                <p>{category.requires_receipt ? 'Yes' : 'No'}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Submission Window</Label>
                                <p>{category.submission_window_days ? `${category.submission_window_days} days` : 'No limit'}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Allowed Documents</Label>
                                <p>{category.allowed_document_types.join(', ')}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Status</Label>
                                <p>{category.is_active ? 'Active' : 'Inactive'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {selectedPolicy.review_notes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Review Notes</Label>
                    <p className="mt-1">{selectedPolicy.review_notes}</p>
                  </div>
                </>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Policy Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Policy</DialogTitle>
            <DialogDescription>
              Approving will activate the extracted categories for claim submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input
                id="effective_from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approve_notes">Review Notes (Optional)</Label>
              <Textarea
                id="approve_notes"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Policy Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Policy</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this policy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject_notes">Rejection Notes *</Label>
              <Textarea
                id="reject_notes"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Explain why this policy is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={rejectMutation.isPending || !rejectNotes.trim()}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload New Version Dialog */}
      <Dialog open={isNewVersionOpen} onOpenChange={setIsNewVersionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription>
              Upload a new version for "{selectedPolicyName}". The current version will be archived when the new version is approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_version_description">Description (Optional)</Label>
              <Textarea
                id="new_version_description"
                value={newVersionForm.description}
                onChange={(e) => setNewVersionForm({ ...newVersionForm, description: e.target.value })}
                placeholder="What's changed in this version..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>New Policy Document *</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => newVersionFileInputRef.current?.click()}
              >
                <input
                  ref={newVersionFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewVersionForm({ ...newVersionForm, file });
                    }
                  }}
                />
                {newVersionForm.file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{newVersionForm.file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(newVersionForm.file.size)}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG, PNG (max 10MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsNewVersionOpen(false);
              setNewVersionForm({ description: '', file: null });
            }}>Cancel</Button>
            <Button onClick={handleNewVersionUpload} disabled={newVersionMutation.isPending || !newVersionForm.file}>
              {newVersionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload New Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
