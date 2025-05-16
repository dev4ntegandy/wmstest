import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import AppLayout from "@/components/layout/AppLayout";
import ItemMaster from "@/pages/inventory/ItemMaster";
import InventoryReceiving from "@/pages/inventory/InventoryReceiving";
import WarehouseSetup from "@/pages/warehouse/WarehouseSetup";
import OrderManagement from "@/pages/orders/OrderManagement";
import ShippingIntegration from "@/pages/shipping/ShippingIntegration";
import Reports from "@/pages/reports/Reports";
import Users from "@/pages/admin/Users";
import Organizations from "@/pages/admin/Organizations";
import Roles from "@/pages/admin/Roles";
import { AuthContext } from "@/context/AuthContext";

// Simple auth implementation for the demo app
function App() {
  // Demo user state
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState([
    { 
      id: 1, 
      name: "Borderworx", 
      description: "Parent 3PL Organization", 
      isActive: true 
    },
    { 
      id: 2, 
      name: "Silver Crystal", 
      description: "Customer Organization", 
      isActive: true, 
      parentId: 1 
    },
    { 
      id: 3, 
      name: "CarCan", 
      description: "Automotive Parts Distributor", 
      isActive: true, 
      parentId: 1 
    }
  ]);
  const [currentOrganization, setCurrentOrganization] = useState(organizations[0]);
  
  // Demo login function
  const login = async (username, password) => {
    setIsLoading(true);
    
    // Demo credentials
    if ((username === "admin" && password === "password123") || 
        (username === "demo" && password === "demo123")) {
      
      const mockUser = {
        id: 1,
        username: username,
        fullName: username === "admin" ? "Admin User" : "Demo User",
        email: `${username}@example.com`,
        organizationId: 1,
        roleId: 1,
        isActive: true,
        role: {
          id: 1,
          name: "Global Admin",
          permissions: ["all"],
          scope: "global"
        }
      };
      
      setUser(mockUser);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };
  
  // Demo logout function
  const logout = async () => {
    setUser(null);
  };
  
  // Demo permission check
  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    if (user.role.permissions.includes("all")) return true;
    return user.role.permissions.includes(permission);
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider 
        value={{
          user,
          organizations,
          currentOrganization,
          isLoading,
          hasPermission,
          login,
          logout,
          setCurrentOrganization
        }}
      >
        <TooltipProvider>
          <Toaster />
          {user ? (
            <AppLayout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/warehouse" component={WarehouseSetup} />
                <Route path="/inventory/items" component={ItemMaster} />
                <Route path="/inventory/receiving" component={InventoryReceiving} />
                <Route path="/orders" component={OrderManagement} />
                <Route path="/shipping" component={ShippingIntegration} />
                <Route path="/reports" component={Reports} />
                <Route path="/admin/users" component={Users} />
                <Route path="/admin/organizations" component={Organizations} />
                <Route path="/admin/roles" component={Roles} />
                <Route component={NotFound} />
              </Switch>
            </AppLayout>
          ) : (
            <Switch>
              <Route path="*" component={Login} />
            </Switch>
          )}
        </TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
