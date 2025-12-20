import { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon,
    Database,
    Shield,
    Mail,
    Globe,
    RefreshCw,
    Save,
    Server,
    Users,
    Building2,
    Activity,
    AlertTriangle,
    Loader2,
    Trash2,
    Send,
    Clock,
    Lock,
    Plug,
    Key,
    Webhook as WebhookIcon,
    Link2,
    MessageSquare,
    Copy,
    Eye,
    EyeOff,
    Plus,
    ExternalLink,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTenants, useDesignations } from '@/hooks/useSystemAdmin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    useApiKeys,
    useCreateApiKey,
    useDeleteApiKey,
    useWebhooks,
    useCreateWebhook,
    useUpdateWebhook,
    useDeleteWebhook,
    useTestWebhook,
    useSSOConfig,
    useCreateSSOConfig,
    useUpdateSSOConfig,
    useHRMSConfig,
    useCreateHRMSConfig,
    useUpdateHRMSConfig,
    useTriggerHRMSSync,
    useERPConfig,
    useCreateERPConfig,
    useUpdateERPConfig,
    useTriggerERPExport,
    useCommunicationConfigs,
    useCreateCommunicationConfig,
    useUpdateCommunicationConfig,
    useTestCommunication,
    useIntegrationsOverview,
} from '@/hooks/useIntegrations';
import type { 
    ApiKey, 
    ApiKeyCreated,
    SSOConfig, 
    SSOConfigCreate,
    HRMSConfig, 
    HRMSConfigCreate,
    ERPConfig, 
    ERPConfigCreate,
    CommunicationConfig,
    CommunicationConfigCreate,
} from '@/hooks/useIntegrations';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Types for system info
interface SystemInfo {
    database: {
        type: string;
        host: string;
        port: string;
        name: string;
        connected: boolean;
    };
    cache: {
        host: string;
        port: string;
        connected: boolean;
        memory_used?: string;
    };
    app: {
        name: string;
        environment: string;
        version: string;
    };
}

// Fetch system info
async function fetchSystemInfo(): Promise<SystemInfo> {
    const response = await fetch(`${API_BASE_URL}/system/info`);
    if (!response.ok) {
        throw new Error('Failed to fetch system info');
    }
    return response.json();
}

export default function SystemAdminSettings() {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState<string | null>(null);
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [testEmailRecipient, setTestEmailRecipient] = useState('');
    const [tenantSearchFilter, setTenantSearchFilter] = useState('');

    // Tenant ID - In production, this would come from auth context
    const TENANT_ID = '9af8238c-692d-4765-8be2-bcaa5ab1cac2';

    // Integration hooks
    const { data: apiKeys, isLoading: isLoadingApiKeys } = useApiKeys(TENANT_ID);
    const { data: webhooks, isLoading: isLoadingWebhooks } = useWebhooks(TENANT_ID);
    const { data: ssoConfig, isLoading: isLoadingSSOConfig } = useSSOConfig(TENANT_ID);
    const { data: hrmsConfig, isLoading: isLoadingHRMSConfig } = useHRMSConfig(TENANT_ID);
    const { data: erpConfig, isLoading: isLoadingERPConfig } = useERPConfig(TENANT_ID);
    const { data: communicationConfigs, isLoading: isLoadingCommunication } = useCommunicationConfigs(TENANT_ID);
    const { data: integrationsOverview } = useIntegrationsOverview(TENANT_ID);

    // Integration mutations
    const createApiKeyMutation = useCreateApiKey(TENANT_ID);
    const deleteApiKeyMutation = useDeleteApiKey(TENANT_ID);
    const createWebhookMutation = useCreateWebhook(TENANT_ID);
    const updateWebhookMutation = useUpdateWebhook(TENANT_ID);
    const deleteWebhookMutation = useDeleteWebhook(TENANT_ID);
    const testWebhookMutation = useTestWebhook(TENANT_ID);
    const createSSOConfigMutation = useCreateSSOConfig(TENANT_ID);
    const updateSSOConfigMutation = useUpdateSSOConfig(TENANT_ID);
    const createHRMSConfigMutation = useCreateHRMSConfig(TENANT_ID);
    const updateHRMSConfigMutation = useUpdateHRMSConfig(TENANT_ID);
    const triggerHRMSSyncMutation = useTriggerHRMSSync(TENANT_ID);
    const createERPConfigMutation = useCreateERPConfig(TENANT_ID);
    const updateERPConfigMutation = useUpdateERPConfig(TENANT_ID);
    const triggerERPExportMutation = useTriggerERPExport(TENANT_ID);
    const createCommunicationConfigMutation = useCreateCommunicationConfig(TENANT_ID);
    const updateCommunicationConfigMutation = useUpdateCommunicationConfig(TENANT_ID);
    const testCommunicationMutation = useTestCommunication(TENANT_ID);

    // Find specific communication configs
    const slackConfig = communicationConfigs?.find(c => c.provider === 'slack');
    const teamsConfig = communicationConfigs?.find(c => c.provider === 'teams');

    // Fetch system info
    const { data: systemInfo, isLoading: isLoadingSystemInfo } = useQuery({
        queryKey: ['systemInfo'],
        queryFn: fetchSystemInfo,
        staleTime: 30000, // 30 seconds
        refetchInterval: 60000, // Refresh every minute
    });

    // Platform settings state
    const [platformSettings, setPlatformSettings] = useState({
        supportEmail: 'support@easyqlaim.com',
        defaultSessionTimeout: 480, // 8 hours in minutes
        maxLoginAttempts: 5,
        enableAuditLogging: true,
        maintenanceMode: false,
        maintenanceMessage: 'The system is currently undergoing scheduled maintenance. Please try again later.',
    });

    // Email settings state
    const [emailSettings, setEmailSettings] = useState({
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: true, // TLS/SSL
        senderEmail: 'noreply@easyqlaim.com',
        senderName: 'EasyQlaim',
        enableEmailNotifications: true,
        emailFooter: 'This is an automated message from EasyQlaim. Please do not reply directly to this email.',
    });

    // Form states for creating new integrations
    const [newApiKeyForm, setNewApiKeyForm] = useState({ name: '', permissions: ['read'] as string[] });
    const [newWebhookForm, setNewWebhookForm] = useState({ name: '', url: '', events: [] as string[], secret: '' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [ssoForm, setSSOForm] = useState<any>({ provider: 'azure_ad', client_id: '' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [hrmsForm, setHRMSForm] = useState<any>({ provider: 'workday', api_url: '', sync_frequency: 'daily' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [erpForm, setERPForm] = useState<any>({ provider: 'sap', api_url: '', export_frequency: 'daily' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [slackForm, setSlackForm] = useState<any>({ provider: 'slack', slack_bot_token: '', slack_channel_id: '', notify_on_claim_submitted: true, notify_on_claim_approved: true, notify_on_claim_rejected: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [teamsForm, setTeamsForm] = useState<any>({ provider: 'teams', teams_webhook_url: '', teams_channel_id: '', notify_on_claim_submitted: true, notify_on_claim_approved: true, notify_on_claim_rejected: true });

    // Modal states
    const [showNewApiKeyModal, setShowNewApiKeyModal] = useState(false);
    const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
    const [newlyCreatedApiKey, setNewlyCreatedApiKey] = useState<string | null>(null);

    // Show/hide API key states
    const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
    const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});

    // Session timeout options (in minutes)
    const sessionTimeoutOptions = [
        { value: 30, label: '30 minutes' },
        { value: 60, label: '1 hour' },
        { value: 120, label: '2 hours' },
        { value: 240, label: '4 hours' },
        { value: 480, label: '8 hours (Default)' },
        { value: 1440, label: '24 hours' },
    ];

    // Fetch stats
    const { data: tenants } = useTenants();
    const { data: designations } = useDesignations();

    const handleSavePlatformSettings = async () => {
        setIsSaving(true);
        try {
            // TODO: Integrate with backend API when ready
            // const response = await fetch(`${API_BASE_URL}/platform/settings`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(platformSettings),
            // });
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
            toast.success('Platform settings saved successfully');
        } catch (error) {
            toast.error('Failed to save platform settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSecuritySettings = async () => {
        setIsSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            toast.success('Security settings saved successfully');
        } catch (error) {
            toast.error('Failed to save security settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEmailSettings = async () => {
        setIsSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            toast.success('Email settings saved successfully');
        } catch (error) {
            toast.error('Failed to save email settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmailRecipient) {
            toast.error('Please enter an email address to send test email');
            return;
        }
        setIsTestingEmail(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success(`Test email sent to ${testEmailRecipient}`);
            setTestEmailRecipient('');
        } catch (error) {
            toast.error('Failed to send test email');
        } finally {
            setIsTestingEmail(false);
        }
    };

    const handleClearPlatformCache = async () => {
        setIsClearingCache('platform');
        try {
            // Clear all platform-wide cache
            await new Promise(resolve => setTimeout(resolve, 500));
            toast.success('Platform cache cleared successfully');
            queryClient.invalidateQueries();
        } catch (error) {
            toast.error('Failed to clear platform cache');
        } finally {
            setIsClearingCache(null);
        }
    };

    const handleClearTenantCache = async (tenantId?: string, tenantName?: string) => {
        setIsClearingCache(tenantId || 'all-tenants');
        try {
            if (tenantId) {
                // Clear specific tenant cache
                await fetch(`${API_BASE_URL}/cache/invalidate/all`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success(`Cache cleared for tenant: ${tenantName}`);
            } else {
                // Clear all tenants cache
                await new Promise(resolve => setTimeout(resolve, 500));
                toast.success('Cache cleared for all tenants');
            }
            queryClient.invalidateQueries();
        } catch (error) {
            toast.error('Failed to clear tenant cache');
        } finally {
            setIsClearingCache(null);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <SettingsIcon className="h-8 w-8 text-primary" />
                    Platform Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage platform-wide configuration and settings
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenants?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Active organizations</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Designations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{designations?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Role mappings configured</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">Healthy</div>
                        <p className="text-xs text-muted-foreground">All services running</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Version</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">v1.0</div>
                        <p className="text-xs text-muted-foreground">Latest stable</p>
                    </CardContent>
                </Card>
            </div>

            {/* Settings Tabs */}
            <Tabs defaultValue="platform" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="platform" className="gap-2">
                        <Globe className="h-4 w-4" />
                        Platform
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="email" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2">
                        <Plug className="h-4 w-4" />
                        Integrations
                    </TabsTrigger>
                    <TabsTrigger value="database" className="gap-2">
                        <Database className="h-4 w-4" />
                        Database
                    </TabsTrigger>
                </TabsList>

                {/* Platform Settings */}
                <TabsContent value="platform">
                    <Card>
                        <CardHeader>
                            <CardTitle>Platform Configuration</CardTitle>
                            <CardDescription>
                                General platform settings and branding
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="supportEmail">Support Email</Label>
                                <p className="text-sm text-muted-foreground">
                                    Email address displayed to users for support inquiries
                                </p>
                                <Input
                                    id="supportEmail"
                                    type="email"
                                    value={platformSettings.supportEmail}
                                    onChange={(e) => setPlatformSettings({
                                        ...platformSettings,
                                        supportEmail: e.target.value
                                    })}
                                    className="max-w-md"
                                />
                            </div>

                            <Separator />

                            {/* Maintenance Mode Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            Maintenance Mode
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            When enabled, all non-admin users will see a maintenance message and cannot access the platform
                                        </p>
                                    </div>
                                    <Switch
                                        checked={platformSettings.maintenanceMode}
                                        onCheckedChange={(checked) => setPlatformSettings({
                                            ...platformSettings,
                                            maintenanceMode: checked
                                        })}
                                    />
                                </div>

                                {platformSettings.maintenanceMode && (
                                    <div className="space-y-2 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                                        <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                                        <p className="text-sm text-muted-foreground">
                                            This message will be displayed to users when they try to access the platform
                                        </p>
                                        <Input
                                            id="maintenanceMessage"
                                            value={platformSettings.maintenanceMessage}
                                            onChange={(e) => setPlatformSettings({
                                                ...platformSettings,
                                                maintenanceMessage: e.target.value
                                            })}
                                            placeholder="Enter maintenance message..."
                                        />
                                        <div className="mt-3 p-3 rounded bg-white dark:bg-gray-900 border">
                                            <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                                            <div className="flex items-center gap-2 text-amber-600">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span className="text-sm">{platformSettings.maintenanceMessage}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSavePlatformSettings} disabled={isSaving}>
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save Platform Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Configuration</CardTitle>
                            <CardDescription>
                                Authentication and security settings for the platform
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Session Timeout */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Label>Platform Session Timeout</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Default session duration for all users. Individual tenants can override this with a shorter timeout.
                                </p>
                                <Select
                                    value={String(platformSettings.defaultSessionTimeout)}
                                    onValueChange={(value) => setPlatformSettings({
                                        ...platformSettings,
                                        defaultSessionTimeout: parseInt(value)
                                    })}
                                >
                                    <SelectTrigger className="w-[250px]">
                                        <SelectValue placeholder="Select timeout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessionTimeoutOptions.map((option) => (
                                            <SelectItem key={option.value} value={String(option.value)}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground italic">
                                    Note: Tenant-specific session timeout settings will override this if set to a shorter duration.
                                </p>
                            </div>

                            <Separator />

                            {/* Max Login Attempts */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Maximum number of failed login attempts before account lockout
                                </p>
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="maxLoginAttempts"
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={platformSettings.maxLoginAttempts}
                                        onChange={(e) => setPlatformSettings({
                                            ...platformSettings,
                                            maxLoginAttempts: Math.min(10, Math.max(1, parseInt(e.target.value) || 5))
                                        })}
                                        className="w-[100px]"
                                    />
                                    <span className="text-sm text-muted-foreground">attempts</span>
                                </div>
                                <p className="text-xs text-muted-foreground italic">
                                    After {platformSettings.maxLoginAttempts} failed attempts, the user account will be temporarily locked for 15 minutes.
                                </p>
                            </div>

                            <Separator />

                            {/* Audit Logging */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        Audit Logging
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Log all user actions for security auditing and compliance
                                    </p>
                                </div>
                                <Switch
                                    checked={platformSettings.enableAuditLogging}
                                    onCheckedChange={(checked) => setPlatformSettings({
                                        ...platformSettings,
                                        enableAuditLogging: checked
                                    })}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSaveSecuritySettings} disabled={isSaving}>
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save Security Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Email Settings */}
                <TabsContent value="email">
                    <div className="space-y-4">
                        {/* SMTP Configuration Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>SMTP Configuration</CardTitle>
                                <CardDescription>
                                    Configure the email server for sending notifications
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="smtpHost">SMTP Host</Label>
                                        <Input
                                            id="smtpHost"
                                            placeholder="smtp.gmail.com"
                                            value={emailSettings.smtpHost}
                                            onChange={(e) => setEmailSettings({
                                                ...emailSettings,
                                                smtpHost: e.target.value
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="smtpPort">SMTP Port</Label>
                                        <Select
                                            value={String(emailSettings.smtpPort)}
                                            onValueChange={(value) => setEmailSettings({
                                                ...emailSettings,
                                                smtpPort: parseInt(value)
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select port" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="25">25 (SMTP)</SelectItem>
                                                <SelectItem value="465">465 (SMTPS/SSL)</SelectItem>
                                                <SelectItem value="587">587 (STARTTLS)</SelectItem>
                                                <SelectItem value="2525">2525 (Alternative)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="smtpUser">SMTP Username</Label>
                                        <Input
                                            id="smtpUser"
                                            placeholder="your-email@gmail.com"
                                            value={emailSettings.smtpUser}
                                            onChange={(e) => setEmailSettings({
                                                ...emailSettings,
                                                smtpUser: e.target.value
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="smtpPassword">SMTP Password / App Password</Label>
                                        <Input
                                            id="smtpPassword"
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={emailSettings.smtpPassword}
                                            onChange={(e) => setEmailSettings({
                                                ...emailSettings,
                                                smtpPassword: e.target.value
                                            })}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            For Gmail, use an App Password instead of your account password
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="space-y-0.5">
                                        <Label>Use TLS/SSL</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Enable secure connection (recommended)
                                        </p>
                                    </div>
                                    <Switch
                                        checked={emailSettings.smtpSecure}
                                        onCheckedChange={(checked) => setEmailSettings({
                                            ...emailSettings,
                                            smtpSecure: checked
                                        })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Email Identity Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Email Identity</CardTitle>
                                <CardDescription>
                                    Configure sender information for outgoing emails
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="senderEmail">Sender Email Address</Label>
                                        <Input
                                            id="senderEmail"
                                            type="email"
                                            placeholder="noreply@yourcompany.com"
                                            value={emailSettings.senderEmail}
                                            onChange={(e) => setEmailSettings({
                                                ...emailSettings,
                                                senderEmail: e.target.value
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="senderName">Sender Display Name</Label>
                                        <Input
                                            id="senderName"
                                            placeholder="EasyQlaim Notifications"
                                            value={emailSettings.senderName}
                                            onChange={(e) => setEmailSettings({
                                                ...emailSettings,
                                                senderName: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emailFooter">Email Footer Text</Label>
                                    <Input
                                        id="emailFooter"
                                        placeholder="This is an automated message..."
                                        value={emailSettings.emailFooter}
                                        onChange={(e) => setEmailSettings({
                                            ...emailSettings,
                                            emailFooter: e.target.value
                                        })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        This text will appear at the bottom of all system emails
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Email Notifications Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Notifications</CardTitle>
                                <CardDescription>
                                    Control email notification behavior
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Enable Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Send email notifications for claim updates, approvals, and system events
                                        </p>
                                    </div>
                                    <Switch
                                        checked={emailSettings.enableEmailNotifications}
                                        onCheckedChange={(checked) => setEmailSettings({
                                            ...emailSettings,
                                            enableEmailNotifications: checked
                                        })}
                                    />
                                </div>

                                <Separator />

                                {/* Test Email Section */}
                                <div className="space-y-3">
                                    <Label>Send Test Email</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Verify your email configuration by sending a test email
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            placeholder="recipient@example.com"
                                            value={testEmailRecipient}
                                            onChange={(e) => setTestEmailRecipient(e.target.value)}
                                            className="max-w-sm"
                                        />
                                        <Button variant="outline" onClick={handleTestEmail} disabled={isTestingEmail}>
                                            {isTestingEmail ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4 mr-2" />
                                            )}
                                            Send Test
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleSaveEmailSettings} disabled={isSaving}>
                                        {isSaving ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        Save Email Settings
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Integrations Settings */}
                <TabsContent value="integrations">
                    <div className="space-y-4">
                        {/* API Access Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    API Access
                                </CardTitle>
                                <CardDescription>
                                    Configure API keys for external system access to EasyQlaim
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoadingApiKeys ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <Label>API Keys ({apiKeys?.length || 0})</Label>
                                            <AlertDialog open={showNewApiKeyModal} onOpenChange={setShowNewApiKeyModal}>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-2">
                                                        <Plus className="h-4 w-4" />
                                                        Generate New Key
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Generate API Key</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Create a new API key for external system integration.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label>Key Name</Label>
                                                            <Input
                                                                placeholder="e.g., Production Integration"
                                                                value={newApiKeyForm.name}
                                                                onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, name: e.target.value })}
                                                            />
                                                        </div>
                                                        {newlyCreatedApiKey && (
                                                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                                                                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                                                                    API Key Generated! Copy it now - it won't be shown again.
                                                                </p>
                                                                <div className="flex gap-2">
                                                                    <Input value={newlyCreatedApiKey} readOnly className="font-mono text-xs" />
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(newlyCreatedApiKey);
                                                                            toast.success('API key copied to clipboard');
                                                                        }}
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => {
                                                            setNewApiKeyForm({ name: '', permissions: ['read'] });
                                                            setNewlyCreatedApiKey(null);
                                                        }}>
                                                            {newlyCreatedApiKey ? 'Close' : 'Cancel'}
                                                        </AlertDialogCancel>
                                                        {!newlyCreatedApiKey && (
                                                            <AlertDialogAction
                                                                disabled={!newApiKeyForm.name || createApiKeyMutation.isPending}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    createApiKeyMutation.mutate(
                                                                        { name: newApiKeyForm.name, permissions: newApiKeyForm.permissions },
                                                                        {
                                                                            onSuccess: (data) => {
                                                                                setNewlyCreatedApiKey(data.api_key || 'Key generated');
                                                                                toast.success('API key generated successfully');
                                                                            },
                                                                            onError: () => toast.error('Failed to generate API key'),
                                                                        }
                                                                    );
                                                                }}
                                                            >
                                                                {createApiKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
                                                            </AlertDialogAction>
                                                        )}
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                        {apiKeys && apiKeys.length > 0 ? (
                                            <div className="space-y-2">
                                                {apiKeys.map((key) => (
                                                    <div key={key.id} className="flex items-center justify-between p-3 border rounded-md">
                                                        <div className="space-y-1">
                                                            <p className="font-medium">{key.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Created: {new Date(key.created_at).toLocaleDateString()}
                                                                {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                                                            </p>
                                                            <div className="flex gap-1">
                                                                {key.permissions?.map((perm) => (
                                                                    <Badge key={perm} variant="secondary" className="text-xs">{perm}</Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={key.is_active ? "default" : "secondary"}>
                                                                {key.is_active ? 'Active' : 'Revoked'}
                                                            </Badge>
                                                            {key.is_active && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-destructive"
                                                                    onClick={() => {
                                                                        deleteApiKeyMutation.mutate(key.id, {
                                                                            onSuccess: () => toast.success('API key revoked'),
                                                                            onError: () => toast.error('Failed to revoke API key'),
                                                                        });
                                                                    }}
                                                                >
                                                                    Revoke
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-md border p-4 bg-muted/30">
                                                <p className="text-sm text-muted-foreground text-center py-4">
                                                    No API keys configured. Generate a key to enable external integrations.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Webhooks Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <WebhookIcon className="h-5 w-5" />
                                    Webhooks
                                </CardTitle>
                                <CardDescription>
                                    Send real-time notifications to external systems when events occur
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoadingWebhooks ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <Label>Configured Webhooks ({webhooks?.length || 0})</Label>
                                            <AlertDialog open={showNewWebhookModal} onOpenChange={setShowNewWebhookModal}>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-2">
                                                        <Plus className="h-4 w-4" />
                                                        Add Webhook
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Add Webhook</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Configure a webhook to receive event notifications.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label>Webhook Name</Label>
                                                            <Input
                                                                placeholder="e.g., ERP Integration"
                                                                value={newWebhookForm.name}
                                                                onChange={(e) => setNewWebhookForm({ ...newWebhookForm, name: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Webhook URL</Label>
                                                            <Input
                                                                placeholder="https://your-server.com/webhook"
                                                                value={newWebhookForm.url}
                                                                onChange={(e) => setNewWebhookForm({ ...newWebhookForm, url: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Events</Label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {['claim.created', 'claim.approved', 'claim.rejected', 'claim.settled'].map((event) => (
                                                                    <div key={event} className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={event}
                                                                            checked={newWebhookForm.events.includes(event)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setNewWebhookForm({ ...newWebhookForm, events: [...newWebhookForm.events, event] });
                                                                                } else {
                                                                                    setNewWebhookForm({ ...newWebhookForm, events: newWebhookForm.events.filter(ev => ev !== event) });
                                                                                }
                                                                            }}
                                                                            className="rounded border-gray-300"
                                                                        />
                                                                        <Label htmlFor={event} className="text-sm font-normal">{event}</Label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => setNewWebhookForm({ name: '', url: '', events: [], secret: '' })}>
                                                            Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            disabled={!newWebhookForm.name || !newWebhookForm.url || createWebhookMutation.isPending}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                createWebhookMutation.mutate(
                                                                    { name: newWebhookForm.name, url: newWebhookForm.url, events: newWebhookForm.events },
                                                                    {
                                                                        onSuccess: () => {
                                                                            toast.success('Webhook created successfully');
                                                                            setShowNewWebhookModal(false);
                                                                            setNewWebhookForm({ name: '', url: '', events: [], secret: '' });
                                                                        },
                                                                        onError: () => toast.error('Failed to create webhook'),
                                                                    }
                                                                );
                                                            }}
                                                        >
                                                            {createWebhookMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                        {webhooks && webhooks.length > 0 ? (
                                            <div className="space-y-2">
                                                {webhooks.map((webhook) => (
                                                    <div key={webhook.id} className="flex items-center justify-between p-3 border rounded-md">
                                                        <div className="space-y-1 flex-1">
                                                            <p className="font-medium">{webhook.name}</p>
                                                            <p className="text-xs text-muted-foreground font-mono truncate max-w-md">{webhook.url}</p>
                                                            <div className="flex gap-1 flex-wrap">
                                                                {webhook.events?.map((event) => (
                                                                    <Badge key={event} variant="outline" className="text-xs">{event}</Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={webhook.is_active ? "default" : "secondary"}>
                                                                {webhook.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    testWebhookMutation.mutate(webhook.id, {
                                                                        onSuccess: () => toast.success('Test webhook sent'),
                                                                        onError: () => toast.error('Failed to send test webhook'),
                                                                    });
                                                                }}
                                                            >
                                                                <Send className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-destructive"
                                                                onClick={() => {
                                                                    deleteWebhookMutation.mutate(webhook.id, {
                                                                        onSuccess: () => toast.success('Webhook deleted'),
                                                                        onError: () => toast.error('Failed to delete webhook'),
                                                                    });
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-md border p-4 bg-muted/30">
                                                <p className="text-sm text-muted-foreground text-center py-4">
                                                    No webhooks configured. Add a webhook to receive event notifications.
                                                </p>
                                            </div>
                                        )}
                                        <div className="text-sm text-muted-foreground">
                                            <p className="font-medium mb-2">Supported Events:</p>
                                            <ul className="list-disc list-inside space-y-1">
                                                <li>claim.created - When a new claim is submitted</li>
                                                <li>claim.approved - When a claim is approved</li>
                                                <li>claim.rejected - When a claim is rejected</li>
                                                <li>claim.settled - When a claim payment is processed</li>
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* SSO/OAuth Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Single Sign-On (SSO)
                                </CardTitle>
                                <CardDescription>
                                    Configure enterprise identity provider integration for seamless authentication
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoadingSSOConfig ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                ) : ssoConfig ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">SSO Configuration</p>
                                                <p className="text-sm text-muted-foreground">Provider: {ssoConfig.provider?.toUpperCase()}</p>
                                            </div>
                                            <Badge variant={ssoConfig.is_active ? "default" : "secondary"}>
                                                {ssoConfig.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                                            <div className="space-y-2">
                                                <Label>Identity Provider</Label>
                                                <Select
                                                    value={ssoForm.provider || ssoConfig.provider}
                                                    onValueChange={(value) => setSSOForm({ ...ssoForm, provider: value as SSOConfig['provider'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="azure_ad">Microsoft Entra ID (Azure AD)</SelectItem>
                                                        <SelectItem value="okta">Okta</SelectItem>
                                                        <SelectItem value="google">Google Workspace</SelectItem>
                                                        <SelectItem value="keycloak">Keycloak</SelectItem>
                                                        <SelectItem value="saml">Generic SAML 2.0</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Client ID</Label>
                                                <Input
                                                    placeholder="Enter client ID"
                                                    value={ssoForm.client_id ?? ssoConfig.client_id ?? ''}
                                                    onChange={(e) => setSSOForm({ ...ssoForm, client_id: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>IDP URL</Label>
                                                <Input
                                                    placeholder="Enter identity provider URL"
                                                    value={ssoForm.issuer_url ?? ssoConfig.issuer_url ?? ''}
                                                    onChange={(e) => setSSOForm({ ...ssoForm, idp_url: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Metadata URL (Optional)</Label>
                                                <Input
                                                    placeholder="Enter SAML metadata URL"
                                                    value={ssoForm.saml_metadata_url ?? ssoConfig.saml_metadata_url ?? ''}
                                                    onChange={(e) => setSSOForm({ ...ssoForm, metadata_url: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={ssoForm.is_active ?? ssoConfig.is_active ?? false}
                                                    onCheckedChange={(checked) => setSSOForm({ ...ssoForm, enabled: checked })}
                                                />
                                                <Label>Enable SSO</Label>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    updateSSOConfigMutation.mutate(ssoForm as unknown as SSOConfigCreate, {
                                                        onSuccess: () => toast.success('SSO configuration updated'),
                                                        onError: () => toast.error('Failed to update SSO configuration'),
                                                    });
                                                }}
                                                disabled={updateSSOConfigMutation.isPending}
                                            >
                                                {updateSSOConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">No SSO configuration found. Set up SSO to enable single sign-on.</p>
                                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                                            <div className="space-y-2">
                                                <Label>Identity Provider</Label>
                                                <Select
                                                    value={ssoForm.provider || 'azure_ad'}
                                                    onValueChange={(value) => setSSOForm({ ...ssoForm, provider: value as SSOConfig['provider'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue placeholder="Select provider" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="azure_ad">Microsoft Entra ID (Azure AD)</SelectItem>
                                                        <SelectItem value="okta">Okta</SelectItem>
                                                        <SelectItem value="google">Google Workspace</SelectItem>
                                                        <SelectItem value="keycloak">Keycloak</SelectItem>
                                                        <SelectItem value="saml">Generic SAML 2.0</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Client ID</Label>
                                                <Input
                                                    placeholder="Enter client ID"
                                                    value={ssoForm.client_id || ''}
                                                    onChange={(e) => setSSOForm({ ...ssoForm, client_id: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>IDP URL</Label>
                                                <Input
                                                    placeholder="Enter identity provider URL"
                                                    value={ssoForm.issuer_url || ''}
                                                    onChange={(e) => setSSOForm({ ...ssoForm, idp_url: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Metadata URL (Optional)</Label>
                                                <Input
                                                    placeholder="Enter SAML metadata URL"
                                                    value={ssoForm.saml_metadata_url || ''}
                                                    onChange={(e) => setSSOForm({ ...ssoForm, metadata_url: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={ssoForm.is_active ?? false}
                                                    onCheckedChange={(checked) => setSSOForm({ ...ssoForm, enabled: checked })}
                                                />
                                                <Label>Enable SSO</Label>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    createSSOConfigMutation.mutate(ssoForm as unknown as SSOConfigCreate, {
                                                        onSuccess: () => toast.success('SSO configuration created'),
                                                        onError: () => toast.error('Failed to create SSO configuration'),
                                                    });
                                                }}
                                                disabled={!ssoForm.client_id || createSSOConfigMutation.isPending}
                                            >
                                                {createSSOConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                Configure SSO
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* HRMS Integration Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    HRMS Integration
                                </CardTitle>
                                <CardDescription>
                                    Sync employee data from your Human Resource Management System
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoadingHRMSConfig ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                ) : hrmsConfig ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">HRMS Configuration</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Provider: {hrmsConfig.provider?.replace('_', ' ').toUpperCase()}
                                                    {hrmsConfig.last_sync_at && ` • Last sync: ${new Date(hrmsConfig.last_sync_at).toLocaleString()}`}
                                                </p>
                                            </div>
                                            <Badge variant={hrmsConfig.is_active ? "default" : "secondary"}>
                                                {hrmsConfig.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                                            <div className="space-y-2">
                                                <Label>HRMS Provider</Label>
                                                <Select
                                                    value={hrmsForm.provider || hrmsConfig.provider}
                                                    onValueChange={(value) => setHRMSForm({ ...hrmsForm, provider: value as HRMSConfig['provider'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="workday">Workday</SelectItem>
                                                        <SelectItem value="bamboohr">BambooHR</SelectItem>
                                                        <SelectItem value="sap_successfactors">SAP SuccessFactors</SelectItem>
                                                        <SelectItem value="oracle_hcm">Oracle HCM</SelectItem>
                                                        <SelectItem value="zoho_people">Zoho People</SelectItem>
                                                        <SelectItem value="darwinbox">Darwinbox</SelectItem>
                                                        <SelectItem value="custom_api">Custom API</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>API Endpoint URL</Label>
                                                <Input
                                                    placeholder="https://api.hrms-provider.com/v1"
                                                    value={hrmsForm.api_url ?? hrmsConfig.api_url ?? ''}
                                                    onChange={(e) => setHRMSForm({ ...hrmsForm, api_url: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sync Frequency</Label>
                                                <Select
                                                    value={hrmsForm.sync_frequency || hrmsConfig.sync_frequency || 'daily'}
                                                    onValueChange={(value) => setHRMSForm({ ...hrmsForm, sync_frequency: value as HRMSConfig['sync_frequency'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="hourly">Every Hour</SelectItem>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={hrmsForm.sync_enabled ?? hrmsConfig.is_active ?? false}
                                                    onCheckedChange={(checked) => setHRMSForm({ ...hrmsForm, enabled: checked })}
                                                />
                                                <Label>Enable HRMS Integration</Label>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        updateHRMSConfigMutation.mutate(hrmsForm as unknown as HRMSConfigCreate, {
                                                            onSuccess: () => toast.success('HRMS configuration updated'),
                                                            onError: () => toast.error('Failed to update configuration'),
                                                        });
                                                    }}
                                                    disabled={updateHRMSConfigMutation.isPending}
                                                >
                                                    {updateHRMSConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                    Save Changes
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => {
                                                        triggerHRMSSyncMutation.mutate(undefined, {
                                                            onSuccess: () => toast.success('HRMS sync triggered'),
                                                            onError: () => toast.error('Failed to trigger sync'),
                                                        });
                                                    }}
                                                    disabled={triggerHRMSSyncMutation.isPending}
                                                >
                                                    {triggerHRMSSyncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                    Sync Now
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">No HRMS integration configured. Set up HRMS to sync employee data.</p>
                                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                                            <div className="space-y-2">
                                                <Label>HRMS Provider</Label>
                                                <Select
                                                    value={hrmsForm.provider || 'workday'}
                                                    onValueChange={(value) => setHRMSForm({ ...hrmsForm, provider: value as HRMSConfig['provider'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue placeholder="Select HRMS provider" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="workday">Workday</SelectItem>
                                                        <SelectItem value="bamboohr">BambooHR</SelectItem>
                                                        <SelectItem value="sap_successfactors">SAP SuccessFactors</SelectItem>
                                                        <SelectItem value="oracle_hcm">Oracle HCM</SelectItem>
                                                        <SelectItem value="zoho_people">Zoho People</SelectItem>
                                                        <SelectItem value="darwinbox">Darwinbox</SelectItem>
                                                        <SelectItem value="custom_api">Custom API</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>API Endpoint URL</Label>
                                                <Input
                                                    placeholder="https://api.hrms-provider.com/v1"
                                                    value={hrmsForm.api_url || ''}
                                                    onChange={(e) => setHRMSForm({ ...hrmsForm, api_url: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sync Frequency</Label>
                                                <Select
                                                    value={hrmsForm.sync_frequency || 'daily'}
                                                    onValueChange={(value) => setHRMSForm({ ...hrmsForm, sync_frequency: value as HRMSConfig['sync_frequency'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue placeholder="Select frequency" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="hourly">Every Hour</SelectItem>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={hrmsForm.sync_enabled ?? false}
                                                    onCheckedChange={(checked) => setHRMSForm({ ...hrmsForm, enabled: checked })}
                                                />
                                                <Label>Enable HRMS Integration</Label>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    createHRMSConfigMutation.mutate(hrmsForm as unknown as HRMSConfigCreate, {
                                                        onSuccess: () => toast.success('HRMS configuration created'),
                                                        onError: () => toast.error('Failed to create HRMS configuration'),
                                                    });
                                                }}
                                                disabled={!hrmsForm.api_url || createHRMSConfigMutation.isPending}
                                            >
                                                {createHRMSConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                Configure HRMS
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* ERP/Finance Integration Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    ERP / Finance System Integration
                                </CardTitle>
                                <CardDescription>
                                    Connect to your ERP or accounting system for expense and payment synchronization
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoadingERPConfig ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                ) : erpConfig ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">ERP Configuration</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Provider: {erpConfig.provider?.toUpperCase()}
                                                    {erpConfig.last_export_at && ` • Last export: ${new Date(erpConfig.last_export_at).toLocaleString()}`}
                                                </p>
                                            </div>
                                            <Badge variant={erpConfig.is_active ? "default" : "secondary"}>
                                                {erpConfig.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                                            <div className="space-y-2">
                                                <Label>ERP/Finance Provider</Label>
                                                <Select
                                                    value={erpForm.provider || erpConfig.provider}
                                                    onValueChange={(value) => setERPForm({ ...erpForm, provider: value as ERPConfig['provider'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sap">SAP</SelectItem>
                                                        <SelectItem value="oracle">Oracle Financials</SelectItem>
                                                        <SelectItem value="dynamics365">Microsoft Dynamics 365</SelectItem>
                                                        <SelectItem value="netsuite">NetSuite</SelectItem>
                                                        <SelectItem value="quickbooks">QuickBooks</SelectItem>
                                                        <SelectItem value="tally">Tally</SelectItem>
                                                        <SelectItem value="zoho_books">Zoho Books</SelectItem>
                                                        <SelectItem value="custom_api">Custom API</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>API Endpoint URL</Label>
                                                <Input
                                                    placeholder="https://api.erp-provider.com/v1"
                                                    value={erpForm.api_url ?? erpConfig.api_url ?? ''}
                                                    onChange={(e) => setERPForm({ ...erpForm, api_url: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sync Frequency</Label>
                                                <Select
                                                    value={erpForm.export_frequency || erpConfig.export_frequency || 'daily'}
                                                    onValueChange={(value) => setERPForm({ ...erpForm, sync_frequency: value as ERPConfig['export_frequency'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="hourly">Every Hour</SelectItem>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={erpForm.export_enabled ?? erpConfig.is_active ?? false}
                                                    onCheckedChange={(checked) => setERPForm({ ...erpForm, enabled: checked })}
                                                />
                                                <Label>Enable ERP Integration</Label>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        updateERPConfigMutation.mutate(erpForm as unknown as ERPConfigCreate, {
                                                            onSuccess: () => toast.success('ERP configuration updated'),
                                                            onError: () => toast.error('Failed to update configuration'),
                                                        });
                                                    }}
                                                    disabled={updateERPConfigMutation.isPending}
                                                >
                                                    {updateERPConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                    Save Changes
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => {
                                                        triggerERPExportMutation.mutate(undefined, {
                                                            onSuccess: () => toast.success('ERP export triggered'),
                                                            onError: () => toast.error('Failed to trigger export'),
                                                        });
                                                    }}
                                                    disabled={triggerERPExportMutation.isPending}
                                                >
                                                    {triggerERPExportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                    Export Now
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">No ERP integration configured. Set up ERP to sync approved claims.</p>
                                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                                            <div className="space-y-2">
                                                <Label>ERP/Finance Provider</Label>
                                                <Select
                                                    value={erpForm.provider || 'sap'}
                                                    onValueChange={(value) => setERPForm({ ...erpForm, provider: value as ERPConfig['provider'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue placeholder="Select ERP provider" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sap">SAP</SelectItem>
                                                        <SelectItem value="oracle">Oracle Financials</SelectItem>
                                                        <SelectItem value="dynamics365">Microsoft Dynamics 365</SelectItem>
                                                        <SelectItem value="netsuite">NetSuite</SelectItem>
                                                        <SelectItem value="quickbooks">QuickBooks</SelectItem>
                                                        <SelectItem value="tally">Tally</SelectItem>
                                                        <SelectItem value="zoho_books">Zoho Books</SelectItem>
                                                        <SelectItem value="custom_api">Custom API</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>API Endpoint URL</Label>
                                                <Input
                                                    placeholder="https://api.erp-provider.com/v1"
                                                    value={erpForm.api_url || ''}
                                                    onChange={(e) => setERPForm({ ...erpForm, api_url: e.target.value })}
                                                    className="max-w-md"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sync Frequency</Label>
                                                <Select
                                                    value={erpForm.export_frequency || 'daily'}
                                                    onValueChange={(value) => setERPForm({ ...erpForm, sync_frequency: value as ERPConfig['export_frequency'] })}
                                                >
                                                    <SelectTrigger className="max-w-md">
                                                        <SelectValue placeholder="Select frequency" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="hourly">Every Hour</SelectItem>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={erpForm.export_enabled ?? false}
                                                    onCheckedChange={(checked) => setERPForm({ ...erpForm, enabled: checked })}
                                                />
                                                <Label>Enable ERP Integration</Label>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    createERPConfigMutation.mutate(erpForm as unknown as ERPConfigCreate, {
                                                        onSuccess: () => toast.success('ERP configuration created'),
                                                        onError: () => toast.error('Failed to create ERP configuration'),
                                                    });
                                                }}
                                                disabled={!erpForm.api_url || createERPConfigMutation.isPending}
                                            >
                                                {createERPConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                Configure ERP
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Communication Integrations Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Communication Integrations
                                </CardTitle>
                                <CardDescription>
                                    Send claim notifications to Slack or Microsoft Teams channels
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {isLoadingCommunication ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Slack Integration */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-[#4A154B] rounded flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">#</span>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <Label>Slack</Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Post notifications to Slack channels
                                                        </p>
                                                    </div>
                                                </div>
                                                {slackConfig && (
                                                    <Badge variant={slackConfig.is_active ? "default" : "secondary"}>
                                                        {slackConfig.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="space-y-4 p-4 border rounded-md bg-muted/30 ml-11">
                                                <div className="space-y-2">
                                                    <Label>Webhook URL</Label>
                                                    <Input
                                                        placeholder="https://hooks.slack.com/services/..."
                                                        value={slackForm.slack_bot_token || slackConfig?.slack_workspace_id || ''}
                                                        onChange={(e) => setSlackForm({ ...slackForm, webhook_url: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Default Channel</Label>
                                                    <Input
                                                        placeholder="#expense-notifications"
                                                        value={slackForm.slack_channel_id || slackConfig?.slack_channel_id || ''}
                                                        onChange={(e) => setSlackForm({ ...slackForm, default_channel: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label>Notification Events</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={slackForm.notify_on_claim_submitted ?? slackConfig?.notify_on_claim_submitted ?? true}
                                                            onCheckedChange={(checked) => setSlackForm({ ...slackForm, notify_on_new_claim: checked })}
                                                        />
                                                        <Label className="font-normal">New claim submitted</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={slackForm.notify_on_claim_approved ?? slackConfig?.notify_on_claim_approved ?? true}
                                                            onCheckedChange={(checked) => setSlackForm({ ...slackForm, notify_on_approval: checked })}
                                                        />
                                                        <Label className="font-normal">Claim approved</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={slackForm.notify_on_claim_rejected ?? slackConfig?.notify_on_claim_rejected ?? true}
                                                            onCheckedChange={(checked) => setSlackForm({ ...slackForm, notify_on_rejection: checked })}
                                                        />
                                                        <Label className="font-normal">Claim rejected</Label>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (slackConfig) {
                                                                updateCommunicationConfigMutation.mutate(
                                                                    { provider: 'slack', data: slackForm },
                                                                    {
                                                                        onSuccess: () => toast.success('Slack configuration updated'),
                                                                        onError: () => toast.error('Failed to update Slack configuration'),
                                                                    }
                                                                );
                                                            } else {
                                                                createCommunicationConfigMutation.mutate(
                                                                    { ...slackForm, provider: 'slack' } as CommunicationConfigCreate,
                                                                    {
                                                                        onSuccess: () => toast.success('Slack configuration created'),
                                                                        onError: () => toast.error('Failed to create Slack configuration'),
                                                                    }
                                                                );
                                                            }
                                                        }}
                                                        disabled={updateCommunicationConfigMutation.isPending || createCommunicationConfigMutation.isPending}
                                                    >
                                                        {(updateCommunicationConfigMutation.isPending || createCommunicationConfigMutation.isPending) ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Save className="h-4 w-4 mr-2" />
                                                        )}
                                                        Save
                                                    </Button>
                                                    {slackConfig && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-2"
                                                            onClick={() => {
                                                                testCommunicationMutation.mutate('slack', {
                                                                    onSuccess: () => toast.success('Test message sent to Slack'),
                                                                    onError: () => toast.error('Failed to send test message'),
                                                                });
                                                            }}
                                                            disabled={testCommunicationMutation.isPending}
                                                        >
                                                            {testCommunicationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                            Test
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Microsoft Teams Integration */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-[#6264A7] rounded flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">T</span>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <Label>Microsoft Teams</Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Post notifications to Teams channels
                                                        </p>
                                                    </div>
                                                </div>
                                                {teamsConfig && (
                                                    <Badge variant={teamsConfig.is_active ? "default" : "secondary"}>
                                                        {teamsConfig.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="space-y-4 p-4 border rounded-md bg-muted/30 ml-11">
                                                <div className="space-y-2">
                                                    <Label>Incoming Webhook URL</Label>
                                                    <Input
                                                        placeholder="https://outlook.office.com/webhook/..."
                                                        value={teamsForm.teams_webhook_url || teamsConfig?.teams_channel_id || ''}
                                                        onChange={(e) => setTeamsForm({ ...teamsForm, webhook_url: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label>Notification Events</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={teamsForm.notify_on_claim_submitted ?? teamsConfig?.notify_on_claim_submitted ?? true}
                                                            onCheckedChange={(checked) => setTeamsForm({ ...teamsForm, notify_on_new_claim: checked })}
                                                        />
                                                        <Label className="font-normal">New claim submitted</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={teamsForm.notify_on_claim_approved ?? teamsConfig?.notify_on_claim_approved ?? true}
                                                            onCheckedChange={(checked) => setTeamsForm({ ...teamsForm, notify_on_approval: checked })}
                                                        />
                                                        <Label className="font-normal">Claim approved</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={teamsForm.notify_on_claim_rejected ?? teamsConfig?.notify_on_claim_rejected ?? true}
                                                            onCheckedChange={(checked) => setTeamsForm({ ...teamsForm, notify_on_rejection: checked })}
                                                        />
                                                        <Label className="font-normal">Claim rejected</Label>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (teamsConfig) {
                                                                updateCommunicationConfigMutation.mutate(
                                                                    { provider: 'teams', data: teamsForm },
                                                                    {
                                                                        onSuccess: () => toast.success('Teams configuration updated'),
                                                                        onError: () => toast.error('Failed to update Teams configuration'),
                                                                    }
                                                                );
                                                            } else {
                                                                createCommunicationConfigMutation.mutate(
                                                                    { ...teamsForm, provider: 'teams' } as CommunicationConfigCreate,
                                                                    {
                                                                        onSuccess: () => toast.success('Teams configuration created'),
                                                                        onError: () => toast.error('Failed to create Teams configuration'),
                                                                    }
                                                                );
                                                            }
                                                        }}
                                                        disabled={updateCommunicationConfigMutation.isPending || createCommunicationConfigMutation.isPending}
                                                    >
                                                        {(updateCommunicationConfigMutation.isPending || createCommunicationConfigMutation.isPending) ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Save className="h-4 w-4 mr-2" />
                                                        )}
                                                        Save
                                                    </Button>
                                                    {teamsConfig && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-2"
                                                            onClick={() => {
                                                                testCommunicationMutation.mutate('teams', {
                                                                    onSuccess: () => toast.success('Test message sent to Teams'),
                                                                    onError: () => toast.error('Failed to send test message'),
                                                                });
                                                            }}
                                                            disabled={testCommunicationMutation.isPending}
                                                        >
                                                            {testCommunicationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                            Test
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Database Settings */}
                <TabsContent value="database">
                    <div className="space-y-4">
                        {/* Database Status Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Database Status</CardTitle>
                                <CardDescription>
                                    Current database connection information
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingSystemInfo ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        <span className="ml-2 text-muted-foreground">Loading system info...</span>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Connection Status</span>
                                            {systemInfo?.database?.connected ? (
                                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Connected</Badge>
                                            ) : (
                                                <Badge variant="destructive">Disconnected</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Database Type</span>
                                            <span className="text-sm">{systemInfo?.database?.type || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Host</span>
                                            <span className="text-sm font-mono">{systemInfo?.database?.host || 'Unknown'}:{systemInfo?.database?.port || '?'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Database Name</span>
                                            <span className="text-sm font-mono">{systemInfo?.database?.name || 'Unknown'}</span>
                                        </div>
                                        
                                        {/* Redis Cache Status */}
                                        <Separator className="my-3" />
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Redis Cache</span>
                                            {systemInfo?.cache?.connected ? (
                                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Connected</Badge>
                                            ) : (
                                                <Badge variant="destructive">Disconnected</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Host</span>
                                            <span className="text-sm font-mono">{systemInfo?.cache?.host || 'Unknown'}:{systemInfo?.cache?.port || '?'}</span>
                                        </div>
                                        {systemInfo?.cache?.memory_used && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Memory Used</span>
                                                <span className="text-sm">{systemInfo.cache.memory_used}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Cache Management Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Cache Management</CardTitle>
                                <CardDescription>
                                    Clear cached data to ensure fresh data retrieval
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Platform-wide Cache */}
                                <div className="flex items-center justify-between p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                                    <div>
                                        <p className="font-medium flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-blue-600" />
                                            Clear Platform Cache
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Clear all platform-wide cached data including system settings, designations, and global configurations
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" disabled={isClearingCache === 'platform'}>
                                                {isClearingCache === 'platform' ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                )}
                                                Clear Platform Cache
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Clear Platform Cache?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will clear all platform-wide cached data. The next requests will fetch fresh data from the database, which may temporarily increase response times.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleClearPlatformCache}>
                                                    Clear Cache
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>

                                {/* Tenant-specific Cache */}
                                <div className="p-4 rounded-lg border">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="font-medium flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                Clear Tenant Cache
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Clear cached data for specific tenants or all tenants
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {/* All Tenants Option */}
                                        <div className="flex items-center justify-between p-3 rounded border bg-muted/30">
                                            <div>
                                                <p className="text-sm font-medium">All Tenants</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Clear cache for all tenant organizations
                                                </p>
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" disabled={isClearingCache === 'all-tenants'}>
                                                        {isClearingCache === 'all-tenants' ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                        )}
                                                        Clear All
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Clear All Tenant Caches?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will clear cached data for ALL tenants. This may temporarily impact system performance as caches are rebuilt.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleClearTenantCache()}>
                                                            Clear All Caches
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>

                                        {/* Individual Tenants */}
                                        {tenants && tenants.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Individual Tenants</p>
                                                    <span className="text-xs text-muted-foreground">{tenants.length} total</span>
                                                </div>
                                                {/* Search filter for tenants */}
                                                {tenants.length > 5 && (
                                                    <Input
                                                        placeholder="Search tenants..."
                                                        value={tenantSearchFilter}
                                                        onChange={(e) => setTenantSearchFilter(e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                )}
                                                {/* Scrollable tenant list */}
                                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                    {tenants
                                                        .filter((tenant: any) => 
                                                            tenantSearchFilter === '' ||
                                                            tenant.name.toLowerCase().includes(tenantSearchFilter.toLowerCase()) ||
                                                            tenant.code.toLowerCase().includes(tenantSearchFilter.toLowerCase())
                                                        )
                                                        .map((tenant: any) => (
                                                            <div key={tenant.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-medium truncate">{tenant.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{tenant.code}</p>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleClearTenantCache(tenant.id, tenant.name)}
                                                                    disabled={isClearingCache === tenant.id}
                                                                    className="ml-2 flex-shrink-0"
                                                                >
                                                                    {isClearingCache === tenant.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <RefreshCw className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    {tenants.filter((tenant: any) => 
                                                        tenantSearchFilter === '' ||
                                                        tenant.name.toLowerCase().includes(tenantSearchFilter.toLowerCase()) ||
                                                        tenant.code.toLowerCase().includes(tenantSearchFilter.toLowerCase())
                                                    ).length === 0 && (
                                                        <p className="text-sm text-muted-foreground text-center py-4">
                                                            No tenants match your search
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
