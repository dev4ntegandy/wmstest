import { cn } from "@/lib/utils";

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  className?: string;
}

/**
 * Status badge component for showing item status with color coding
 */
const StatusBadge = ({ status, type, className }: StatusBadgeProps) => {
  // Map common status terms to status types if not provided
  const getStatusType = (): StatusType => {
    if (type) return type;
    
    const statusLower = status.toLowerCase();
    
    if (
      statusLower.includes('active') || 
      statusLower.includes('in stock') || 
      statusLower.includes('completed') ||
      statusLower.includes('delivered') ||
      statusLower.includes('shipped')
    ) {
      return 'success';
    }
    
    if (
      statusLower.includes('pending') || 
      statusLower.includes('processing') || 
      statusLower.includes('low') ||
      statusLower.includes('allocated')
    ) {
      return 'warning';
    }
    
    if (
      statusLower.includes('inactive') || 
      statusLower.includes('out of stock') || 
      statusLower.includes('cancelled') ||
      statusLower.includes('error') ||
      statusLower.includes('failed')
    ) {
      return 'error';
    }
    
    return 'info';
  };

  // Get CSS classes based on status type
  const getStatusClasses = () => {
    const statusType = getStatusType();
    
    switch (statusType) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-amber-100 text-amber-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        getStatusClasses(),
        className
      )}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
