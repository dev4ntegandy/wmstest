import { 
  users, type User, type InsertUser,
  organizations, type Organization, type InsertOrganization,
  roles, type Role, type InsertRole,
  warehouses, type Warehouse, type InsertWarehouse,
  zones, type Zone, type InsertZone,
  binTypes, type BinType, type InsertBinType,
  bins, type Bin, type InsertBin,
  categories, type Category, type InsertCategory,
  suppliers, type Supplier, type InsertSupplier,
  items, type Item, type InsertItem,
  inventory, type Inventory, type InsertInventory,
  inventoryTransactions, type InventoryTransaction, type InsertInventoryTransaction,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  shipments, type Shipment, type InsertShipment,
  activityLogs, type ActivityLog, type InsertActivityLog
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Users and auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(organizationId?: number): Promise<User[]>;
  
  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  listOrganizations(parentId?: number): Promise<Organization[]>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined>;
  
  // Roles
  getRole(id: number): Promise<Role | undefined>;
  listRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role | undefined>;
  
  // Warehouses
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  listWarehouses(organizationId: number): Promise<Warehouse[]>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, warehouse: Partial<InsertWarehouse>): Promise<Warehouse | undefined>;
  
  // Zones
  getZone(id: number): Promise<Zone | undefined>;
  listZones(warehouseId: number): Promise<Zone[]>;
  createZone(zone: InsertZone): Promise<Zone>;
  updateZone(id: number, zone: Partial<InsertZone>): Promise<Zone | undefined>;
  
  // Bin Types
  getBinType(id: number): Promise<BinType | undefined>;
  listBinTypes(organizationId: number): Promise<BinType[]>;
  createBinType(binType: InsertBinType): Promise<BinType>;
  updateBinType(id: number, binType: Partial<InsertBinType>): Promise<BinType | undefined>;
  
  // Bins
  getBin(id: number): Promise<Bin | undefined>;
  listBins(zoneId: number): Promise<Bin[]>;
  createBin(bin: InsertBin): Promise<Bin>;
  updateBin(id: number, bin: Partial<InsertBin>): Promise<Bin | undefined>;
  listBinsByWarehouse(warehouseId: number): Promise<Bin[]>;
  
  // Categories
  getCategory(id: number): Promise<Category | undefined>;
  listCategories(organizationId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  
  // Suppliers
  getSupplier(id: number): Promise<Supplier | undefined>;
  listSuppliers(organizationId: number): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  
  // Items
  getItem(id: number): Promise<Item | undefined>;
  getItemBySku(sku: string, organizationId: number): Promise<Item | undefined>;
  listItems(organizationId: number, categoryId?: number): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item | undefined>;
  
  // Inventory
  getInventory(itemId: number, binId: number): Promise<Inventory | undefined>;
  listInventory(itemId?: number, binId?: number): Promise<Inventory[]>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, inventory: Partial<InsertInventory>): Promise<Inventory | undefined>;
  
  // Inventory Transactions
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;
  listInventoryTransactions(itemId?: number, binId?: number): Promise<InventoryTransaction[]>;
  
  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string, organizationId: number): Promise<Order | undefined>;
  listOrders(organizationId: number, status?: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  
  // Order Items
  listOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, orderItem: Partial<InsertOrderItem>): Promise<OrderItem | undefined>;
  
  // Shipments
  getShipment(id: number): Promise<Shipment | undefined>;
  listShipments(orderId?: number): Promise<Shipment[]>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: number, shipment: Partial<InsertShipment>): Promise<Shipment | undefined>;
  
  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  listActivityLogs(organizationId?: number, entityType?: string, entityId?: string): Promise<ActivityLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private organizations: Map<number, Organization>;
  private roles: Map<number, Role>;
  private warehouses: Map<number, Warehouse>;
  private zones: Map<number, Zone>;
  private binTypes: Map<number, BinType>;
  private bins: Map<number, Bin>;
  private categories: Map<number, Category>;
  private suppliers: Map<number, Supplier>;
  private items: Map<number, Item>;
  private inventory: Map<number, Inventory>;
  private inventoryTransactions: Map<number, InventoryTransaction>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private shipments: Map<number, Shipment>;
  private activityLogs: Map<number, ActivityLog>;
  
  private currentIds: {
    user: number;
    organization: number;
    role: number;
    warehouse: number;
    zone: number;
    binType: number;
    bin: number;
    category: number;
    supplier: number;
    item: number;
    inventory: number;
    inventoryTransaction: number;
    order: number;
    orderItem: number;
    shipment: number;
    activityLog: number;
  };

  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.roles = new Map();
    this.warehouses = new Map();
    this.zones = new Map();
    this.binTypes = new Map();
    this.bins = new Map();
    this.categories = new Map();
    this.suppliers = new Map();
    this.items = new Map();
    this.inventory = new Map();
    this.inventoryTransactions = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.shipments = new Map();
    this.activityLogs = new Map();
    
    this.currentIds = {
      user: 1,
      organization: 1,
      role: 1,
      warehouse: 1,
      zone: 1,
      binType: 1,
      bin: 1,
      category: 1,
      supplier: 1,
      item: 1,
      inventory: 1,
      inventoryTransaction: 1,
      order: 1,
      orderItem: 1,
      shipment: 1,
      activityLog: 1,
    };
    
    // Initialize with default data
    this.initializeDefaults();
  }

  private initializeDefaults() {
    // Create default roles
    const globalAdminRole: InsertRole = {
      name: "Global Admin",
      description: "Full access to all organizations and features",
      permissions: ["all"],
      scope: "global"
    };
    const orgAdminRole: InsertRole = {
      name: "Organization Admin",
      description: "Admin for a specific organization",
      permissions: ["org:all"],
      scope: "organization"
    };
    const warehouseWorkerRole: InsertRole = {
      name: "Warehouse Worker",
      description: "Basic access to warehouse operations",
      permissions: ["warehouse:read", "inventory:read", "inventory:write", "orders:read", "orders:process"],
      scope: "organization"
    };
    const customerUserRole: InsertRole = {
      name: "Customer User",
      description: "Limited access for customers",
      permissions: ["orders:read", "orders:create"],
      scope: "customer"
    };
    
    this.createRole(globalAdminRole);
    this.createRole(orgAdminRole);
    this.createRole(warehouseWorkerRole);
    this.createRole(customerUserRole);
    
    // Create default organization
    const borderworxOrg: InsertOrganization = {
      name: "Borderworx",
      description: "Main organization",
      isActive: true
    };
    this.createOrganization(borderworxOrg);
    
    // Create default admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "$2b$10$iZL.3xKk.CFR5EfG6lW1yOX7r0pJbiQQ8D8SOLHn/lD0Ij6ywdVbS", // "password" hashed
      email: "admin@borderworx.com",
      fullName: "Admin User",
      isActive: true,
      organizationId: 1,
      roleId: 1
    };
    this.createUser(adminUser);
  }

  // Users and auth
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.user++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async listUsers(organizationId?: number): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (organizationId) {
      return users.filter(user => user.organizationId === organizationId);
    }
    return users;
  }

  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async listOrganizations(parentId?: number): Promise<Organization[]> {
    const orgs = Array.from(this.organizations.values());
    if (parentId !== undefined) {
      return orgs.filter(org => org.parentId === parentId);
    }
    return orgs;
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const id = this.currentIds.organization++;
    const newOrg: Organization = { ...organization, id };
    this.organizations.set(id, newOrg);
    return newOrg;
  }

  async updateOrganization(id: number, orgData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const org = await this.getOrganization(id);
    if (!org) return undefined;
    
    const updatedOrg = { ...org, ...orgData };
    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }

  // Roles
  async getRole(id: number): Promise<Role | undefined> {
    return this.roles.get(id);
  }

  async listRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async createRole(role: InsertRole): Promise<Role> {
    const id = this.currentIds.role++;
    const newRole: Role = { ...role, id };
    this.roles.set(id, newRole);
    return newRole;
  }

  async updateRole(id: number, roleData: Partial<InsertRole>): Promise<Role | undefined> {
    const role = await this.getRole(id);
    if (!role) return undefined;
    
    const updatedRole = { ...role, ...roleData };
    this.roles.set(id, updatedRole);
    return updatedRole;
  }

  // Warehouses
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    return this.warehouses.get(id);
  }

  async listWarehouses(organizationId: number): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values())
      .filter(warehouse => warehouse.organizationId === organizationId);
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const id = this.currentIds.warehouse++;
    const newWarehouse: Warehouse = { ...warehouse, id };
    this.warehouses.set(id, newWarehouse);
    return newWarehouse;
  }

  async updateWarehouse(id: number, warehouseData: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const warehouse = await this.getWarehouse(id);
    if (!warehouse) return undefined;
    
    const updatedWarehouse = { ...warehouse, ...warehouseData };
    this.warehouses.set(id, updatedWarehouse);
    return updatedWarehouse;
  }

  // Zones
  async getZone(id: number): Promise<Zone | undefined> {
    return this.zones.get(id);
  }

  async listZones(warehouseId: number): Promise<Zone[]> {
    return Array.from(this.zones.values())
      .filter(zone => zone.warehouseId === warehouseId);
  }

  async createZone(zone: InsertZone): Promise<Zone> {
    const id = this.currentIds.zone++;
    const newZone: Zone = { ...zone, id };
    this.zones.set(id, newZone);
    return newZone;
  }

  async updateZone(id: number, zoneData: Partial<InsertZone>): Promise<Zone | undefined> {
    const zone = await this.getZone(id);
    if (!zone) return undefined;
    
    const updatedZone = { ...zone, ...zoneData };
    this.zones.set(id, updatedZone);
    return updatedZone;
  }

  // Bin Types
  async getBinType(id: number): Promise<BinType | undefined> {
    return this.binTypes.get(id);
  }

  async listBinTypes(organizationId: number): Promise<BinType[]> {
    return Array.from(this.binTypes.values())
      .filter(binType => binType.organizationId === organizationId);
  }

  async createBinType(binType: InsertBinType): Promise<BinType> {
    const id = this.currentIds.binType++;
    const newBinType: BinType = { ...binType, id };
    this.binTypes.set(id, newBinType);
    return newBinType;
  }

  async updateBinType(id: number, binTypeData: Partial<InsertBinType>): Promise<BinType | undefined> {
    const binType = await this.getBinType(id);
    if (!binType) return undefined;
    
    const updatedBinType = { ...binType, ...binTypeData };
    this.binTypes.set(id, updatedBinType);
    return updatedBinType;
  }

  // Bins
  async getBin(id: number): Promise<Bin | undefined> {
    return this.bins.get(id);
  }

  async listBins(zoneId: number): Promise<Bin[]> {
    return Array.from(this.bins.values())
      .filter(bin => bin.zoneId === zoneId);
  }

  async listBinsByWarehouse(warehouseId: number): Promise<Bin[]> {
    const zones = await this.listZones(warehouseId);
    const zoneIds = zones.map(zone => zone.id);
    return Array.from(this.bins.values())
      .filter(bin => zoneIds.includes(bin.zoneId));
  }

  async createBin(bin: InsertBin): Promise<Bin> {
    const id = this.currentIds.bin++;
    const newBin: Bin = { ...bin, id };
    this.bins.set(id, newBin);
    return newBin;
  }

  async updateBin(id: number, binData: Partial<InsertBin>): Promise<Bin | undefined> {
    const bin = await this.getBin(id);
    if (!bin) return undefined;
    
    const updatedBin = { ...bin, ...binData };
    this.bins.set(id, updatedBin);
    return updatedBin;
  }

  // Categories
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async listCategories(organizationId: number): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter(category => category.organizationId === organizationId);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentIds.category++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = await this.getCategory(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  // Suppliers
  async getSupplier(id: number): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async listSuppliers(organizationId: number): Promise<Supplier[]> {
    return Array.from(this.suppliers.values())
      .filter(supplier => supplier.organizationId === organizationId);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = this.currentIds.supplier++;
    const newSupplier: Supplier = { ...supplier, id };
    this.suppliers.set(id, newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const supplier = await this.getSupplier(id);
    if (!supplier) return undefined;
    
    const updatedSupplier = { ...supplier, ...supplierData };
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  // Items
  async getItem(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async getItemBySku(sku: string, organizationId: number): Promise<Item | undefined> {
    return Array.from(this.items.values()).find(
      item => item.sku === sku && item.organizationId === organizationId
    );
  }

  async listItems(organizationId: number, categoryId?: number): Promise<Item[]> {
    let items = Array.from(this.items.values())
      .filter(item => item.organizationId === organizationId);
    
    if (categoryId) {
      items = items.filter(item => item.categoryId === categoryId);
    }
    
    return items;
  }

  async createItem(item: InsertItem): Promise<Item> {
    const id = this.currentIds.item++;
    const newItem: Item = { ...item, id };
    this.items.set(id, newItem);
    return newItem;
  }

  async updateItem(id: number, itemData: Partial<InsertItem>): Promise<Item | undefined> {
    const item = await this.getItem(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  // Inventory
  async getInventory(itemId: number, binId: number): Promise<Inventory | undefined> {
    return Array.from(this.inventory.values()).find(
      inv => inv.itemId === itemId && inv.binId === binId
    );
  }

  async listInventory(itemId?: number, binId?: number): Promise<Inventory[]> {
    let inventoryList = Array.from(this.inventory.values());
    
    if (itemId) {
      inventoryList = inventoryList.filter(inv => inv.itemId === itemId);
    }
    
    if (binId) {
      inventoryList = inventoryList.filter(inv => inv.binId === binId);
    }
    
    return inventoryList;
  }

  async createInventory(inventory: InsertInventory): Promise<Inventory> {
    const id = this.currentIds.inventory++;
    const newInventory: Inventory = { ...inventory, id };
    this.inventory.set(id, newInventory);
    return newInventory;
  }

  async updateInventory(id: number, inventoryData: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const inventoryRecord = this.inventory.get(id);
    if (!inventoryRecord) return undefined;
    
    const updatedInventory = { ...inventoryRecord, ...inventoryData };
    this.inventory.set(id, updatedInventory);
    return updatedInventory;
  }

  // Inventory Transactions
  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const id = this.currentIds.inventoryTransaction++;
    const newTransaction: InventoryTransaction = { ...transaction, id };
    this.inventoryTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async listInventoryTransactions(itemId?: number, binId?: number): Promise<InventoryTransaction[]> {
    let transactions = Array.from(this.inventoryTransactions.values());
    
    if (itemId) {
      transactions = transactions.filter(tx => tx.itemId === itemId);
    }
    
    if (binId) {
      transactions = transactions.filter(tx => tx.binId === binId);
    }
    
    return transactions;
  }

  // Orders
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByNumber(orderNumber: string, organizationId: number): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      order => order.orderNumber === orderNumber && order.organizationId === organizationId
    );
  }

  async listOrders(organizationId: number, status?: string): Promise<Order[]> {
    let orders = Array.from(this.orders.values())
      .filter(order => order.organizationId === organizationId);
    
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    return orders;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentIds.order++;
    const now = new Date();
    const newOrder: Order = { 
      ...order, 
      id, 
      createdAt: now,
      updatedAt: now 
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    
    const updatedOrder = { 
      ...order, 
      ...orderData,
      updatedAt: new Date()
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Order Items
  async listOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values())
      .filter(item => item.orderId === orderId);
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.currentIds.orderItem++;
    const newOrderItem: OrderItem = { ...orderItem, id };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }

  async updateOrderItem(id: number, orderItemData: Partial<InsertOrderItem>): Promise<OrderItem | undefined> {
    const orderItem = this.orderItems.get(id);
    if (!orderItem) return undefined;
    
    const updatedOrderItem = { ...orderItem, ...orderItemData };
    this.orderItems.set(id, updatedOrderItem);
    return updatedOrderItem;
  }

  // Shipments
  async getShipment(id: number): Promise<Shipment | undefined> {
    return this.shipments.get(id);
  }

  async listShipments(orderId?: number): Promise<Shipment[]> {
    const shipmentsList = Array.from(this.shipments.values());
    
    if (orderId) {
      return shipmentsList.filter(shipment => shipment.orderId === orderId);
    }
    
    return shipmentsList;
  }

  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const id = this.currentIds.shipment++;
    const newShipment: Shipment = { 
      ...shipment, 
      id,
      createdAt: new Date()
    };
    this.shipments.set(id, newShipment);
    return newShipment;
  }

  async updateShipment(id: number, shipmentData: Partial<InsertShipment>): Promise<Shipment | undefined> {
    const shipment = await this.getShipment(id);
    if (!shipment) return undefined;
    
    const updatedShipment = { ...shipment, ...shipmentData };
    this.shipments.set(id, updatedShipment);
    return updatedShipment;
  }

  // Activity Logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentIds.activityLog++;
    const newLog: ActivityLog = { 
      ...log, 
      id,
      timestamp: new Date() 
    };
    this.activityLogs.set(id, newLog);
    return newLog;
  }

  async listActivityLogs(organizationId?: number, entityType?: string, entityId?: string): Promise<ActivityLog[]> {
    let logs = Array.from(this.activityLogs.values());
    
    if (organizationId) {
      logs = logs.filter(log => log.organizationId === organizationId);
    }
    
    if (entityType) {
      logs = logs.filter(log => log.entityType === entityType);
    }
    
    if (entityId) {
      logs = logs.filter(log => log.entityId === entityId);
    }
    
    return logs;
  }
}

export const storage = new MemStorage();
