import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Warehouse } from "lucide-react";

const WarehouseSetup = () => {
  const { currentOrganization } = useAuth();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Warehouse Setup</h1>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-200 px-6 py-4">
          <CardTitle className="text-lg font-medium">Warehouse Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Warehouse className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">This feature is currently in development.</p>
            <p className="text-slate-500 mb-6">Check back soon for warehouse configuration functionality.</p>
            <Button disabled>Coming Soon</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default WarehouseSetup;