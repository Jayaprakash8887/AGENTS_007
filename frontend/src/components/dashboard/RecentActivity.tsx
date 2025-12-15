import { cn } from "@/lib/utils";
import { Check, Clock, X, RotateCcw, Wallet, FileText } from "lucide-react";
import { useRecentActivity, formatCurrency } from "@/hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type ClaimStatus = "PENDING_MANAGER" | "PENDING_HR" | "PENDING_FINANCE" | "FINANCE_APPROVED" | "REJECTED" | "RETURNED_TO_EMPLOYEE" | "SETTLED";

const statusConfig: Record<string, {
  icon: any;
  label: string;
  className: string;
  iconClassName: string;
}> = {
  PENDING_MANAGER: {
    icon: Clock,
    label: "Pending Manager",
    className: "bg-warning/10 text-warning border-warning/20",
    iconClassName: "text-warning",
  },
  PENDING_HR: {
    icon: Clock,
    label: "Pending HR",
    className: "bg-warning/10 text-warning border-warning/20",
    iconClassName: "text-warning",
  },
  PENDING_FINANCE: {
    icon: Clock,
    label: "Pending Finance",
    className: "bg-warning/10 text-warning border-warning/20",
    iconClassName: "text-warning",
  },
  FINANCE_APPROVED: {
    icon: Check,
    label: "Approved",
    className: "bg-success/10 text-success border-success/20",
    iconClassName: "text-success",
  },
  REJECTED: {
    icon: X,
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    iconClassName: "text-destructive",
  },
  RETURNED_TO_EMPLOYEE: {
    icon: RotateCcw,
    label: "Returned",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    iconClassName: "text-amber-600",
  },
  SETTLED: {
    icon: Wallet,
    label: "Settled",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    iconClassName: "text-emerald-600",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.PENDING_MANAGER;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className
      )}
    >
      <Icon className={cn("h-3 w-3", config.iconClassName)} />
      {config.label}
    </span>
  );
}

export function RecentActivity() {
  const { user } = useAuth();
  const { data: activities, isLoading } = useRecentActivity(5, user?.id);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card p-6 shadow-card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-xl bg-card p-6 shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No recent activity</p>
          <p className="text-xs mt-2">Your claim activities will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card p-6 shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
        <button 
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          onClick={() => window.location.href = '/claims'}
        >
          View all
        </button>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                "relative flex gap-4 opacity-0 animate-slide-in-right"
              )}
              style={{ animationDelay: `${600 + index * 100}ms` }}
            >
              {/* Timeline dot */}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                <FileText className="h-4 w-4 text-secondary-foreground" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {activity.claim_number}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                      {activity.category.toLowerCase().replace('_', ' ')} • {formatDistanceToNow(new Date(activity.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(activity.amount, activity.currency)}
                    </p>
                    <StatusBadge status={activity.status} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
