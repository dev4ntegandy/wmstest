import { Link } from "wouter";
import { Menu, Bell, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { useLocation } from "wouter";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user } = useAuth();
  const [location] = useLocation();

  // Map routes to breadcrumb labels
  const getRouteLabel = (path: string): string => {
    const routes: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/warehouse": "Warehouse Setup",
      "/inventory/items": "Inventory Management",
      "/inventory/receiving": "Inventory Receiving",
      "/orders": "Order Management",
      "/shipping": "Shipping",
      "/reports": "Reports",
      "/admin/users": "Users",
      "/admin/roles": "Roles",
      "/admin/organizations": "Organizations",
      "/settings": "Settings",
    };
    return routes[path] || "Unknown";
  };

  const getParentRoute = (path: string): string | null => {
    if (path.startsWith('/inventory/')) return '/inventory/items';
    if (path.startsWith('/admin/')) return '/admin/users';
    return null;
  };

  // Get breadcrumb segments
  const getBreadcrumbs = () => {
    const currentLabel = getRouteLabel(location);
    const parentRoute = getParentRoute(location);
    
    if (parentRoute) {
      const parentLabel = getRouteLabel(parentRoute);
      return (
        <>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href={parentRoute}>{parentLabel}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink>{currentLabel}</BreadcrumbLink>
          </BreadcrumbItem>
        </>
      );
    }
    
    return (
      <BreadcrumbItem>
        <BreadcrumbLink>{currentLabel}</BreadcrumbLink>
      </BreadcrumbItem>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 h-14 flex-shrink-0">
      <div className="flex items-center justify-between h-full px-4">
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-slate-500 hover:text-slate-700 focus:outline-none" 
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Breadcrumbs */}
        <div className="hidden md:flex items-center">
          <Breadcrumb>
            {getBreadcrumbs()}
          </Breadcrumb>
        </div>
        
        {/* Right-aligned items */}
        <div className="flex items-center space-x-4">
          <button className="text-slate-500 hover:text-slate-700 focus:outline-none">
            <Bell className="h-5 w-5" />
          </button>
          <button className="text-slate-500 hover:text-slate-700 focus:outline-none">
            <HelpCircle className="h-5 w-5" />
          </button>
          {/* Mobile user avatar */}
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center md:hidden">
            <span className="text-sm font-medium">
              {user?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
