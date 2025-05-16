import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { FileSpreadsheet, Download, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/common/StatusBadge";

const InventoryReport = () => {
  const { currentOrganization } = useAuth();
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [viewType, setViewType] = useState<"table" | "pieChart" | "barChart">("table");
  const csvLinkRef = useRef<HTMLAnchorElement>(null);

  // Fetch inventory data with item and location details
  const { data: inventory, isLoading } = useQuery({
    queryKey: [`/api/inventory${warehouseFilter ? `?warehouseId=${warehouseFilter}` : ""}`],
    enabled: !!currentOrganization?.id,
  });

  // Fetch warehouses for filter
  const { data: warehouses } = useQuery({
    queryKey: [`/api/warehouses?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization?.id,
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: [`/api/categories?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization?.id,
  });

  // Filter inventory data by category
  const filteredInventory = inventory?.filter(item => 
    !categoryFilter || item.item?.categoryId?.toString() === categoryFilter
  ) || [];

  // Function to determine inventory status
  const getInventoryStatus = (item: any) => {
    if (!item || !item.item) return "Unknown";
    
    const available = item.quantity - item.allocatedQuantity;
    
    if (available <= 0) return "Out of Stock";
    if (item.item.reorderPoint && available <= item.item.reorderPoint) return "Low Stock";
    return "In Stock";
  };

  // Prepare data for charts
  const prepareChartData = () => {
    // Status distribution for pie chart
    const statusCounts = {
      "In Stock": 0,
      "Low Stock": 0,
      "Out of Stock": 0,
    };
    
    // Inventory by category for bar chart
    const categoryInventory: Record<string, number> = {};
    
    filteredInventory.forEach(item => {
      const status = getInventoryStatus(item);
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
      
      const categoryName = item.item?.categoryId 
        ? categories?.find(c => c.id === item.item.categoryId)?.name || "Uncategorized"
        : "Uncategorized";
      
      if (!categoryInventory[categoryName]) {
        categoryInventory[categoryName] = 0;
      }
      categoryInventory[categoryName] += item.quantity;
    });
    
    // Format data for pie chart
    const pieChartData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value
    }));
    
    // Format data for bar chart
    const barChartData = Object.entries(categoryInventory)
      .map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Show top 10 categories
    
    return { pieChartData, barChartData };
  };
  
  const { pieChartData, barChartData } = prepareChartData();
  
  // Chart colors
  const COLORS = ['#2563eb', '#d97706', '#dc2626']; // Blue, Amber, Red
  
  // Function to download CSV
  const downloadCsv = async () => {
    try {
      const response = await fetch(`/api/reports/inventory-csv?organizationId=${currentOrganization?.id || 0}`);
      if (!response.ok) throw new Error("Failed to fetch CSV data");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
    }
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
        <h2 className="text-xl font-semibold">Inventory Report</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={downloadCsv} 
            variant="outline" 
            className="flex items-center"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse</label>
              <Select 
                value={warehouseFilter} 
                onValueChange={setWarehouseFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses?.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <Select 
                value={categoryFilter} 
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories?.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
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
              Inventory Items ({filteredInventory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr className="text-left text-sm border-b border-slate-200">
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Warehouse</th>
                    <th className="px-4 py-3 font-medium">Zone</th>
                    <th className="px-4 py-3 font-medium">Bin</th>
                    <th className="px-4 py-3 font-medium">On Hand</th>
                    <th className="px-4 py-3 font-medium">Allocated</th>
                    <th className="px-4 py-3 font-medium">Available</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map((inv) => {
                      const status = getInventoryStatus(inv);
                      const available = inv.quantity - inv.allocatedQuantity;
                      
                      // Get category name
                      const category = inv.item?.categoryId
                        ? categories?.find(c => c.id === inv.item.categoryId)?.name || "Uncategorized"
                        : "Uncategorized";
                        
                      return (
                        <tr key={inv.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 text-primary font-medium">{inv.item?.sku || 'N/A'}</td>
                          <td className="px-4 py-3">{inv.item?.name || 'N/A'}</td>
                          <td className="px-4 py-3">{category}</td>
                          <td className="px-4 py-3">{inv.bin?.zone?.warehouse?.name || 'N/A'}</td>
                          <td className="px-4 py-3">{inv.bin?.zone?.name || 'N/A'}</td>
                          <td className="px-4 py-3">{inv.bin?.code || 'N/A'}</td>
                          <td className="px-4 py-3 font-medium">{inv.quantity}</td>
                          <td className="px-4 py-3">{inv.allocatedQuantity}</td>
                          <td className="px-4 py-3">{available}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={status} />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                        No inventory data found for the selected filters.
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
              Inventory Status Distribution
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
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
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
              Inventory by Category
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
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70} 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} items`, 'Quantity']} />
                    <Bar dataKey="value" fill="#2563eb" />
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

      {/* Hidden link for CSV download */}
      <a ref={csvLinkRef} className="hidden"></a>
    </div>
  );
};

export default InventoryReport;
