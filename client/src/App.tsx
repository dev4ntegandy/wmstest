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
import { useAuth } from "@/hooks/useAuth";

// Private Route component
const PrivateRoute = ({ component: Component, ...rest }: any) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Login />;
  }
  
  return <Component {...rest} />;
};

function Router() {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="*" component={Login} />
      </Switch>
    );
  }
  
  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
