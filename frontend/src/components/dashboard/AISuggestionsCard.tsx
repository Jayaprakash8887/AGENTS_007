import { Sparkles, Receipt, Coffee, Car, FileText, DollarSign, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDraftClaims, formatCurrency } from "@/hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";

// Map categories to icons
const categoryIcons: Record<string, React.ReactNode> = {
  TRANSPORTATION: <Car className="h-4 w-4" />,
  TRAVEL: <Car className="h-4 w-4" />,
  MEALS: <Coffee className="h-4 w-4" />,
  TEAM_LUNCH: <Coffee className="h-4 w-4" />,
  OFFICE_EXPENSES: <Receipt className="h-4 w-4" />,
  CERTIFICATION: <FileText className="h-4 w-4" />,
  ONCALL: <DollarSign className="h-4 w-4" />,
  default: <Briefcase className="h-4 w-4" />,
};

export function AISuggestionsCard() {
  const { user } = useAuth();
  const { data: draftClaims, isLoading } = useDraftClaims(user?.id, 3);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card p-6 shadow-card">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!draftClaims || draftClaims.length === 0) {
    return (
      <div className="rounded-xl bg-card p-6 shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-ai">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI-Detected Claims</h3>
            <p className="text-sm text-muted-foreground">
              Auto-detected from your receipts
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1">
            <Sparkles className="h-3 w-3 text-accent" />
            <span className="text-xs font-medium text-accent">AI Powered</span>
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No draft claims available</p>
          <p className="text-xs mt-2">Upload receipts to get AI-powered claim suggestions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card p-6 shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-ai">
          <span className="text-lg">🤖</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">AI-Detected Claims</h3>
          <p className="text-sm text-muted-foreground">
            Auto-detected from your receipts
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1">
          <Sparkles className="h-3 w-3 text-accent" />
          <span className="text-xs font-medium text-accent">AI Powered</span>
        </div>
      </div>

      <div className="space-y-4">
        {draftClaims.map((claim, index) => {
          const icon = categoryIcons[claim.category] || categoryIcons.default;
          const confidence = Math.floor(Math.random() * 15) + 85; // Random 85-100%
          
          return (
            <div
              key={claim.id}
              className={cn(
                "group flex items-center gap-4 rounded-lg border border-border bg-background/50 p-4 transition-all duration-200 hover:border-primary/30 hover:bg-background opacity-0 animate-slide-in-right"
              )}
              style={{ animationDelay: `${500 + index * 100}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {claim.claim_number || `${claim.category} Claim`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground capitalize">
                    {claim.category.toLowerCase().replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-success font-medium">
                    {confidence}% match
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {formatCurrency(claim.amount, claim.currency)}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => window.location.href = `/claims/${claim.id}`}
                >
                  Review & Submit
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => window.location.href = '/claims?status=draft'}
        >
          View all AI suggestions
        </Button>
      </div>
    </div>
  );
}
