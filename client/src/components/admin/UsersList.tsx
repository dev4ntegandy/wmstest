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
import { Eye, Edit, Plus, Search, UserPlus, Key } from "lucide-react";
import { User, Role, Organization } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import Pagination from "@/components/common/Pagination";
import StatusBadge from "@/components/common/StatusBadge";

// Extend the schema for form validation
const formSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

const UsersList = () => {
  const { currentOrganization, hasPermission } = useAuth();
  const { toast } = useToast();
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const itemsPerPage = 10;

  // Fetch users
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: [
      `/api/users${currentOrganization ? `?organizationId=${currentOrganization.id}` : ""}`
    ],
    enabled: hasPermission("users:read"),
  });

  // Fetch roles for dropdown
  const { data: roles = [] } = useQuery({
    queryKey: [`/api/roles`],
    enabled: hasPermission("roles:read"),
  });

  // Fetch organizations for dropdown
  const { data: organizations = [] } = useQuery({
    queryKey: [`/api/organizations`],
    enabled: hasPermission("organizations:read"),
  });

  // Filter and paginate users
  const filteredUsers = users.filter(user => 
    !searchTerm || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      fullName: "",
      isActive: true,
      organizationId: currentOrganization?.id || undefined,
      roleId: undefined,
    },
  });

  // Password reset form
  const passwordForm = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(
      z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      })
    ),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Create/update user mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { confirmPassword, ...userData } = values;
      
      if (selectedUser) {
        return apiRequest("PATCH", `/api/users/${selectedUser.id}`, userData);
      } else {
        return apiRequest("POST", "/api/users", userData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users`] });
      setShowUserModal(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: `User ${selectedUser ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${selectedUser ? "update" : "create"} user.`,
        variant: "destructive",
      });
    },
  });

  // Password reset mutation
  const passwordMutation = useMutation({
    mutationFn: async (values: { password: string }) => {
      if (!selectedUser) throw new Error("No user selected");
      return apiRequest("PATCH", `/api/users/${selectedUser.id}`, { password: values.password });
    },
    onSuccess: () => {
      setShowPasswordDialog(false);
      toast({
        title: "Success",
        description: "Password updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    setSelectedUser(null);
    form.reset({
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      fullName: "",
      isActive: true,
      organizationId: currentOrganization?.id || undefined,
      roleId: undefined,
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    form.reset({
      username: user.username,
      password: "", // Don't set password when editing
      confirmPassword: "", // Don't set password when editing
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      organizationId: user.organizationId,
      roleId: user.roleId,
    });
    setShowUserModal(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    passwordForm.reset({
      password: "",
      confirmPassword: "",
    });
    setShowPasswordDialog(true);
  };

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const onPasswordSubmit = (values: { password: string; confirmPassword: string }) => {
    passwordMutation.mutate({ password: values.password });
  };

  const getRoleName = (roleId: number | undefined) => {
    if (!roleId) return "None";
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : "Unknown";
  };

  const getOrganizationName = (orgId: number | undefined) => {
    if (!orgId) return "None";
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : "Unknown";
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
        <h1 className="text-2xl font-semibold text-slate-800">User Management</h1>
        <Button onClick={handleCreateUser} className="px-3 py-2 text-sm">
          <UserPlus className="w-4 h-4 mr-1" />
          New User
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
              placeholder="Search users..."
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
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="text-left text-sm border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Full Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{user.username}</td>
                      <td className="px-4 py-3">{user.fullName}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{getRoleName(user.roleId)}</td>
                      <td className="px-4 py-3">{getOrganizationName(user.organizationId)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge 
                          status={user.isActive ? "Active" : "Inactive"} 
                          type={user.isActive ? "success" : "error"} 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            className="text-slate-500 hover:text-primary"
                            title="Edit"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="text-slate-500 hover:text-primary"
                            title="Reset Password"
                            onClick={() => handleResetPassword(user)}
                          >
                            <Key className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No users found. Try adjusting your search or create a new user.
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
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
          />
        </CardContent>
      </Card>

      {/* User Form Dialog */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Edit User" : "Create New User"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username*</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!selectedUser} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!selectedUser && (
                <>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password*</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password*</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
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
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
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
                  onClick={() => setShowUserModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving..." : (selectedUser ? "Update User" : "Create User")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password*</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password*</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-4 space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowPasswordDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={passwordMutation.isPending}
                >
                  {passwordMutation.isPending ? "Updating..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersList;
