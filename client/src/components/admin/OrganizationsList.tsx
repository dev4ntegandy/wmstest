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
import { Building, Edit, Plus, Search } from "lucide-react";
import { Organization } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertOrganizationSchema } from "@shared/schema";
import Pagination from "@/components/common/Pagination";
import StatusBadge from "@/components/common/StatusBadge";

// Form schema
const formSchema = insertOrganizationSchema;

type FormValues = z.infer<typeof formSchema>;

const OrganizationsList = () => {
  const { currentOrganization, hasPermission } = useAuth();
  const { toast } = useToast();
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // Fetch organizations
  const { data: organizations = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/organizations`],
    enabled: hasPermission("organizations:read"),
  });

  // Filter and paginate organizations
  const filteredOrgs = organizations.filter(org => 
    !searchTerm || 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedOrgs = filteredOrgs.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      parentId: undefined,
    },
  });

  // Create/update organization mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (selectedOrg) {
        return apiRequest("PATCH", `/api/organizations/${selectedOrg.id}`, values);
      } else {
        return apiRequest("POST", "/api/organizations", values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations`] });
      setShowOrgModal(false);
      setSelectedOrg(null);
      toast({
        title: "Success",
        description: `Organization ${selectedOrg ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${selectedOrg ? "update" : "create"} organization.`,
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = () => {
    setSelectedOrg(null);
    form.reset({
      name: "",
      description: "",
      isActive: true,
      parentId: undefined,
    });
    setShowOrgModal(true);
  };

  const handleEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    form.reset({
      name: org.name,
      description: org.description || "",
      isActive: org.isActive,
      parentId: org.parentId,
    });
    setShowOrgModal(true);
  };

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const getParentName = (parentId: number | undefined | null) => {
    if (!parentId) return "None";
    const parent = organizations.find(o => o.id === parentId);
    return parent ? parent.name : "Unknown";
  };

  // Get child organizations
  const getChildOrgs = (parentId: number) => {
    return organizations.filter(org => org.parentId === parentId);
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
        <h1 className="text-2xl font-semibold text-slate-800">Organization Management</h1>
        <Button onClick={handleCreateOrg} className="px-3 py-2 text-sm">
          <Building className="w-4 h-4 mr-1" />
          New Organization
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
              placeholder="Search organizations..."
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
            Organizations ({filteredOrgs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="text-left text-sm border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Parent</th>
                  <th className="px-4 py-3 font-medium">Child Organizations</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedOrgs.length > 0 ? (
                  paginatedOrgs.map((org) => {
                    const childOrgs = getChildOrgs(org.id);
                    
                    return (
                      <tr key={org.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{org.name}</td>
                        <td className="px-4 py-3">{org.description || "—"}</td>
                        <td className="px-4 py-3">{getParentName(org.parentId)}</td>
                        <td className="px-4 py-3">
                          {childOrgs.length > 0 ? (
                            <div>
                              {childOrgs.length} organization{childOrgs.length !== 1 ? 's' : ''}
                            </div>
                          ) : (
                            "None"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge 
                            status={org.isActive ? "Active" : "Inactive"} 
                            type={org.isActive ? "success" : "error"} 
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              className="text-slate-500 hover:text-primary"
                              title="Edit"
                              onClick={() => handleEditOrg(org)}
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
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No organizations found. Try adjusting your search or create a new organization.
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
            totalItems={filteredOrgs.length}
            itemsPerPage={itemsPerPage}
          />
        </CardContent>
      </Card>

      {/* Organization Form Dialog */}
      <Dialog open={showOrgModal} onOpenChange={setShowOrgModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedOrg ? "Edit Organization" : "Create New Organization"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name*</FormLabel>
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
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Organization</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None (Top-level organization)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None (Top-level organization)</SelectItem>
                        {organizations
                          .filter(org => org.id !== selectedOrg?.id) // Can't be parent of itself
                          .map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
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
                    <FormLabel className="m-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-4 space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowOrgModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving..." : (selectedOrg ? "Update Organization" : "Create Organization")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrganizationsList;
