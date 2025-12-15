import { forwardRef, ReactNode } from "react";
import { Zap, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Field source type: 'auto' for OCR-extracted, 'manual' for user-entered, 'none' for no indicator
type FieldSource = 'auto' | 'manual' | 'none';

interface SmartFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  isAutoPopulated?: boolean;  // Legacy prop - for backward compatibility
  fieldSource?: FieldSource;  // New prop for explicit source tracking
  validationStatus?: "valid" | "invalid" | "none";
  error?: string;
  hint?: string;
  multiline?: boolean;
  onFieldEdit?: () => void;  // Callback when user edits the field
}

export const SmartFormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, SmartFormFieldProps>(
  ({ label, isAutoPopulated, fieldSource, validationStatus = "none", error, hint, multiline, className, onFieldEdit, onChange, ...props }, ref) => {
    // Determine the effective field source
    // If fieldSource is explicitly set, use it; otherwise derive from isAutoPopulated
    const effectiveSource: FieldSource = fieldSource !== undefined 
      ? fieldSource 
      : (isAutoPopulated ? 'auto' : 'none');
    
    const ValidationIcon = () => {
      if (validationStatus === "valid") {
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      }
      if (validationStatus === "invalid") {
        return <XCircle className="h-4 w-4 text-destructive" />;
      }
      return null;
    };

    const SourceBadge = () => {
      if (effectiveSource === 'auto') {
        return (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            <Zap className="h-2.5 w-2.5" />
            Auto
          </span>
        );
      }
      if (effectiveSource === 'manual') {
        return (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
            <Pencil className="h-2.5 w-2.5" />
            Manual
          </span>
        );
      }
      return null;
    };

    const inputClasses = cn(
      "pr-10 transition-all",
      validationStatus === "valid" && "border-success focus-visible:ring-success",
      validationStatus === "invalid" && "border-destructive focus-visible:ring-destructive",
      effectiveSource === 'auto' && "bg-accent/5 border-accent/30",
      className
    );

    // Handle change with field edit notification
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (onFieldEdit) {
        onFieldEdit();
      }
      if (onChange) {
        onChange(e as any);
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            {label}
            <SourceBadge />
          </label>
          <ValidationIcon />
        </div>

        <div className="relative">
          {multiline ? (
            <Textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={inputClasses}
              onChange={handleChange}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <Input
              ref={ref as React.Ref<HTMLInputElement>}
              className={inputClasses}
              onChange={handleChange}
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
        </div>

        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);

SmartFormField.displayName = "SmartFormField";SmartFormField.displayName = "SmartFormField";
