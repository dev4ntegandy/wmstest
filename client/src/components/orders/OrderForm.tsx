import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertOrderSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash } from "lucide-react";
import { Order } from "@shared/schema";

// Extend schema for form validation
const orderItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

const formSchema = insertOrderSchema
  .extend({
    shippingAddress: z.object({
      address1: z.string().min(1, "Address is required"),
      address2: z.string().optional(),
      city: z.string().min(1, "City is required"),
      state: z.string().min(1, "State is required"),
      zipCode: z.string().min(1, "ZIP code is required"),
      country: z.string().min(1, "Country is required"),
    }),
    items: z.array(orderItemSchema).min(1, "At least one item is required"),
  })
  .refine(data => !!data.orderNumber, {
    message: "Order number is required",
    path: ["orderNumber"],
  })
  .refine(data => !!data.customerName, {
    message: "Customer name is required",
    path: ["customerName"],
  });

type FormValues = z.infer<typeof formSchema>;

interface OrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  order?: Order | null;
}

const OrderForm = ({ onSuccess, onCancel, order }: OrderFormProps) => {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [serverError, setServerError] = useState("");

  // Fetch items for dropdown
  const { data: items } = useQuery({
    queryKey: [`/api/items?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization?.id,
  });

  // Fetch order items if editing
  const { data: orderItems } = useQuery({
    queryKey: [`/api/order-items?orderId=${order?.id || 0}`],
    enabled: !!order?.id,
  });

  // Generate a new order number
  const generateOrderNumber = () => {
    const prefix = "ORD";
    const timestamp = new Date().getTime().toString().substring(7);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderNumber: order?.orderNumber || generateOrderNumber(),
      customerName: order?.customerName || "",
      customerEmail: order?.customerEmail || "",
      shippingAddress: order?.shippingAddress || {
        address1: "",
        address2: "",
        city: "",
        state: "",
        zipCode: "",
        country: "USA",
      },
      status: order?.status || "pending",
      notes: order?.notes || "",
      organizationId: currentOrganization?.id || 0,
      createdBy: 0, // Will be set by the backend
      items: orderItems?.map(item => ({
        itemId: item.itemId.toString(),
        quantity: item.quantity,
      })) || [{ itemId: "", quantity: 1 }],
    },
  });

  // Field array for order items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Create/update order mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Process data for API
      const processedData = {
        ...values,
        organizationId: currentOrganization?.id,
        // Convert itemId strings to numbers
        items: values.items.map(item => ({
          ...item,
          itemId: parseInt(item.itemId),
        })),
      };

      if (order) {
        return apiRequest("PATCH", `/api/orders/${order.id}`, processedData);
      } else {
        return apiRequest("POST", "/api/orders", processedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/orders?organizationId=${currentOrganization?.id || 0}`] 
      });
      
      toast({
        title: "Success",
        description: `Order ${order ? "updated" : "created"} successfully.`,
      });
      
      onSuccess();
    },
    onError: (error: any) => {
      setServerError(error.message || "Failed to save order. Please try again.");
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
            name="orderNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Number*</FormLabel>
                <FormControl>
                  <Input {...field} readOnly={!!order} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="allocated">Allocated</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name*</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="customerEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Shipping Address</h3>
          
          <FormField
            control={form.control}
            name="shippingAddress.address1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1*</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="shippingAddress.address2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="shippingAddress.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City*</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="shippingAddress.state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State/Province*</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="shippingAddress.zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP/Postal Code*</FormLabel>
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
            name="shippingAddress.country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country*</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Order Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ itemId: "", quantity: 1 })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
          
          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-6">
                    <Label htmlFor={`items.${index}.itemId`}>Item*</Label>
                    <Controller
                      name={`items.${index}.itemId`}
                      control={form.control}
                      render={({ field: itemField }) => (
                        <Select
                          value={itemField.value}
                          onValueChange={itemField.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items?.map((item) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.sku} - {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.items?.[index]?.itemId && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.items[index]?.itemId?.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="md:col-span-4">
                    <Label htmlFor={`items.${index}.quantity`}>Quantity*</Label>
                    <Controller
                      name={`items.${index}.quantity`}
                      control={form.control}
                      render={({ field: quantityField }) => (
                        <Input
                          type="number"
                          min="1"
                          onChange={(e) => quantityField.onChange(parseInt(e.target.value))}
                          value={quantityField.value}
                        />
                      )}
                    />
                    {form.formState.errors.items?.[index]?.quantity && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {form.formState.errors.items?.message && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.items.message}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Notes</FormLabel>
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
              `Save Order`
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Controller component for React Hook Form
function Controller({ name, control, render }: any) {
  const { field } = useForm().register(name);
  return render({ field });
}

export default OrderForm;
