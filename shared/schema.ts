import { pgTable, text, serial, integer, boolean, timestamp, json, real, foreignKey, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations and users
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  parentId: integer("parent_id").references(() => organizations.id),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>().notNull().default([]),
  scope: text("scope").notNull().default("organization"), // global, organization, customer
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  organizationId: integer("organization_id").references(() => organizations.id),
  roleId: integer("role_id").references(() => roles.id),
});

// Warehouse structure
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  address: text("address"),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
});

export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
});

export const binTypes = pgTable("bin_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  maxWeight: real("max_weight"), // in kg
  maxVolume: real("max_volume"), // in cubic meters
  dimensions: json("dimensions").$type<{length: number, width: number, height: number}>(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
});

export const bins = pgTable("bins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  zoneId: integer("zone_id").references(() => zones.id).notNull(),
  binTypeId: integer("bin_type_id").references(() => binTypes.id),
  isActive: boolean("is_active").notNull().default(true),
});

// Inventory management
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  contactInfo: json("contact_info").$type<{email?: string, phone?: string, address?: string}>(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  barcode: text("barcode"),
  categoryId: integer("category_id").references(() => categories.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  dimensions: json("dimensions").$type<{length: number, width: number, height: number}>(),
  weight: real("weight"), // in kg
  reorderPoint: integer("reorder_point"),
  reorderQuantity: integer("reorder_quantity"),
  notes: text("notes"),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  binId: integer("bin_id").references(() => bins.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  allocatedQuantity: integer("allocated_quantity").notNull().default(0),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  binId: integer("bin_id").references(() => bins.id).notNull(),
  quantity: integer("quantity").notNull(), // positive for additions, negative for removals
  type: text("type").notNull(), // receiving, picking, adjustment, return, etc.
  reference: text("reference"), // order number, receiving ID, etc.
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Order management
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  shippingAddress: json("shipping_address").$type<{
    address1: string,
    address2?: string,
    city: string,
    state: string,
    zipCode: string,
    country: string,
  }>().notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, allocated, packed, shipped, delivered, canceled
  notes: text("notes"),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  quantity: integer("quantity").notNull(),
  allocatedQuantity: integer("allocated_quantity").notNull().default(0),
  pickedQuantity: integer("picked_quantity").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending, allocated, picked, packed
});

// Shipping
export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  carrier: text("carrier").notNull(),
  trackingNumber: text("tracking_number"),
  shippingCost: real("shipping_cost"),
  weight: real("weight"), // in kg
  dimensions: json("dimensions").$type<{length: number, width: number, height: number}>(),
  labelUrl: text("label_url"),
  status: text("status").notNull().default("pending"), // pending, label_created, shipped, delivered
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Logs and activity tracking
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(), // user, item, order, etc.
  entityId: text("entity_id").notNull(),
  details: json("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  organizationId: integer("organization_id").references(() => organizations.id),
});

// Create insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true });
export const insertZoneSchema = createInsertSchema(zones).omit({ id: true });
export const insertBinTypeSchema = createInsertSchema(binTypes).omit({ id: true });
export const insertBinSchema = createInsertSchema(bins).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, timestamp: true });

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;

export type BinType = typeof binTypes.$inferSelect;
export type InsertBinType = z.infer<typeof insertBinTypeSchema>;

export type Bin = typeof bins.$inferSelect;
export type InsertBin = z.infer<typeof insertBinSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
