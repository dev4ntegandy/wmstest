import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertItemSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Item } from "@shared/schema";

// Extend the insert schema for form validation
const formSchema = insertItemSchema
  .extend({
    dimensions: z.object({
      length: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
    }).optional(),
    initialQuantity: z.number().min(0).optional(),
  })
  .refine(data => !!data.sku, {
    message: "SKU is required",
    path: ["sku"],
  })
  .refine(data => !!data.name, {
    message: "Item name is required",
    path: ["name"],
  });

type FormValues = z.infer<typeof formSchema>;

interface NewItemFormProps {
  onSave: () => void;
  onCancel: () => void;
  item?: Item | null;
}

const NewItemForm = ({ onSave, onCancel, item }: NewItemFormProps) => {
  const { currentOrganization } = useAuth();
  const [serverError, setServerError] = useState("");

  // Get categories for the dropdown
  const { data: categories } = useQuery({
    queryKey: [`/api/categories?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization,
  });

  // Get suppliers for the dropdown
  const { data: suppliers } = useQuery({
    queryKey: [`/api/suppliers?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization,
  });

  // Initialize form with default values or existing item
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: item?.sku || "",
      name: item?.name || "",
      description: item?.description || "",
      barcode: item?.barcode || "",
      categoryId: item?.categoryId ? String(item.categoryId) : undefined,
      supplierId: item?.supplierId ? String(item.supplierId) : undefined,
      dimensions: item?.dimensions || { length: 0, width: 0, height: 0 },
      weight: item?.weight || 0,
      reorderPoint: item?.reorderPoint || 0,
      reorderQuantity: item?.reorderQuantity || 0,
      notes: item?.notes || "",
      organizationId: currentOrganization?.id || 0,
      initialQuantity: 0, // Custom field for initial inventory
    },
  });

  // Create or update item mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { initialQuantity, ...itemData } = values;
      
      // Parse numeric fields from strings
      const processedData = {
        ...itemData,
        categoryId: itemData.categoryId ? parseInt(itemData.categoryId as string) : undefined,
        supplierId: itemData.supplierId ? parseInt(itemData.supplierId as string) : undefined,
        organizationId: currentOrganization?.id || 0,
      };
      
      if (item) {
        // Update existing item
        return apiRequest("PATCH", `/api/items/${item.id}`, processedData);
      } else {
        // Create new item
        return apiRequest("POST", "/api/items", processedData);
      }
    },
    onSuccess: async (response) => {
      const savedItem = await response.json();
      
      // If this is a new item and initial quantity > 0, create inventory entry
      const initialQuantity = form.getValues("initialQuantity");
      if (!item && initialQuantity && initialQuantity > 0) {
        // In a real implementation, we'd create an inventory entry here
        // and handle bin selection. For the MVP, we're just acknowledging it.
        console.log(`Would create inventory with quantity ${initialQuantity} for item ${savedItem.id}`);
      }
      
      // Invalidate items query to refetch
      queryClient.invalidateQueries({ queryKey: [`/api/items?organizationId=${currentOrganization?.id || 0}`] });
      onSave();
    },
    onError: (error: any) => {
      setServerError(error.message || "Failed to save item. Please try again.");
    },
  });

  const onSubmit = (values: FormValues) => {
    setServerError("");
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="bg-red-50 p-4 rounded-md mb-6">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU*</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="barcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barcode</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name*</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Select category...</SelectItem>
                    {categories?.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Select supplier...</SelectItem>
                    {suppliers?.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-6">
          <h4 className="font-medium mb-2">Dimensions & Weight</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="dimensions.length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Length (cm)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dimensions.width"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Width (cm)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dimensions.height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium mb-2">Inventory Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!item && (
              <FormField
                control={form.control}
                name="initialQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="reorderPoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Point</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reorderQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              `Save Item`
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default NewItemForm;
