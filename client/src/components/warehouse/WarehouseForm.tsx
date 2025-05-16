import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertWarehouseSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Warehouse } from "@shared/schema";

// Extend the insert schema for form validation
const formSchema = insertWarehouseSchema
  .extend({})
  .refine(data => !!data.name, {
    message: "Warehouse name is required",
    path: ["name"],
  })
  .refine(data => !!data.code, {
    message: "Warehouse code is required",
    path: ["code"],
  });

interface WarehouseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  warehouse?: Warehouse | null;
}

const WarehouseForm = ({ onSuccess, onCancel, warehouse }: WarehouseFormProps) => {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  // Initialize form with defaults or existing warehouse
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: warehouse?.name || "",
      code: warehouse?.code || "",
      address: warehouse?.address || "",
      organizationId: currentOrganization?.id || 0,
    },
  });

  // Create or update warehouse mutation
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const data = {
        ...values,
        organizationId: currentOrganization?.id,
      };
      
      if (warehouse) {
        return apiRequest("PATCH", `/api/warehouses/${warehouse.id}`, data);
      } else {
        return apiRequest("POST", "/api/warehouses", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/warehouses?organizationId=${currentOrganization?.id || 0}`]
      });
      toast({
        title: "Success",
        description: `Warehouse ${warehouse ? "updated" : "created"} successfully.`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save warehouse. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warehouse Name*</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Main Warehouse" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warehouse Code*</FormLabel>
              <FormControl>
                <Input {...field} placeholder="MAIN-01" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="123 Main St, City, State, ZIP" />
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
              `Save Warehouse`
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WarehouseForm;
