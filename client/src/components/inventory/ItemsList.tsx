import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Eye, Edit, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/common/StatusBadge";
import Pagination from "@/components/common/Pagination";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NewItemForm from "./NewItemForm";
import { Item } from "@shared/schema";
import ItemFilters from "./ItemFilters";

const ItemsList = () => {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    status: "",
    warehouseId: ""
  });
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const itemsPerPage = 20;

  // Fetch items for the current organization
  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: [
      `/api/items?organizationId=${currentOrganization?.id || 0}${
        filters.categoryId ? `&categoryId=${filters.categoryId}` : ""
      }`
    ],
    enabled: !!currentOrganization,
  });

  // Filter items based on search and status
  const filteredItems = items?.filter(item => {
    const matchesSearch = !filters.search || 
      item.sku.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(filters.search.toLowerCase()));
    
    // We'll need to expand this with actual inventory data in a real implementation
    const matchesStatus = !filters.status || 
      (filters.status === "in_stock" && item.id % 3 !== 0) ||  // Mock logic for demo
      (filters.status === "low_stock" && item.id % 3 === 1) ||
      (filters.status === "out_of_stock" && item.id % 3 === 0);
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate pagination
  const paginatedItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleItemSaved = () => {
    refetch();
    setShowNewItemModal(false);
    setEditingItem(null);
    toast({
      title: "Success",
      description: `Item ${editingItem ? "updated" : "created"} successfully.`,
    });
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowNewItemModal(true);
  };

  const getItemStatus = (item: Item) => {
    // Mock status logic for demo
    if (item.id % 3 === 0) return "Out of Stock";
    if (item.id % 3 === 1) return "Low Stock";
    return "In Stock";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <p>Failed to load inventory items. Please try again.</p>
            <Button onClick={() => refetch()} className="mt-2">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800">Item Master</h1>
          <div className="flex space-x-2">
            <Button variant="outline" className="px-3 py-2 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </Button>
            <Button variant="outline" className="px-3 py-2 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
            <Button 
              onClick={() => {
                setEditingItem(null);
                setShowNewItemModal(true);
              }}
              className="px-3 py-2 text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Item
            </Button>
          </div>
        </div>
      </div>

      <ItemFilters 
        filters={filters} 
        onFilterChange={handleFilterChange}
      />

      <Card className="mt-6">
        <CardHeader className="border-b border-slate-200 px-4 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Inventory Items ({filteredItems.length})
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500">Show:</span>
            <select 
              className="text-sm border border-slate-300 rounded px-2 py-1"
              value={itemsPerPage}
              onChange={() => {}} // This would be implemented in a real application
            >
              <option>20</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="text-left text-sm border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">On Hand</th>
                  <th className="px-4 py-3 font-medium">Allocated</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium">Locations</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item) => {
                    // Mock inventory data for demo
                    const onHand = 100 + item.id * 2;
                    const allocated = Math.floor(onHand * 0.2);
                    const available = onHand - allocated;
                    const locations = (item.id % 5) + 1;
                    const status = getItemStatus(item);

                    return (
                      <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 text-primary font-medium">{item.sku}</td>
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3">{item.categoryId || 'Uncategorized'}</td>
                        <td className="px-4 py-3 font-medium">{onHand}</td>
                        <td className="px-4 py-3">{allocated}</td>
                        <td className="px-4 py-3">{available}</td>
                        <td className="px-4 py-3">{locations}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button className="text-slate-500 hover:text-primary" title="View">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              className="text-slate-500 hover:text-primary" 
                              title="Edit"
                              onClick={() => handleEditItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-slate-500 hover:text-primary" title="Adjust Inventory">
                              <BarChart className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No items found. Try adjusting your filters or create a new item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
          />
        </CardContent>
      </Card>

      <Dialog 
        open={showNewItemModal} 
        onOpenChange={setShowNewItemModal}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <NewItemForm 
            onSave={handleItemSaved} 
            onCancel={() => {
              setShowNewItemModal(false);
              setEditingItem(null);
            }}
            item={editingItem}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ItemsList;
