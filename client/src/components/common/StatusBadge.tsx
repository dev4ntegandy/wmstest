import { Badge } from "@/components/ui/badge";

type StatusType = "success" | "warning" | "error" | "info" | "default";

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
}

const StatusBadge = ({ status, type = "default" }: StatusBadgeProps) => {
  // Map type to color scheme
  const getVariant = () => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <Badge variant="outline" className={`${getVariant()} font-medium`}>
      {status}
    </Badge>
  );
};

export default StatusBadge;