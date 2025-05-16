import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import RolesList from "@/components/admin/RolesList";

const Roles = () => {
  const { currentOrganization, hasPermission } = useAuth();
  
  return (
    <>
      <div className="space-y-6">
        {hasPermission("roles:read") ? (
          <RolesList />
        ) : (
          <Card>
            <CardHeader className="border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-lg font-medium">Roles</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">You don't have permission to view roles.</p>
                <p className="text-slate-500 mb-6">Please contact your administrator for access.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default Roles;