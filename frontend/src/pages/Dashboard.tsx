import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Wallet, Users, TrendingUp, AlertCircle, DollarSign, FileText, Building2 } from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AISuggestionsCard } from '@/components/dashboard/AISuggestionsCard';
import { AllowanceOverviewCards, AllowancePolicyAlerts } from '@/components/dashboard/AllowanceWidgets';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardSummary, useClaimsByStatus, formatCurrency } from '@/hooks/useDashboard';
import { CardSkeleton } from '@/components/ui/loading-skeleton';

// Employee Dashboard - Personal claims and allowances
function EmployeeDashboard({ userName, employeeId }: { userName: string; employeeId: string }) {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(employeeId);
  const { data: claimsByStatus, isLoading: statusLoading } = useClaimsByStatus(employeeId);

  // Pending = any claim that is NOT Approved, Rejected, or Settled
  const excludedFromPending = ['FINANCE_APPROVED', 'REJECTED', 'SETTLED'];
  const pendingCount = claimsByStatus?.filter(c => 
    !excludedFromPending.includes(c.status)
  ).reduce((sum, c) => sum + c.count, 0) || summary?.pending_claims || 0;

  const approvedCount = claimsByStatus?.find(c => c.status === 'FINANCE_APPROVED')?.count || summary?.approved_this_month || 0;
  const rejectedCount = claimsByStatus?.find(c => c.status === 'REJECTED')?.count || 0;
  const settledCount = claimsByStatus?.find(c => c.status === 'SETTLED')?.count || 0;

  if (summaryLoading || statusLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your expense claims
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your expense claims
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Pending Claims"
          value={pendingCount}
          trend={{ value: 10, isPositive: true }}
          icon={Clock}
          variant="pending"
        />
        <SummaryCard
          title="Approved"
          value={approvedCount}
          trend={{ value: 25, isPositive: true }}
          icon={CheckCircle}
          variant="approved"
        />
        <SummaryCard
          title="Settled"
          value={settledCount}
          icon={DollarSign}
          variant="default"
        />
        <SummaryCard
          title="Rejected"
          value={rejectedCount}
          trend={{ value: 0, isPositive: true }}
          icon={XCircle}
          variant="rejected"
        />
        <SummaryCard
          title="Total Claimed"
          value={formatCurrency(summary?.total_amount_claimed || 0)}
          trend={{ value: 15, isPositive: true }}
          icon={Wallet}
          variant="total"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AllowanceOverviewCards />
          <RecentActivity />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <AllowancePolicyAlerts />
        </div>
      </div>
    </div>
  );
}

// Manager Dashboard - Team oversight and approvals
function ManagerDashboard({ userName, employeeId }: { userName: string; employeeId: string }) {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: claimsByStatus, isLoading: statusLoading } = useClaimsByStatus();

  const pendingApprovals = claimsByStatus?.find(c => c.status === 'PENDING_MANAGER')?.count || 0;
  const teamClaimsThisMonth = summary?.approved_this_month || 0;
  const teamSpending = summary?.total_amount_claimed || 0;

  if (summaryLoading || statusLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Team claims overview and pending approvals
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">
          Team claims overview and pending approvals
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Pending Approvals"
          value={pendingApprovals}
          trend={{ value: 2, isPositive: false }}
          icon={AlertCircle}
          variant="pending"
        />
        <SummaryCard
          title="Team Claims (Month)"
          value={teamClaimsThisMonth}
          trend={{ value: 15, isPositive: true }}
          icon={FileText}
          variant="default"
        />
        <SummaryCard
          title="Team Members"
          value="12"
          icon={Users}
          variant="default"
        />
        <SummaryCard
          title="Team Spending"
          value={formatCurrency(teamSpending)}
          trend={{ value: 8, isPositive: true }}
          icon={TrendingUp}
          variant="total"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Recent Team Claims</h3>
            <RecentActivity />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Pending Approvals</h3>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-primary">{pendingApprovals}</p>
              <p className="text-sm text-muted-foreground">Claims waiting for your review</p>
              <Link to="/approvals" className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline">
                Review now →
              </Link>
            </div>
          </div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

// HR Dashboard - Company-wide employee claims
function HRDashboard({ userName, employeeId }: { userName: string; employeeId: string }) {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: claimsByStatus, isLoading: statusLoading } = useClaimsByStatus();

  const hrPending = claimsByStatus?.find(c => c.status === 'PENDING_HR')?.count || 0;
  const totalClaims = summary?.total_claims || 0;
  const monthlyValue = summary?.total_amount_claimed || 0;

  if (summaryLoading || statusLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Company-wide claims and employee metrics
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">
          Company-wide claims and employee metrics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="HR Approvals Pending"
          value={hrPending}
          trend={{ value: 3, isPositive: false }}
          icon={AlertCircle}
          variant="pending"
        />
        <SummaryCard
          title="Total Employees"
          value="145"
          trend={{ value: 5, isPositive: true }}
          icon={Users}
          variant="default"
        />
        <SummaryCard
          title="Active Claims"
          value={totalClaims}
          trend={{ value: 12, isPositive: true }}
          icon={FileText}
          variant="default"
        />
        <SummaryCard
          title="Monthly Claims Value"
          value={formatCurrency(monthlyValue)}
          trend={{ value: 18, isPositive: true }}
          icon={DollarSign}
          variant="total"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
            <RecentActivity />
          </div>
          <AllowanceOverviewCards />
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">HR Approvals</h3>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-primary">{hrPending}</p>
              <p className="text-sm text-muted-foreground">Claims need HR review</p>
              <Link to="/approvals" className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline">
                Review now →
              </Link>
            </div>
          </div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

// Finance Dashboard - Payment processing and budgets
function FinanceDashboard({ userName, employeeId }: { userName: string; employeeId: string }) {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: claimsByStatus, isLoading: statusLoading } = useClaimsByStatus();

  const financePending = claimsByStatus?.find(c => c.status === 'PENDING_FINANCE')?.count || 0;
  const approved = claimsByStatus?.find(c => c.status === 'FINANCE_APPROVED')?.count || 0;
  const totalAmount = summary?.total_amount_claimed || 0;

  if (summaryLoading || statusLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Financial overview and payment processing
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">
          Financial overview and payment processing
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Pending Payments"
          value={financePending}
          trend={{ value: 5, isPositive: false }}
          icon={AlertCircle}
          variant="pending"
        />
        <SummaryCard
          title="Approved (Unpaid)"
          value={formatCurrency(totalAmount * 0.68)}
          icon={DollarSign}
          variant="default"
        />
        <SummaryCard
          title="Paid This Month"
          value={formatCurrency(totalAmount)}
          trend={{ value: 22, isPositive: true }}
          icon={CheckCircle}
          variant="approved"
        />
        <SummaryCard
          title="Budget Utilization"
          value="68%"
          trend={{ value: 12, isPositive: true }}
          icon={TrendingUp}
          variant="total"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Recent Transactions</h3>
            <RecentActivity />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Payment Queue</h3>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-primary">{financePending}</p>
              <p className="text-sm text-muted-foreground">Claims ready for payment</p>
              <Link to="/settlements" className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline">
                Process payments →
              </Link>
            </div>
          </div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

// Admin Dashboard - System overview and all metrics
function AdminDashboard({ userName, employeeId }: { userName: string; employeeId: string }) {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: claimsByStatus, isLoading: statusLoading } = useClaimsByStatus();

  const totalClaims = summary?.total_claims || 0;
  const pendingTotal = summary?.pending_claims || 0;
  const financePending = claimsByStatus?.find(c => c.status === 'PENDING_FINANCE')?.count || 0;

  if (summaryLoading || statusLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Complete system overview and administration
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">
          Complete system overview and administration
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Users"
          value="145"
          trend={{ value: 5, isPositive: true }}
          icon={Users}
          variant="default"
        />
        <SummaryCard
          title="Active Projects"
          value="8"
          trend={{ value: 2, isPositive: true }}
          icon={Building2}
          variant="default"
        />
        <SummaryCard
          title="Total Claims (Month)"
          value={totalClaims}
          trend={{ value: 15, isPositive: true }}
          icon={FileText}
          variant="default"
        />
        <SummaryCard
          title="System Processing"
          value="98%"
          trend={{ value: 3, isPositive: true }}
          icon={TrendingUp}
          variant="total"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AISuggestionsCard />
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">System Activity</h3>
            <RecentActivity />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending Approvals</span>
                <span className="text-lg font-semibold text-warning">{pendingTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending Payments</span>
                <span className="text-lg font-semibold text-primary">{financePending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Employees</span>
                <span className="text-lg font-semibold text-success">142</span>
              </div>
            </div>
            <Link to="/settings" className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline">
              System settings →
            </Link>
          </div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'User';
  const employeeId = user?.id || '';

  // Route to appropriate dashboard based on role
  switch (user?.role) {
    case 'manager':
      return <ManagerDashboard userName={userName} employeeId={employeeId} />;
    case 'hr':
      return <HRDashboard userName={userName} employeeId={employeeId} />;
    case 'finance':
      return <FinanceDashboard userName={userName} employeeId={employeeId} />;
    case 'admin':
      return <AdminDashboard userName={userName} employeeId={employeeId} />;
    case 'employee':
    default:
      return <EmployeeDashboard userName={userName} employeeId={employeeId} />;
  }
}
