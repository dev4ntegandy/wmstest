import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import {
  LayoutDashboard,
  Warehouse,
  Package,
  ShoppingCart,
  Truck,
  BarChart,
  Users,
  Settings,
  Building,
  ShieldCheck,
  LogOut,
  Menu,
  ChevronDown,
  X
} from "lucide-react";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [location, navigate] = useLocation();
  const { user, logout, currentOrganization, organizations, setCurrentOrganization, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const navItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/dashboard",
      permission: null,
    },
    {
      name: "Warehouse",
      icon: <Warehouse className="h-5 w-5" />,
      path: "/warehouse",
      permission: "warehouses:read",
    },
    {
      name: "Inventory",
      icon: <Package className="h-5 w-5" />,
      children: [
        {
          name: "Item Master",
          path: "/inventory/items",
          permission: "inventory:read",
        },
        {
          name: "Receiving",
          path: "/inventory/receiving",
          permission: "inventory:read",
        },
      ],
    },
    {
      name: "Orders",
      icon: <ShoppingCart className="h-5 w-5" />,
      path: "/orders",
      permission: "orders:read",
    },
    {
      name: "Shipping",
      icon: <Truck className="h-5 w-5" />,
      path: "/shipping",
      permission: "shipping:read",
    },
    {
      name: "Reports",
      icon: <BarChart className="h-5 w-5" />,
      path: "/reports",
      permission: "reports:read",
    },
    {
      name: "Admin",
      icon: <Settings className="h-5 w-5" />,
      children: [
        {
          name: "Users",
          path: "/admin/users",
          icon: <Users className="h-5 w-5" />,
          permission: "users:read",
        },
        {
          name: "Organizations",
          path: "/admin/organizations",
          icon: <Building className="h-5 w-5" />,
          permission: "organizations:read",
        },
        {
          name: "Roles",
          path: "/admin/roles",
          icon: <ShieldCheck className="h-5 w-5" />,
          permission: "roles:read",
        },
      ],
    },
  ];

  // Only show nav items the user has permission for
  const filteredNavItems = navItems.filter(item => {
    // If item requires no permission, show it
    if (!item.permission) return true;
    
    // If item has a direct permission check
    if (item.permission && hasPermission(item.permission)) return true;
    
    // If item has children, check if user has permission for any child
    if (item.children) {
      return item.children.some(child => !child.permission || hasPermission(child.permission));
    }
    
    return false;
  });

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar for desktop */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-auto`}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 py-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-primary">Borderworx WMS</h1>
              <Button 
                variant="ghost" 
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {currentOrganization && (
              <div className="mt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">{currentOrganization.name}</span>
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {organizations.map((org) => (
                      <DropdownMenuItem 
                        key={org.id}
                        onClick={() => setCurrentOrganization(org)}
                        className={`cursor-pointer ${org.id === currentOrganization.id ? 'bg-primary/10' : ''}`}
                      >
                        {org.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {filteredNavItems.map((item, index) => (
                <li key={index}>
                  {item.children ? (
                    <div className="mb-2">
                      <div className="flex items-center px-3 py-2 text-sm font-medium text-slate-600">
                        {item.icon}
                        <span className="ml-3">{item.name}</span>
                      </div>
                      <ul className="mt-1 space-y-1 pl-8">
                        {item.children
                          .filter(child => !child.permission || hasPermission(child.permission))
                          .map((child, childIndex) => (
                            <li key={childIndex}>
                              <a
                                href={child.path}
                                className={`group flex items-center px-3 py-2 text-sm rounded-md ${
                                  location === child.path
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(child.path);
                                  setMobileMenuOpen(false);
                                }}
                              >
                                {child.icon && child.icon}
                                <span className={child.icon ? "ml-3" : ""}>{child.name}</span>
                              </a>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : (
                    <a
                      href={item.path}
                      className={`group flex items-center px-3 py-2 text-sm rounded-md ${
                        location === item.path
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 border-t border-slate-200">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src="" />
                      <AvatarFallback>{getInitials(user.fullName || user.username)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{user.fullName || user.username}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[150px]">
                        {user.role?.name || "User"}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 lg:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="ml-auto flex items-center space-x-4">
            {/* Add any global navbar controls here */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;