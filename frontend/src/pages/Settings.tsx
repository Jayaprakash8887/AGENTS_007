import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Types
interface GeneralSettings {
  ai_processing: boolean;
  auto_approval: boolean;
  default_currency: string;
  fiscal_year_start: string;
  email_notifications: boolean;
  notification_email: string;
}

// API functions
async function fetchGeneralSettings(tenantId?: string): Promise<GeneralSettings> {
  const params = tenantId ? `?tenant_id=${tenantId}` : '';
  const response = await fetch(`${API_BASE_URL}/settings/general${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
}

async function updateGeneralSettings(settings: Partial<GeneralSettings>, tenantId?: string): Promise<GeneralSettings> {
  const params = tenantId ? `?tenant_id=${tenantId}` : '';
  const response = await fetch(`${API_BASE_URL}/settings/general${params}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error('Failed to update settings');
  }
  return response.json();
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch settings from backend
  const { data: savedSettings, isLoading, error } = useQuery({
    queryKey: ['generalSettings', user?.tenantId],
    queryFn: () => fetchGeneralSettings(user?.tenantId),
    enabled: !!user?.tenantId,
  });

  // Local state for form
  const [formData, setFormData] = useState<GeneralSettings>({
    ai_processing: true,
    auto_approval: true,
    default_currency: 'inr',
    fiscal_year_start: 'apr',
    email_notifications: true,
    notification_email: '',
  });

  // Track if form has changes
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when saved settings load
  useEffect(() => {
    if (savedSettings) {
      setFormData(savedSettings);
      setHasChanges(false);
    }
  }, [savedSettings]);

  // Check for changes
  useEffect(() => {
    if (savedSettings) {
      const changed = JSON.stringify(formData) !== JSON.stringify(savedSettings);
      setHasChanges(changed);
    }
  }, [formData, savedSettings]);

  // Mutation for saving settings
  const saveMutation = useMutation({
    mutationFn: (settings: Partial<GeneralSettings>) => updateGeneralSettings(settings, user?.tenantId),
    onSuccess: (data) => {
      queryClient.setQueryData(['generalSettings', user?.tenantId], data);
      setHasChanges(false);
      toast({
        title: 'Settings saved',
        description: 'Your settings have been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle form changes
  const handleChange = (key: keyof GeneralSettings, value: boolean | string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Handle save
  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  // Handle cancel
  const handleCancel = () => {
    if (savedSettings) {
      setFormData(savedSettings);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Failed to load settings</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['generalSettings'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and integrations
          </p>
        </div>

        {/* Save/Cancel buttons - shown when there are changes */}
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saveMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className={`space-y-4 ${hasChanges ? 'pb-24' : ''}`}>
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Basic configuration for the expense system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AI-Powered Processing</Label>
                <p className="text-sm text-muted-foreground">
                  Enable AI for OCR and validation
                </p>
              </div>
              <Switch
                checked={formData.ai_processing}
                onCheckedChange={(checked) => handleChange('ai_processing', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Auto-approve high confidence claims (≥95%)
                </p>
              </div>
              <Switch
                checked={formData.auto_approval}
                onCheckedChange={(checked) => handleChange('auto_approval', checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={formData.default_currency}
                onValueChange={(value) => handleChange('default_currency', value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="inr">INR (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fiscal Year Start</Label>
              <Select
                value={formData.fiscal_year_start}
                onValueChange={(value) => handleChange('fiscal_year_start', value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jan">January</SelectItem>
                  <SelectItem value="apr">April</SelectItem>
                  <SelectItem value="jul">July</SelectItem>
                  <SelectItem value="oct">October</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure system-wide notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for claim updates
                </p>
              </div>
              <Switch
                checked={formData.email_notifications}
                onCheckedChange={(checked) => handleChange('email_notifications', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notification Email</Label>
              <Input
                placeholder="noreply@company.com"
                value={formData.notification_email}
                onChange={(e) => handleChange('notification_email', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Spacer to prevent overlap with floating save bar */}
        {hasChanges && <div className="h-20" />}

        {/* Floating save bar at bottom when changes exist */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 flex justify-end gap-2 z-50">
            <div className="container mx-auto flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                You have unsaved changes
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saveMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
