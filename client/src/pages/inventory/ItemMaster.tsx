import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package, Edit, Plus, Search, AlertCircle } from "lucide-react";
import { Item } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertItemSchema } from "@shared/schema";

// Extended schema with validation
const formSchema = insertItemSchema.extend({
  reorderPoint: z.coerce.number().min(0, "Reorder point must be a positive number"),
  reorderQuantity: z.coerce.number().min(0, "Reorder quantity must be a positive number"),
});

type FormValues = z.infer<typeof formSchema>;

const ItemMaster = () => {
  const { currentOrganization, hasPermission } = useAuth();
  const { toast } = useToast();
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // Fetch items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: [`/api/items?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization?.id && hasPermission("inventory:read"),
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: [`/api/categories?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization?.id && hasPermission("inventory:read"),
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: undefined,
      supplierId: undefined,
      uom: "EA", // Default unit of measure
      price: 0,
      cost: 0,
      weight: 0,
      dimensions: "",
      reorderPoint: 0,
      reorderQuantity: 0,
      isActive: true,
      organizationId: currentOrganization?.id,
    },
  });

  // Create/update item mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (selectedItem) {
        return apiRequest("PATCH", `/api/items/${selectedItem.id}`, values);
      } else {
        return apiRequest("POST", "/api/items", values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/items?organizationId=${currentOrganization?.id || 0}`] });
      setShowItemModal(false);
      setSelectedItem(null);
      toast({
        title: "Success",
        description: `Item ${selectedItem ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${selectedItem ? "update" : "create"} item.`,
        variant: "destructive",
      });
    },
  });

  const handleCreateItem = () => {
    setSelectedItem(null);
    form.reset({
      name: "",
      sku: "",
      description: "",
      categoryId: undefined,
      supplierId: undefined,
      uom: "EA",
      price: 0,
      cost: 0,
      weight: 0,
      dimensions: "",
      reorderPoint: 0,
      reorderQuantity: 0,
      isActive: true,
      organizationId: currentOrganization?.id,
    });
    setShowItemModal(true);
  };

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Item Master</h1>
        <Button onClick={handleCreateItem} className="px-3 py-2 text-sm" disabled={!hasPermission("inventory:create")}>
          <Package className="w-4 h-4 mr-1" />
          New Item
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative w-full max-w-sm">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search items..."
              className="pr-10"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-200 px-4 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Items Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {itemsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{item.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">SKU: {item.sku}</p>
                        <p className="text-sm text-slate-500">Category: {getCategoryName(item.categoryId)}</p>
                        <p className="text-sm font-medium text-primary mt-2">${item.price.toFixed(2)}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Item">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-700">No Items Found</h3>
              <p className="text-slate-500 mt-1 mb-5">Start by adding your first item to the inventory</p>
              <Button onClick={handleCreateItem} disabled={!hasPermission("inventory:create")}>
                <Package className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default ItemMaster;