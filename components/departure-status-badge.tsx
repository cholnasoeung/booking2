import { Clock, CheckCircle, AlertTriangle, Navigation, MapPin, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  scheduled:  { label: "Scheduled",  icon: Clock,         className: "bg-slate-100 text-slate-700" },
  on_time:    { label: "On Time",    icon: CheckCircle,   className: "bg-green-100 text-green-700" },
  delayed:    { label: "Delayed",    icon: AlertTriangle, className: "bg-amber-100 text-amber-700" },
  departed:   { label: "Departed",   icon: Navigation,    className: "bg-blue-100 text-blue-700" },
  arrived:    { label: "Arrived",    icon: MapPin,        className: "bg-indigo-100 text-indigo-700" },
  cancelled:  { label: "Cancelled",  icon: XCircle,       className: "bg-red-100 text-red-700" },
};

type Props = {
  status: string;
  delayMinutes?: number;
  statusNote?: string;
};

export default function DepartureStatusBadge({ status, delayMinutes = 0, statusNote }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  const Icon = config.icon;

  return (
    <div className="space-y-1">
      <Badge className={`gap-1.5 px-3 py-1 text-xs font-semibold ${config.className}`} variant="secondary">
        <Icon className="h-3.5 w-3.5" />
        {config.label}
        {status === "delayed" && delayMinutes > 0 && ` (+${delayMinutes} min)`}
      </Badge>
      {statusNote && <p className="text-xs text-slate-500">{statusNote}</p>}
    </div>
  );
}
