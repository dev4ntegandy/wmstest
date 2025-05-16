import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  Truck,
  BarChart2,
  UserCog,
  ShieldCheck,
  Building2,
  Settings,
  LogOut
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Sidebar = () => {
  const [location] = useLocation();
  const { user, organizations, currentOrganization, setCurrentOrganization, logout } = useAuth();

  const handleOrganizationChange = (orgId: string) => {
    const selectedOrg = organizations.find(org => org.id.toString() === orgId);
    if (selectedOrg) {
      setCurrentOrganization(selectedOrg);
    }
  };

  return (
    <aside className="w-64 bg-sidebar-background text-sidebar-foreground h-full flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border flex items-center">
        <div className="text-xl font-semibold tracking-tight">Borderworx</div>
      </div>
      
      {/* User info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">{user?.fullName}</div>
            <div className="text-xs text-slate-400">{user?.role?.name}</div>
          </div>
        </div>
      </div>
      
      {/* Organization selector */}
      <div className="p-4 border-b border-sidebar-border">
        <label className="text-xs text-slate-400 block mb-1">Organization</label>
        <div className="relative">
          <Select
            value={currentOrganization?.id.toString()}
            onValueChange={handleOrganizationChange}
          >
            <SelectTrigger className="w-full bg-sidebar-accent text-sidebar-foreground rounded">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="p-2 mt-2 flex-1 overflow-y-auto">
        <div className="text-xs text-slate-400 px-2 pb-1 pt-3">MAIN MENU</div>
        
        <Link href="/dashboard">
          <a className={`sidebar-link ${location === '/dashboard' ? 'active' : 'text-slate-300'}`}>
            <LayoutDashboard className="sidebar-link-icon" />
            <span>Dashboard</span>
          </a>
        </Link>
        
        <Link href="/warehouse">
          <a className={`sidebar-link ${location === '/warehouse' ? 'active' : 'text-slate-300'}`}>
            <Store className="sidebar-link-icon" />
            <span>Warehouse Setup</span>
          </a>
        </Link>
        
        <Link href="/inventory/items">
          <a className={`sidebar-link ${location.startsWith('/inventory') ? 'active' : 'text-slate-300'}`}>
            <Package className="sidebar-link-icon" />
            <span>Inventory Management</span>
          </a>
        </Link>
        
        <Link href="/orders">
          <a className={`sidebar-link ${location === '/orders' ? 'active' : 'text-slate-300'}`}>
            <ShoppingCart className="sidebar-link-icon" />
            <span>Order Management</span>
          </a>
        </Link>
        
        <Link href="/shipping">
          <a className={`sidebar-link ${location === '/shipping' ? 'active' : 'text-slate-300'}`}>
            <Truck className="sidebar-link-icon" />
            <span>Shipping</span>
          </a>
        </Link>
        
        <Link href="/reports">
          <a className={`sidebar-link ${location === '/reports' ? 'active' : 'text-slate-300'}`}>
            <BarChart2 className="sidebar-link-icon" />
            <span>Reports</span>
          </a>
        </Link>
        
        <div className="text-xs text-slate-400 px-2 pb-1 pt-4">ADMIN</div>
        
        <Link href="/admin/users">
          <a className={`sidebar-link ${location === '/admin/users' ? 'active' : 'text-slate-300'}`}>
            <UserCog className="sidebar-link-icon" />
            <span>Users</span>
          </a>
        </Link>
        
        <Link href="/admin/roles">
          <a className={`sidebar-link ${location === '/admin/roles' ? 'active' : 'text-slate-300'}`}>
            <ShieldCheck className="sidebar-link-icon" />
            <span>Roles</span>
          </a>
        </Link>
        
        <Link href="/admin/organizations">
          <a className={`sidebar-link ${location === '/admin/organizations' ? 'active' : 'text-slate-300'}`}>
            <Building2 className="sidebar-link-icon" />
            <span>Organizations</span>
          </a>
        </Link>
        
        <Link href="/settings">
          <a className={`sidebar-link ${location === '/settings' ? 'active' : 'text-slate-300'}`}>
            <Settings className="sidebar-link-icon" />
            <span>Settings</span>
          </a>
        </Link>
      </nav>
      
      <div className="p-4 border-t border-sidebar-border">
        <button 
          onClick={() => logout()}
          className="flex items-center text-sm text-slate-400 hover:text-white w-full"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
