import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  X,
  Loader2,
  Globe,
  Clock,
  Calendar,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
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
  enable_auto_approval: boolean;
  auto_skip_after_manager: boolean;
  auto_approval_threshold: number;
  max_auto_approval_amount: number;
  policy_compliance_threshold: number;
  default_currency: string;
  fiscal_year_start: string;
  email_notifications: boolean;
  notification_email: string;
  timezone: string;
  date_format: string;
  number_format: string;
  working_days: string;
  week_start: string;
  session_timeout: string;
}

interface SettingOption {
  code: string;
  label: string;
  [key: string]: any;
}

interface AllSettingsOptions {
  timezones: { options: SettingOption[]; default: string };
  date_formats: { options: SettingOption[]; default: string };
  number_formats: { options: SettingOption[]; default: string };
  working_days: { options: SettingOption[]; default: string };
  week_start: { options: SettingOption[]; default: string };
  session_timeouts: { options: SettingOption[]; default: string };
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

async function fetchAllSettingsOptions(): Promise<AllSettingsOptions> {
  const response = await fetch(`${API_BASE_URL}/settings/options/all`);
  if (!response.ok) {
    throw new Error('Failed to fetch settings options');
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

  // Fetch all available options
  const { data: optionsData } = useQuery({
    queryKey: ['allSettingsOptions'],
    queryFn: fetchAllSettingsOptions,
  });

  // Local state for form
  const [formData, setFormData] = useState<GeneralSettings>({
    ai_processing: true,
    auto_approval: true,
    enable_auto_approval: true,
    auto_skip_after_manager: true,
    auto_approval_threshold: 95,
    max_auto_approval_amount: 5000,
    policy_compliance_threshold: 80,
    default_currency: 'inr',
    fiscal_year_start: 'apr',
    email_notifications: true,
    notification_email: '',
    timezone: 'IST',
    date_format: 'DD/MM/YYYY',
    number_format: 'en-IN',
    working_days: 'mon-fri',
    week_start: 'monday',
    session_timeout: '480',
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
  const handleChange = (key: keyof GeneralSettings, value: boolean | string | number) => {
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

  // Format currency amount based on locale
  const formatAmount = (amount: number) => {
    const format = NUMBER_FORMAT_CHOICES[formData.number_format] || NUMBER_FORMAT_CHOICES['en-IN'];
    return new Intl.NumberFormat(formData.number_format, {
      style: 'currency',
      currency: formData.default_currency.toUpperCase(),
    }).format(amount);
  };

  // Number format options (fallback)
  const NUMBER_FORMAT_CHOICES: Record<string, { label: string }> = {
    'en-IN': { label: 'Indian (1,00,000.00)' },
    'en-US': { label: 'US/UK (100,000.00)' },
    'de-DE': { label: 'German (100.000,00)' },
    'fr-FR': { label: 'French (100 000,00)' },
    'es-ES': { label: 'Spanish (100.000,00)' },
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
        {/* General Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              General Settings
            </CardTitle>
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
                  Automatically approve claims that meet threshold criteria
                </p>
              </div>
              <Switch
                checked={formData.auto_approval}
                onCheckedChange={(checked) => handleChange('auto_approval', checked)}
              />
            </div>
            {formData.auto_approval && (
              <>
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  {/* Admin Toggle for Enable/Disable Auto-Approval Feature */}
                  <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-600" />
                        Enable Auto-Approval Feature (Admin)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Master switch to enable/disable all auto-approval functionality
                      </p>
                    </div>
                    <Switch
                      checked={formData.enable_auto_approval}
                      onCheckedChange={(checked) => handleChange('enable_auto_approval', checked)}
                    />
                  </div>
                  {formData.enable_auto_approval && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>AI Confidence Threshold</Label>
                          <span className="text-sm font-medium">{formData.auto_approval_threshold}%</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Minimum AI confidence score required for auto-approval
                        </p>
                        <Slider
                          value={[formData.auto_approval_threshold]}
                          onValueChange={(value) => handleChange('auto_approval_threshold', value[0])}
                          min={50}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>50%</span>
                          <span>75%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum Auto-Approval Amount</Label>
                        <p className="text-sm text-muted-foreground">
                          Claims above this amount require manual approval
                        </p>
                        <Input
                          type="number"
                          value={formData.max_auto_approval_amount}
                          onChange={(e) => handleChange('max_auto_approval_amount', parseFloat(e.target.value) || 0)}
                          className="w-[200px]"
                        />
                      </div>
                      <Separator />
                      {/* Auto-Skip HR/Finance Toggle */}
                      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                        <div className="space-y-0.5">
                          <Label>Auto-Skip HR/Finance After Manager Approval</Label>
                          <p className="text-sm text-muted-foreground">
                            When enabled, claims that pass manager approval will skip HR and Finance review if confidence and amount thresholds are met
                          </p>
                        </div>
                        <Switch
                          checked={formData.auto_skip_after_manager}
                          onCheckedChange={(checked) => handleChange('auto_skip_after_manager', checked)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Policy Compliance Threshold</Label>
                <span className="text-sm font-medium">{formData.policy_compliance_threshold}%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Minimum AI confidence score for a claim to be considered policy-compliant. Claims below this threshold are flagged for review.
              </p>
              <Slider
                value={[formData.policy_compliance_threshold]}
                onValueChange={(value) => handleChange('policy_compliance_threshold', value[0])}
                min={50}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
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
                  <SelectItem value="aed">AED (د.إ)</SelectItem>
                  <SelectItem value="sgd">SGD (S$)</SelectItem>
                  <SelectItem value="jpy">JPY (¥)</SelectItem>
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

        {/* Regional Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Settings
            </CardTitle>
            <CardDescription>
              Timezone, date format, and localization preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <p className="text-sm text-muted-foreground">
                Default timezone for all dates and times
              </p>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleChange('timezone', value)}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {optionsData?.timezones.options.map((tz) => (
                    <SelectItem key={tz.code} value={tz.code}>
                      {tz.label}
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="IST">IST (Asia/Kolkata)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">EST (America/New_York)</SelectItem>
                      <SelectItem value="PST">PST (America/Los_Angeles)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Date Format</Label>
              <p className="text-sm text-muted-foreground">
                How dates are displayed throughout the system
              </p>
              <Select
                value={formData.date_format}
                onValueChange={(value) => handleChange('date_format', value)}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {optionsData?.date_formats.options.map((df) => (
                    <SelectItem key={df.code} value={df.code}>
                      {df.label} ({df.example})
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Number Format</Label>
              <p className="text-sm text-muted-foreground">
                How numbers and currency amounts are displayed
              </p>
              <Select
                value={formData.number_format}
                onValueChange={(value) => handleChange('number_format', value)}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select number format" />
                </SelectTrigger>
                <SelectContent>
                  {optionsData?.number_formats.options.map((nf) => (
                    <SelectItem key={nf.code} value={nf.code}>
                      {nf.label}
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="en-IN">Indian (1,00,000.00)</SelectItem>
                      <SelectItem value="en-US">US/UK (100,000.00)</SelectItem>
                      <SelectItem value="de-DE">German (100.000,00)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Working Days Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Working Days
            </CardTitle>
            <CardDescription>
              Configure work week and calendar preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Working Days</Label>
              <p className="text-sm text-muted-foreground">
                Which days are considered working days
              </p>
              <Select
                value={formData.working_days}
                onValueChange={(value) => handleChange('working_days', value)}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select working days" />
                </SelectTrigger>
                <SelectContent>
                  {optionsData?.working_days.options.map((wd) => (
                    <SelectItem key={wd.code} value={wd.code}>
                      {wd.label}
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="mon-fri">Monday - Friday</SelectItem>
                      <SelectItem value="mon-sat">Monday - Saturday</SelectItem>
                      <SelectItem value="sun-thu">Sunday - Thursday</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Week Starts On</Label>
              <p className="text-sm text-muted-foreground">
                First day of the week in calendars
              </p>
              <Select
                value={formData.week_start}
                onValueChange={(value) => handleChange('week_start', value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {optionsData?.week_start.options.map((ws) => (
                    <SelectItem key={ws.code} value={ws.code}>
                      {ws.label}
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Session and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Session Timeout</Label>
              <p className="text-sm text-muted-foreground">
                How long users stay logged in without activity
              </p>
              <Select
                value={formData.session_timeout}
                onValueChange={(value) => handleChange('session_timeout', value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select timeout" />
                </SelectTrigger>
                <SelectContent>
                  {optionsData?.session_timeouts.options.map((st) => (
                    <SelectItem key={st.code} value={st.code}>
                      {st.label}
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Notification Settings
            </CardTitle>
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
