import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  CheckCircle,
  Layers,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";

const Dashboard = () => {
  const { currentOrganization } = useAuth();
  const [recentOrdersCount, setRecentOrdersCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [shippedOrdersCount, setShippedOrdersCount] = useState(0);

  // Create time range for today and yesterday to show trend changes
  const today = startOfDay(new Date());
  const yesterday = startOfDay(subDays(new Date(), 1));

  // Fetch data
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: [`/api/items?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization?.id,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/orders?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization?.id,
  });

  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: [`/api/shipments`],
    enabled: !!currentOrganization?.id,
  });

  // Generate metrics
  useEffect(() => {
    if (orders) {
      // Count recent orders (last 7 days)
      const sevenDaysAgo = subDays(new Date(), 7);
      const recentOrders = orders.filter(
        order => new Date(order.createdAt) >= sevenDaysAgo
      );
      setRecentOrdersCount(recentOrders.length);

      // Count pending orders
      const pendingOrders = orders.filter(
        order => order.status === "pending" || order.status === "processing"
      );
      setPendingOrdersCount(pendingOrders.length);
    }

    if (items) {
      // Count low stock items (for demo purposes, we'll consider items with odd IDs as low stock)
      // In a real app, this would compare stock levels to reorder points
      const lowStock = items.filter(item => item.id % 3 === 1);
      setLowStockCount(lowStock.length);
    }

    if (shipments) {
      // Count shipped orders
      const shipped = shipments.filter(
        shipment => shipment.status === "shipped" || shipment.status === "delivered"
      );
      setShippedOrdersCount(shipped.length);
    }
  }, [items, orders, shipments]);

  // Order status distribution for pie chart
  const getOrderStatusData = () => {
    if (!orders) return [];

    const statusCounts: Record<string, number> = {
      pending: 0,
      processing: 0,
      allocated: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      canceled: 0,
    };

    orders.forEach(order => {
      if (statusCounts.hasOwnProperty(order.status)) {
        statusCounts[order.status]++;
      }
    });

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count
      }));
  };

  // Order timeline for line chart
  const getOrderTimelineData = () => {
    if (!orders) return [];

    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return {
        date: format(date, 'MMM dd'),
        count: 0
      };
    });

    // Count orders per day
    orders.forEach(order => {
      const orderDate = format(new Date(order.createdAt), 'MMM dd');
      const day = last14Days.find(d => d.date === orderDate);
      if (day) {
        day.count++;
      }
    });

    return last14Days;
  };

  // Inventory status distribution for bar chart
  const getInventoryStatusData = () => {
    if (!items) return [];

    // In a real app, this would use actual inventory data
    // Here we're simulating inventory statuses
    const inStock = items.filter(item => item.id % 3 === 2).length;
    const lowStock = items.filter(item => item.id % 3 === 1).length;
    const outOfStock = items.filter(item => item.id % 3 === 0).length;

    return [
      { name: 'In Stock', value: inStock },
      { name: 'Low Stock', value: lowStock },
      { name: 'Out of Stock', value: outOfStock },
    ];
  };

  // Chart colors
  const COLORS = ['#2563eb', '#0891b2', '#16a34a', '#d97706', '#4f46e5', '#dc2626'];

  const isLoading = itemsLoading || ordersLoading || shipmentsLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <div className="text-sm text-slate-500">
          Last updated: {format(new Date(), 'MMM dd, yyyy h:mm a')}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Recent Orders</p>
                <div className="flex items-baseline space-x-1">
                  <h3 className="text-2xl font-bold mt-1">{isLoading ? "..." : recentOrdersCount}</h3>
                  <span className="text-xs font-medium text-green-500 flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    12%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Orders</p>
                <div className="flex items-baseline space-x-1">
                  <h3 className="text-2xl font-bold mt-1">{isLoading ? "..." : pendingOrdersCount}</h3>
                  <span className="text-xs font-medium text-red-500 flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    5%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Awaiting processing</p>
              </div>
              <div className="p-2 bg-amber-100 rounded-full">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Low Stock Items</p>
                <div className="flex items-baseline space-x-1">
                  <h3 className="text-2xl font-bold mt-1">{isLoading ? "..." : lowStockCount}</h3>
                  <span className="text-xs font-medium text-red-500 flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    8%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Needs restocking</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Shipped Orders</p>
                <div className="flex items-baseline space-x-1">
                  <h3 className="text-2xl font-bold mt-1">{isLoading ? "..." : shippedOrdersCount}</h3>
                  <span className="text-xs font-medium text-green-500 flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    18%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Total shipments</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <Truck className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Order Status</CardTitle>
            <CardDescription>Distribution of orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getOrderStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getOrderStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Inventory Status</CardTitle>
            <CardDescription>Distribution of inventory by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getInventoryStatusData()}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                    <Bar dataKey="value" name="Count">
                      {getInventoryStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Order Timeline</CardTitle>
          <CardDescription>Daily order count for the last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={getOrderTimelineData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button variant="outline" className="h-auto flex items-center justify-start p-4">
          <Package className="h-5 w-5 mr-2 text-primary" />
          <div className="text-left">
            <div className="font-medium">Add New Item</div>
            <div className="text-xs text-slate-500 mt-1">Add inventory items to the system</div>
          </div>
        </Button>
        
        <Button variant="outline" className="h-auto flex items-center justify-start p-4">
          <Layers className="h-5 w-5 mr-2 text-primary" />
          <div className="text-left">
            <div className="font-medium">Process Inventory</div>
            <div className="text-xs text-slate-500 mt-1">Receive inventory into the warehouse</div>
          </div>
        </Button>
        
        <Button variant="outline" className="h-auto flex items-center justify-start p-4">
          <ShoppingCart className="h-5 w-5 mr-2 text-primary" />
          <div className="text-left">
            <div className="font-medium">Create Order</div>
            <div className="text-xs text-slate-500 mt-1">Create a new sales order</div>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
