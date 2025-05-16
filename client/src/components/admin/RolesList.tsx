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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Edit, Plus, Search } from "lucide-react";
import { Role } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertRoleSchema } from "@shared/schema";
import Pagination from "@/components/common/Pagination";

// Define available permissions for the system
const availablePermissions = [
  { value: "users:read", label: "View Users" },
  { value: "users:create", label: "Create Users" },
  { value: "users:update", label: "Update Users" },
  { value: "users:delete", label: "Delete Users" },
  
  { value: "roles:read", label: "View Roles" },
  { value: "roles:create", label: "Create Roles" },
  { value: "roles:update", label: "Update Roles" },
  { value: "roles:delete", label: "Delete Roles" },
  
  { value: "organizations:read", label: "View Organizations" },
  { value: "organizations:create", label: "Create Organizations" },
  { value: "organizations:update", label: "Update Organizations" },
  { value: "organizations:delete", label: "Delete Organizations" },
  
  { value: "warehouses:read", label: "View Warehouses" },
  { value: "warehouses:create", label: "Create Warehouses" },
  { value: "warehouses:update", label: "Update Warehouses" },
  { value: "warehouses:delete", label: "Delete Warehouses" },
  
  { value: "inventory:read", label: "View Inventory" },
  { value: "inventory:create", label: "Create Inventory" },
  { value: "inventory:update", label: "Update Inventory" },
  { value: "inventory:delete", label: "Delete Inventory" },
  
  { value: "orders:read", label: "View Orders" },
  { value: "orders:create", label: "Create Orders" },
  { value: "orders:update", label: "Update Orders" },
  { value: "orders:process", label: "Process Orders" },
  
  { value: "shipping:read", label: "View Shipments" },
  { value: "shipping:create", label: "Create Shipments" },
  { value: "shipping:update", label: "Update Shipments" },
  
  { value: "reports:read", label: "View Reports" },
  { value: "logs:read", label: "View Logs" },
];

// Form schema with extended validation
const formSchema = insertRoleSchema.extend({
  selectedPermissions: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const RolesList = () => {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // Fetch roles
  const { data: roles = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/roles`],
    enabled: hasPermission("roles:read"),
  });

  // Filter and paginate roles
  const filteredRoles = roles.filter(role => 
    !searchTerm || 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedRoles = filteredRoles.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      scope: "organization",
      permissions: [],
      selectedPermissions: [],
    },
  });

  // Create/update role mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Transform selected permissions into permissions array
      const { selectedPermissions, ...roleData } = values;
      
      // If the special "all" permission is selected, use that alone
      // Otherwise, use the array of selected permissions
      const permissions = selectedPermissions?.includes("all") 
        ? ["all"] 
        : selectedPermissions || [];
      
      const finalData = {
        ...roleData,
        permissions,
      };
      
      if (selectedRole) {
        return apiRequest("PATCH", `/api/roles/${selectedRole.id}`, finalData);
      } else {
        return apiRequest("POST", "/api/roles", finalData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/roles`] });
      setShowRoleModal(false);
      setSelectedRole(null);
      toast({
        title: "Success",
        description: `Role ${selectedRole ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${selectedRole ? "update" : "create"} role.`,
        variant: "destructive",
      });
    },
  });

  const handleCreateRole = () => {
    setSelectedRole(null);
    form.reset({
      name: "",
      description: "",
      scope: "organization",
      permissions: [],
      selectedPermissions: [],
    });
    setShowRoleModal(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    
    // Special case for "all" permission
    const selectedPermissions = role.permissions.includes("all")
      ? ["all"]
      : role.permissions;
    
    form.reset({
      name: role.name,
      description: role.description || "",
      scope: role.scope,
      permissions: role.permissions,
      selectedPermissions,
    });
    setShowRoleModal(true);
  };

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  // Group permissions by area (first part before the colon)
  const groupedPermissions = availablePermissions.reduce<Record<string, typeof availablePermissions>>((acc, perm) => {
    const [area] = perm.value.split(':');
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(perm);
    return acc;
  }, {});

  // Handle special "all" permission selection
  const handleGlobalAdminChange = (checked: boolean) => {
    if (checked) {
      form.setValue("selectedPermissions", ["all"]);
    } else {
      form.setValue("selectedPermissions", []);
    }
  };

  // Handle permission selection
  const handlePermissionChange = (permission: string, checked: boolean) => {
    const currentPermissions = form.getValues("selectedPermissions") || [];
    
    // If "all" is being toggled or is already selected, handle specially
    if (permission === "all") {
      return handleGlobalAdminChange(checked);
    }
    
    // If "all" is selected and another permission is being selected, remove "all"
    if (currentPermissions.includes("all") && checked) {
      const newPermissions = availablePermissions
        .map(p => p.value)
        .filter(p => p !== "all");
      form.setValue("selectedPermissions", newPermissions);
      return;
    }
    
    // Normal toggle behavior
    const newPermissions = checked
      ? [...currentPermissions, permission]
      : currentPermissions.filter(p => p !== permission);
    
    form.setValue("selectedPermissions", newPermissions);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Role Management</h1>
        <Button onClick={handleCreateRole} className="px-3 py-2 text-sm">
          <ShieldCheck className="w-4 h-4 mr-1" />
          New Role
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
              placeholder="Search roles..."
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
            Roles ({filteredRoles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="text-left text-sm border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Scope</th>
                  <th className="px-4 py-3 font-medium">Permissions</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedRoles.length > 0 ? (
                  paginatedRoles.map((role) => {
                    // Format the scope for display
                    const formattedScope = role.scope.charAt(0).toUpperCase() + role.scope.slice(1);
                    
                    return (
                      <tr key={role.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{role.name}</td>
                        <td className="px-4 py-3">{role.description || "—"}</td>
                        <td className="px-4 py-3">{formattedScope}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.includes("all") ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                All Permissions
                              </Badge>
                            ) : (
                              role.permissions.slice(0, 3).map((perm, index) => (
                                <Badge key={index} variant="outline" className="bg-slate-100">
                                  {perm}
                                </Badge>
                              ))
                            )}
                            {role.permissions.length > 3 && !role.permissions.includes("all") && (
                              <Badge variant="outline" className="bg-slate-100">
                                +{role.permissions.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              className="text-slate-500 hover:text-primary"
                              title="Edit"
                              onClick={() => handleEditRole(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No roles found. Try adjusting your search or create a new role.
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
            totalItems={filteredRoles.length}
            itemsPerPage={itemsPerPage}
          />
        </CardContent>
      </Card>

      {/* Role Form Dialog */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name*</FormLabel>
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
              
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="organization">Organization</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <FormLabel>Permissions</FormLabel>
                
                <div className="p-4 border rounded-md">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="all-permissions"
                      checked={form.watch("selectedPermissions")?.includes("all") || false}
                      onCheckedChange={(checked) => 
                        handleGlobalAdminChange(checked === true)
                      }
                    />
                    <label
                      htmlFor="all-permissions"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Global Admin (All Permissions)
                    </label>
                  </div>
                  
                  {/* Only show individual permissions if "all" not selected */}
                  {!form.watch("selectedPermissions")?.includes("all") && (
                    <div className="space-y-6">
                      {Object.entries(groupedPermissions).map(([group, permissions]) => (
                        <div key={group} className="space-y-2">
                          <h4 className="text-sm font-semibold capitalize">{group}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {permissions.map((perm) => (
                              <div key={perm.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={perm.value}
                                  checked={form.watch("selectedPermissions")?.includes(perm.value) || false}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(perm.value, checked === true)
                                  }
                                />
                                <label
                                  htmlFor={perm.value}
                                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {perm.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-4 space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowRoleModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving..." : (selectedRole ? "Update Role" : "Create Role")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RolesList;
