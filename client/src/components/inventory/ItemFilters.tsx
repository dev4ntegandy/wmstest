import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface ItemFiltersProps {
  filters: {
    search: string;
    categoryId: string;
    status: string;
    warehouseId: string;
  };
  onFilterChange: (filters: {
    search: string;
    categoryId: string;
    status: string;
    warehouseId: string;
  }) => void;
}

const ItemFilters = ({ filters, onFilterChange }: ItemFiltersProps) => {
  const { currentOrganization } = useAuth();
  const [tempFilters, setTempFilters] = useState(filters);

  // Reset temp filters when main filters change (e.g. on reset)
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  // Fetch categories for filter dropdown
  const { data: categories } = useQuery({
    queryKey: [`/api/categories?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization,
  });

  // Fetch warehouses for filter dropdown
  const { data: warehouses } = useQuery({
    queryKey: [`/api/warehouses?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempFilters({
      ...tempFilters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setTempFilters({
      ...tempFilters,
      [name]: value,
    });
  };

  const applyFilters = () => {
    onFilterChange(tempFilters);
  };

  const resetFilters = () => {
    const resetValues = {
      search: "",
      categoryId: "",
      status: "",
      warehouseId: "",
    };
    setTempFilters(resetValues);
    onFilterChange(resetValues);
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <div className="relative">
              <Input
                name="search"
                value={tempFilters.search}
                onChange={handleInputChange}
                placeholder="Search by SKU, name, barcode..."
                className="w-full pr-10"
              />
              <div className="absolute right-3 top-2.5 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <Select
              value={tempFilters.categoryId}
              onValueChange={(value) => handleSelectChange("categoryId", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Status</label>
            <Select
              value={tempFilters.status}
              onValueChange={(value) => handleSelectChange("status", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse</label>
            <Select
              value={tempFilters.warehouseId}
              onValueChange={(value) => handleSelectChange("warehouseId", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Warehouses</SelectItem>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button
            variant="secondary" 
            className="px-3 py-1.5 mr-2"
            onClick={resetFilters}
          >
            Reset
          </Button>
          <Button
            className="px-3 py-1.5"
            onClick={applyFilters}
          >
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemFilters;
