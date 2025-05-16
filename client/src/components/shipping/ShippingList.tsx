import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LabelGenerator from "./LabelGenerator";
import StatusBadge from "@/components/common/StatusBadge";
import Pagination from "@/components/common/Pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Printer, Package, Search } from "lucide-react";
import { Order, Shipment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const ShippingList = () => {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const itemsPerPage = 10;

  // Fetch orders for shipping
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/orders?organizationId=${currentOrganization?.id || 0}&status=packed,allocated`],
    enabled: !!currentOrganization?.id,
  });

  // Fetch existing shipments
  const { data: shipments, isLoading: shipmentsLoading, refetch: refetchShipments } = useQuery({
    queryKey: [`/api/shipments`],
    enabled: !!currentOrganization?.id,
  });

  // Filter and paginate shipments
  const filteredShipments = shipments?.filter(shipment => {
    const matchesSearch = !searchTerm || 
      shipment.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.order?.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.order?.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = !statusFilter || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const paginatedShipments = filteredShipments.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);

  const handleCreateLabel = (order: Order) => {
    setSelectedOrder(order);
    setSelectedShipment(null);
    setShowLabelDialog(true);
  };

  const handleViewShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setSelectedOrder(null);
    setShowLabelDialog(true);
  };

  const handleLabelGenerated = () => {
    refetchShipments();
    setShowLabelDialog(false);
    setSelectedOrder(null);
    setSelectedShipment(null);
    toast({
      title: "Success",
      description: "Shipping label generated successfully",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isLoading = ordersLoading || shipmentsLoading;

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
        <h1 className="text-2xl font-semibold text-slate-800">Shipping Management</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search Shipments</label>
              <div className="relative">
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by tracking #, carrier..."
                  className="w-full pr-10"
                />
                <div className="absolute right-3 top-2.5 text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="label_created">Label Created</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders ready for shipping */}
      <Card className="mb-6">
        <CardHeader className="border-b border-slate-200 px-4 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Orders Ready for Shipping
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="text-left text-sm border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-primary font-medium">{order.orderNumber}</td>
                      <td className="px-4 py-3">{order.customerName}</td>
                      <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center"
                          onClick={() => handleCreateLabel(order)}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Create Label
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No orders ready for shipping.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      <Card>
        <CardHeader className="border-b border-slate-200 px-4 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Shipments ({filteredShipments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="text-left text-sm border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Carrier</th>
                  <th className="px-4 py-3 font-medium">Tracking #</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedShipments.length > 0 ? (
                  paginatedShipments.map((shipment) => (
                    <tr key={shipment.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-primary font-medium">
                        {shipment.order?.orderNumber || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.order?.customerName || "N/A"}
                      </td>
                      <td className="px-4 py-3">{shipment.carrier}</td>
                      <td className="px-4 py-3">{shipment.trackingNumber || "N/A"}</td>
                      <td className="px-4 py-3">{formatDate(shipment.createdAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={shipment.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button 
                            className="text-slate-500 hover:text-primary" 
                            title="View Details"
                            onClick={() => handleViewShipment(shipment)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-slate-500 hover:text-primary" 
                            title="Print Label"
                            disabled={!shipment.labelUrl}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      No shipments found. Create a shipping label for an order to get started.
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
            totalItems={filteredShipments.length}
            itemsPerPage={itemsPerPage}
          />
        </CardContent>
      </Card>

      <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedShipment ? "Shipment Details" : "Create Shipping Label"}
            </DialogTitle>
          </DialogHeader>
          <LabelGenerator
            order={selectedOrder}
            shipment={selectedShipment}
            onSuccess={handleLabelGenerated}
            onCancel={() => setShowLabelDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShippingList;
