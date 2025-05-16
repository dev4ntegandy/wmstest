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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertZoneSchema, insertBinSchema } from "@shared/schema";
import { Warehouse, Zone, Bin, BinType } from "@shared/schema";
import { ChevronRight, Edit, Plus, Trash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/common/StatusBadge";

interface LocationsListProps {
  warehouse: Warehouse;
}

const zoneSchema = insertZoneSchema
  .extend({})
  .refine(data => !!data.name, {
    message: "Zone name is required",
    path: ["name"],
  })
  .refine(data => !!data.code, {
    message: "Zone code is required",
    path: ["code"],
  });

const binSchema = insertBinSchema
  .extend({})
  .refine(data => !!data.name, {
    message: "Bin name is required",
    path: ["name"],
  })
  .refine(data => !!data.code, {
    message: "Bin code is required",
    path: ["code"],
  });

type ZoneFormValues = z.infer<typeof zoneSchema>;
type BinFormValues = z.infer<typeof binSchema>;

const LocationsList = ({ warehouse }: LocationsListProps) => {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showBinDialog, setShowBinDialog] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [activeTab, setActiveTab] = useState("zones");

  // Fetch zones
  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: [`/api/zones?warehouseId=${warehouse.id}`],
    enabled: !!warehouse.id,
  });

  // Fetch bin types
  const { data: binTypes } = useQuery({
    queryKey: [`/api/bin-types?organizationId=${currentOrganization?.id || 0}`],
    enabled: !!currentOrganization?.id,
  });

  // Fetch bins for selected zone
  const { data: bins, isLoading: binsLoading } = useQuery({
    queryKey: [`/api/bins?zoneId=${selectedZone?.id || 0}`],
    enabled: !!selectedZone?.id,
  });

  // Zone form
  const zoneForm = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: selectedZone?.name || "",
      code: selectedZone?.code || "",
      warehouseId: warehouse.id,
    },
  });

  // Bin form
  const binForm = useForm<BinFormValues>({
    resolver: zodResolver(binSchema),
    defaultValues: {
      name: selectedBin?.name || "",
      code: selectedBin?.code || "",
      zoneId: selectedZone?.id || 0,
      binTypeId: selectedBin?.binTypeId || undefined,
      isActive: selectedBin?.isActive || true,
    },
  });

  // Reset form when selection changes
  useState(() => {
    if (selectedZone) {
      zoneForm.reset({
        name: selectedZone.name,
        code: selectedZone.code,
        warehouseId: warehouse.id,
      });
    }
    
    if (selectedBin) {
      binForm.reset({
        name: selectedBin.name,
        code: selectedBin.code,
        zoneId: selectedZone?.id || 0,
        binTypeId: selectedBin.binTypeId,
        isActive: selectedBin.isActive,
      });
    }
  }, [selectedZone, selectedBin]);

  // Zone mutations
  const createZoneMutation = useMutation({
    mutationFn: (data: ZoneFormValues) => 
      apiRequest("POST", "/api/zones", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/zones?warehouseId=${warehouse.id}`] });
      setShowZoneDialog(false);
      toast({
        title: "Success",
        description: "Zone created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create zone",
        variant: "destructive",
      });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: (data: { id: number; values: ZoneFormValues }) => 
      apiRequest("PATCH", `/api/zones/${data.id}`, data.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/zones?warehouseId=${warehouse.id}`] });
      setShowZoneDialog(false);
      setSelectedZone(null);
      toast({
        title: "Success",
        description: "Zone updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update zone",
        variant: "destructive",
      });
    },
  });

  // Bin mutations
  const createBinMutation = useMutation({
    mutationFn: (data: BinFormValues) => 
      apiRequest("POST", "/api/bins", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bins?zoneId=${selectedZone?.id || 0}`] });
      setShowBinDialog(false);
      toast({
        title: "Success",
        description: "Bin created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bin",
        variant: "destructive",
      });
    },
  });

  const updateBinMutation = useMutation({
    mutationFn: (data: { id: number; values: BinFormValues }) => 
      apiRequest("PATCH", `/api/bins/${data.id}`, data.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bins?zoneId=${selectedZone?.id || 0}`] });
      setShowBinDialog(false);
      setSelectedBin(null);
      toast({
        title: "Success",
        description: "Bin updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bin",
        variant: "destructive",
      });
    },
  });

  // Submit handlers
  const handleZoneSubmit = (values: ZoneFormValues) => {
    if (selectedZone) {
      updateZoneMutation.mutate({ id: selectedZone.id, values });
    } else {
      createZoneMutation.mutate(values);
    }
  };

  const handleBinSubmit = (values: BinFormValues) => {
    if (selectedBin) {
      updateBinMutation.mutate({ id: selectedBin.id, values });
    } else {
      createBinMutation.mutate(values);
    }
  };

  // Add zone/bin handlers
  const handleAddZone = () => {
    setSelectedZone(null);
    zoneForm.reset({
      name: "",
      code: "",
      warehouseId: warehouse.id,
    });
    setShowZoneDialog(true);
  };

  const handleEditZone = (zone: Zone) => {
    setSelectedZone(zone);
    zoneForm.reset({
      name: zone.name,
      code: zone.code,
      warehouseId: warehouse.id,
    });
    setShowZoneDialog(true);
  };

  const handleAddBin = () => {
    if (!selectedZone) {
      toast({
        title: "Error",
        description: "Please select a zone first",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedBin(null);
    binForm.reset({
      name: "",
      code: "",
      zoneId: selectedZone.id,
      binTypeId: undefined,
      isActive: true,
    });
    setShowBinDialog(true);
  };

  const handleEditBin = (bin: Bin) => {
    setSelectedBin(bin);
    binForm.reset({
      name: bin.name,
      code: bin.code,
      zoneId: bin.zoneId,
      binTypeId: bin.binTypeId,
      isActive: bin.isActive,
    });
    setShowBinDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-slate-200 px-4 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            {warehouse.name} Locations
          </CardTitle>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList>
              <TabsTrigger value="zones">Zones</TabsTrigger>
              <TabsTrigger value="bins">Bins</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <TabsContent value="zones" className="p-0 m-0 border-0">
            <div className="flex justify-end p-3 border-b border-slate-200">
              <Button size="sm" onClick={handleAddZone}>
                <Plus className="h-4 w-4 mr-1" /> Add Zone
              </Button>
            </div>
            <div className="overflow-x-auto">
              {zonesLoading ? (
                <div className="p-4 text-center">Loading zones...</div>
              ) : zones && zones.length > 0 ? (
                <table className="w-full data-table">
                  <thead>
                    <tr className="text-left text-sm border-b border-slate-200">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Bins</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {zones.map((zone) => (
                      <tr 
                        key={zone.id} 
                        className={`border-b border-slate-200 hover:bg-slate-50 ${selectedZone?.id === zone.id ? 'bg-slate-50' : ''}`}
                        onClick={() => setSelectedZone(zone)}
                      >
                        <td className="px-4 py-3 font-medium">{zone.name}</td>
                        <td className="px-4 py-3">{zone.code}</td>
                        <td className="px-4 py-3">
                          {/* This would typically be a count of bins in the zone */}
                          {Math.floor(Math.random() * 20)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditZone(zone);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedZone(zone);
                                setActiveTab("bins");
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-slate-500">
                  No zones found for this warehouse. Click "Add Zone" to create one.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bins" className="p-0 m-0 border-0">
            <div className="flex justify-between items-center p-3 border-b border-slate-200">
              <div className="text-sm font-medium">
                {selectedZone ? `Bins in ${selectedZone.name}` : 'Select a zone to view bins'}
              </div>
              <Button 
                size="sm" 
                onClick={handleAddBin}
                disabled={!selectedZone}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Bin
              </Button>
            </div>
            <div className="overflow-x-auto">
              {!selectedZone ? (
                <div className="p-4 text-center text-slate-500">
                  Select a zone to view or add bins
                </div>
              ) : binsLoading ? (
                <div className="p-4 text-center">Loading bins...</div>
              ) : bins && bins.length > 0 ? (
                <table className="w-full data-table">
                  <thead>
                    <tr className="text-left text-sm border-b border-slate-200">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Bin Type</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {bins.map((bin) => {
                      const binType = binTypes?.find(type => type.id === bin.binTypeId);
                      return (
                        <tr key={bin.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{bin.name}</td>
                          <td className="px-4 py-3">{bin.code}</td>
                          <td className="px-4 py-3">{binType?.name || 'Standard'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge 
                              status={bin.isActive ? "Active" : "Inactive"}
                              type={bin.isActive ? "success" : "error"}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditBin(bin)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-slate-500">
                  No bins found in this zone. Click "Add Bin" to create one.
                </div>
              )}
            </div>
          </TabsContent>
        </CardContent>
      </Card>

      {/* Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedZone ? "Edit Zone" : "Add New Zone"}</DialogTitle>
          </DialogHeader>
          <Form {...zoneForm}>
            <form onSubmit={zoneForm.handleSubmit(handleZoneSubmit)} className="space-y-6">
              <FormField
                control={zoneForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={zoneForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone Code*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setShowZoneDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createZoneMutation.isPending || updateZoneMutation.isPending}
                >
                  {createZoneMutation.isPending || updateZoneMutation.isPending ? (
                    "Saving..."
                  ) : (
                    "Save Zone"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bin Dialog */}
      <Dialog open={showBinDialog} onOpenChange={setShowBinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBin ? "Edit Bin" : "Add New Bin"}</DialogTitle>
          </DialogHeader>
          <Form {...binForm}>
            <form onSubmit={binForm.handleSubmit(handleBinSubmit)} className="space-y-6">
              <FormField
                control={binForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={binForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Code*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={binForm.control}
                name="binTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bin type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Standard</SelectItem>
                        {binTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={binForm.control}
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
              
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setShowBinDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBinMutation.isPending || updateBinMutation.isPending}
                >
                  {createBinMutation.isPending || updateBinMutation.isPending ? (
                    "Saving..."
                  ) : (
                    "Save Bin"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationsList;
