import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order, Shipment, insertShipmentSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Download, Package, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Extend the shipment schema for form validation
const formSchema = insertShipmentSchema
  .extend({
    dimensions: z.object({
      length: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
    }).optional(),
    updateOrderStatus: z.boolean().optional(),
  })
  .refine(data => !!data.carrier, {
    message: "Carrier is required",
    path: ["carrier"],
  });

type FormValues = z.infer<typeof formSchema>;

interface LabelGeneratorProps {
  order: Order | null;
  shipment: Shipment | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const LabelGenerator = ({ order, shipment, onSuccess, onCancel }: LabelGeneratorProps) => {
  const { user } = useAuth();
  const [mockLabelGenerated, setMockLabelGenerated] = useState(false);
  const [serverError, setServerError] = useState("");

  // Available carriers for the select dropdown
  const carriers = [
    { value: "USPS", label: "USPS" },
    { value: "UPS", label: "UPS" },
    { value: "FedEx", label: "FedEx" },
    { value: "DHL", label: "DHL" },
  ];

  // Initialize form with defaults or existing shipment data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderId: shipment?.orderId || order?.id || 0,
      carrier: shipment?.carrier || carriers[0].value,
      trackingNumber: shipment?.trackingNumber || "",
      shippingCost: shipment?.shippingCost || 0,
      weight: shipment?.weight || 0,
      dimensions: shipment?.dimensions || { length: 0, width: 0, height: 0 },
      labelUrl: shipment?.labelUrl || "",
      status: shipment?.status || "pending",
      createdBy: user?.id || 0,
      updateOrderStatus: true,
    },
  });

  // Create or update shipment mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { updateOrderStatus, ...shipmentData } = values;
      
      // For view-only mode, just return without making an API request
      if (shipment && !mockLabelGenerated) {
        return { ok: true, json: () => shipment };
      }
      
      // Generate a mock tracking number if needed (for new shipments or when generating a mock label)
      if (!shipmentData.trackingNumber || mockLabelGenerated) {
        const carrier = shipmentData.carrier.toUpperCase();
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        shipmentData.trackingNumber = `${carrier}${random}`;
      }
      
      // Set a mock label URL if needed
      if (mockLabelGenerated) {
        shipmentData.labelUrl = "https://example.com/labels/mock-label.pdf";
        shipmentData.status = "label_created";
      }
      
      if (shipment) {
        return apiRequest("PATCH", `/api/shipments/${shipment.id}`, { 
          ...shipmentData,
          updateOrderStatus
        });
      } else {
        return apiRequest("POST", "/api/shipments", { 
          ...shipmentData,
          updateOrderStatus
        });
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/shipments`] });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/orders?organizationId=${order?.organizationId || 0}`] 
      });
      
      setMockLabelGenerated(false);
      onSuccess();
    },
    onError: (error: any) => {
      setServerError(error.message || "Failed to create shipment. Please try again.");
    },
  });

  const onSubmit = (values: FormValues) => {
    setServerError("");
    mutation.mutate(values);
  };

  const handleGenerateLabel = () => {
    setMockLabelGenerated(true);
    form.setValue("status", "label_created");
    form.handleSubmit(onSubmit)();
  };

  // For view-only mode
  const isViewMode = !!shipment && !mockLabelGenerated;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="bg-red-50 p-4 rounded-md mb-6">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        {/* Order information */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Order Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Order Number</p>
                <p className="font-medium">{order?.orderNumber || shipment?.order?.orderNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-medium">{order?.customerName || shipment?.order?.customerName || "N/A"}</p>
              </div>
            </div>
            
            <Separator className="my-3" />
            
            <h4 className="text-sm font-medium mb-2">Shipping Address</h4>
            <div className="text-sm">
              {order?.shippingAddress ? (
                <>
                  <p>{order.shippingAddress.address1}</p>
                  {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </>
              ) : (
                <p className="text-slate-500">Address not available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="carrier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carrier*</FormLabel>
                <Select
                  disabled={isViewMode}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {carriers.map((carrier) => (
                      <SelectItem key={carrier.value} value={carrier.value}>
                        {carrier.label}
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
            name="trackingNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Number</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isViewMode || mockLabelGenerated} placeholder="Auto-generated upon label creation" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    disabled={isViewMode}
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
            name="shippingCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shipping Cost</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    disabled={isViewMode}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  disabled={isViewMode || mockLabelGenerated}
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
                    <SelectItem value="label_created">Label Created</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    disabled={isViewMode}
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
                    disabled={isViewMode}
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
                    disabled={isViewMode}
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

        {!isViewMode && (
          <FormField
            control={form.control}
            name="updateOrderStatus"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                  />
                </FormControl>
                <FormLabel className="m-0">Update order status to "shipped"</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Label preview for view mode */}
        {isViewMode && shipment?.labelUrl && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2 flex items-center">
                <Truck className="h-4 w-4 mr-2" />
                Shipping Label
              </h3>
              <div className="flex items-center justify-center p-4 border border-dashed border-slate-300 rounded bg-slate-50">
                <div className="text-center">
                  <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">Shipping label has been generated</p>
                  <p className="text-xs text-slate-500 mb-2">Tracking Number: {shipment.trackingNumber}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={shipment.labelUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" />
                      Download Label
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          
          {!isViewMode && (
            <>
              {shipment ? (
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Update Shipment"}
                </Button>
              ) : (
                <>
                  <Button 
                    type="button" 
                    onClick={handleGenerateLabel}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Processing..." : "Generate Label"}
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : "Save Without Label"}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </form>
    </Form>
  );
};

export default LabelGenerator;
