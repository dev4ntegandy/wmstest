import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, PieChart as PieChartIcon, Download } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";

const OrderReport = () => {
  const { currentOrganization } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewType, setViewType] = useState<"table" | "pieChart" | "barChart">("table");

  // Date formatting for API query
  const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
  const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

  // Fetch orders
  const { data: orders, isLoading } = useQuery({
    queryKey: [
      `/api/orders?organizationId=${currentOrganization?.id || 0}` +
      `${statusFilter ? `&status=${statusFilter}` : ''}` +
      `${fromDate ? `&fromDate=${fromDate}` : ''}` +
      `${toDate ? `&toDate=${toDate}` : ''}`
    ],
    enabled: !!currentOrganization?.id,
  });

  // Prepare data for charts
  const prepareChartData = () => {
    // Status distribution for pie chart
    const statusCounts: Record<string, number> = {};
    
    // Orders by day for bar chart
    const dailyOrders: Record<string, number> = {};
    
    if (orders) {
      orders.forEach(order => {
        // Count by status
        if (!statusCounts[order.status]) {
          statusCounts[order.status] = 0;
        }
        statusCounts[order.status]++;
        
        // Count by date
        const date = order.createdAt.split('T')[0];
        if (!dailyOrders[date]) {
          dailyOrders[date] = 0;
        }
        dailyOrders[date]++;
      });
    }
    
    // Format data for pie chart
    const pieChartData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
    
    // Format data for bar chart - last 14 days
    const sortedDates = Object.keys(dailyOrders).sort();
    const recentDates = sortedDates.slice(-14);
    
    const barChartData = recentDates.map(date => ({
      date: format(new Date(date), 'MMM dd'),
      orders: dailyOrders[date]
    }));
    
    return { pieChartData, barChartData };
  };
  
  const { pieChartData, barChartData } = prepareChartData();
  
  // Chart colors
  const STATUS_COLORS = {
    pending: '#d97706',    // Amber
    processing: '#2563eb', // Blue
    allocated: '#0891b2',  // Cyan
    packed: '#16a34a',     // Green
    shipped: '#4f46e5',    // Indigo
    delivered: '#16a34a',  // Green
    canceled: '#dc2626',   // Red
  };
  
  const CHART_COLORS = Object.values(STATUS_COLORS);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order Report</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setViewType("table")} 
            variant={viewType === "table" ? "default" : "outline"}
            size="icon"
          >
            <span className="sr-only">Table View</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M3 9h18M3 15h18"></path>
            </svg>
          </Button>
          <Button 
            onClick={() => setViewType("pieChart")} 
            variant={viewType === "pieChart" ? "default" : "outline"}
            size="icon"
          >
            <span className="sr-only">Pie Chart</span>
            <PieChartIcon className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setViewType("barChart")} 
            variant={viewType === "barChart" ? "default" : "outline"}
            size="icon"
          >
            <span className="sr-only">Bar Chart</span>
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
              <DateRangePicker 
                value={dateRange}
                onValueChange={setDateRange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order Status</label>
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewType === "table" && (
        <Card>
          <CardHeader className="border-b border-slate-200 px-4 py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">
              Orders ({orders?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr className="text-left text-sm border-b border-slate-200">
                    <th className="px-4 py-3 font-medium">Order #</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {orders && orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 text-primary font-medium">{order.orderNumber}</td>
                        <td className="px-4 py-3">{order.customerName}</td>
                        <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">{order.updatedAt ? formatDate(order.updatedAt) : 'N/A'}</td>
                        <td className="px-4 py-3 truncate max-w-xs">{order.notes || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No orders found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewType === "pieChart" && (
        <Card>
          <CardHeader className="border-b border-slate-200 px-4 py-3">
            <CardTitle className="text-base font-medium">
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[400px] w-full">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => {
                        const statusKey = entry.name.toLowerCase();
                        const color = STATUS_COLORS[statusKey as keyof typeof STATUS_COLORS] || CHART_COLORS[index % CHART_COLORS.length];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">No data available for the chart.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewType === "barChart" && (
        <Card>
          <CardHeader className="border-b border-slate-200 px-4 py-3">
            <CardTitle className="text-base font-medium">
              Orders by Day (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[400px] w-full">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
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
                    <Bar dataKey="orders" name="Orders" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">No data available for the chart.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderReport;
