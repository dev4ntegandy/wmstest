import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import MemoryStore from "memorystore";
import { z } from "zod";
import {
  insertUserSchema,
  insertOrganizationSchema,
  insertRoleSchema,
  insertWarehouseSchema,
  insertZoneSchema,
  insertBinTypeSchema,
  insertBinSchema,
  insertCategorySchema,
  insertSupplierSchema,
  insertItemSchema,
  insertInventorySchema,
  insertInventoryTransactionSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertShipmentSchema,
  insertActivityLogSchema
} from "@shared/schema";
import { InsertUser } from "@shared/schema";

// Create memory store for sessions
const MemorySessionStore = MemoryStore(session);

// Middleware for checking authentication
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware for checking permissions based on role
const hasPermission = (permission: string) => (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as any;
  const role = user.role;
  
  if (!role || !role.permissions) {
    return res.status(403).json({ message: "Forbidden: insufficient permissions" });
  }
  
  // Global admins have all permissions
  if (role.permissions.includes("all") || role.permissions.includes(permission)) {
    return next();
  }
  
  return res.status(403).json({ message: "Forbidden: insufficient permissions" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Use session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || "borderworx-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new MemorySessionStore({
      checkPeriod: 86400000 // 24 hours
    }),
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === "production",
      httpOnly: true
    }
  }));

  // Initialize passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport to use local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: "Incorrect password" });
      }

      // Get the user's role
      const role = await storage.getRole(user.roleId!);
      return done(null, { ...user, role });
    } catch (error) {
      return done(error);
    }
  }));

  // Serialize and deserialize user for session management
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as any).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // Get the user's role
      const role = await storage.getRole(user.roleId!);
      done(null, { ...user, role });
    } catch (error) {
      done(error);
    }
  });

  // Auth routes
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/current-user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // User routes
  app.get("/api/users", isAuthenticated, hasPermission("users:read"), async (req, res) => {
    const organizationId = req.query.organizationId 
      ? parseInt(req.query.organizationId as string) 
      : undefined;
    
    const users = await storage.listUsers(organizationId);
    
    // Remove password from response
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    res.json(sanitizedUsers);
  });

  app.get("/api/users/:id", isAuthenticated, hasPermission("users:read"), async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password from response
    const { password, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  });

  app.post("/api/users", isAuthenticated, hasPermission("users:create"), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Remove password from response
      const { password, ...sanitizedUser } = user;
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "user",
        entityId: user.id.toString(),
        details: { username: user.username },
        organizationId: userData.organizationId
      });
      
      res.status(201).json(sanitizedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, hasPermission("users:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If password is being updated, hash it
      let updatedData: Partial<InsertUser> = { ...req.body };
      if (updatedData.password) {
        updatedData.password = await bcrypt.hash(updatedData.password, 10);
      }
      
      const updatedUser = await storage.updateUser(id, updatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...sanitizedUser } = updatedUser;
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "user",
        entityId: id.toString(),
        details: { username: user.username },
        organizationId: user.organizationId
      });
      
      res.json(sanitizedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Organization routes
  app.get("/api/organizations", isAuthenticated, async (req, res) => {
    const parentId = req.query.parentId 
      ? parseInt(req.query.parentId as string) 
      : undefined;
    
    const organizations = await storage.listOrganizations(parentId);
    res.json(organizations);
  });

  app.get("/api/organizations/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const organization = await storage.getOrganization(id);
    
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    
    res.json(organization);
  });

  app.post("/api/organizations", isAuthenticated, hasPermission("organizations:create"), async (req, res) => {
    try {
      const organizationData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(organizationData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "organization",
        entityId: organization.id.toString(),
        details: { name: organization.name }
      });
      
      res.status(201).json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid organization data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.patch("/api/organizations/:id", isAuthenticated, hasPermission("organizations:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedOrganization = await storage.updateOrganization(id, req.body);
      
      if (!updatedOrganization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "organization",
        entityId: id.toString(),
        details: { name: updatedOrganization.name }
      });
      
      res.json(updatedOrganization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid organization data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Role routes
  app.get("/api/roles", isAuthenticated, hasPermission("roles:read"), async (req, res) => {
    const roles = await storage.listRoles();
    res.json(roles);
  });

  app.get("/api/roles/:id", isAuthenticated, hasPermission("roles:read"), async (req, res) => {
    const id = parseInt(req.params.id);
    const role = await storage.getRole(id);
    
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    
    res.json(role);
  });

  app.post("/api/roles", isAuthenticated, hasPermission("roles:create"), async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "role",
        entityId: role.id.toString(),
        details: { name: role.name }
      });
      
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid role data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.patch("/api/roles/:id", isAuthenticated, hasPermission("roles:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedRole = await storage.updateRole(id, req.body);
      
      if (!updatedRole) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "role",
        entityId: id.toString(),
        details: { name: updatedRole.name }
      });
      
      res.json(updatedRole);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid role data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Warehouse routes
  app.get("/api/warehouses", isAuthenticated, async (req, res) => {
    const organizationId = parseInt(req.query.organizationId as string);
    
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    
    const warehouses = await storage.listWarehouses(organizationId);
    res.json(warehouses);
  });

  app.get("/api/warehouses/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const warehouse = await storage.getWarehouse(id);
    
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }
    
    res.json(warehouse);
  });

  app.post("/api/warehouses", isAuthenticated, hasPermission("warehouses:create"), async (req, res) => {
    try {
      const warehouseData = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(warehouseData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "warehouse",
        entityId: warehouse.id.toString(),
        details: { name: warehouse.name },
        organizationId: warehouse.organizationId
      });
      
      res.status(201).json(warehouse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid warehouse data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create warehouse" });
    }
  });

  app.patch("/api/warehouses/:id", isAuthenticated, hasPermission("warehouses:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedWarehouse = await storage.updateWarehouse(id, req.body);
      
      if (!updatedWarehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "warehouse",
        entityId: id.toString(),
        details: { name: updatedWarehouse.name },
        organizationId: updatedWarehouse.organizationId
      });
      
      res.json(updatedWarehouse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid warehouse data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update warehouse" });
    }
  });

  // Zone routes
  app.get("/api/zones", isAuthenticated, async (req, res) => {
    const warehouseId = parseInt(req.query.warehouseId as string);
    
    if (isNaN(warehouseId)) {
      return res.status(400).json({ message: "Warehouse ID is required" });
    }
    
    const zones = await storage.listZones(warehouseId);
    res.json(zones);
  });

  app.get("/api/zones/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const zone = await storage.getZone(id);
    
    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }
    
    res.json(zone);
  });

  app.post("/api/zones", isAuthenticated, hasPermission("warehouses:create"), async (req, res) => {
    try {
      const zoneData = insertZoneSchema.parse(req.body);
      const zone = await storage.createZone(zoneData);
      
      // Get warehouse for logging organizational context
      const warehouse = await storage.getWarehouse(zone.warehouseId);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "zone",
        entityId: zone.id.toString(),
        details: { name: zone.name, warehouseId: zone.warehouseId },
        organizationId: warehouse?.organizationId
      });
      
      res.status(201).json(zone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid zone data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create zone" });
    }
  });

  app.patch("/api/zones/:id", isAuthenticated, hasPermission("warehouses:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedZone = await storage.updateZone(id, req.body);
      
      if (!updatedZone) {
        return res.status(404).json({ message: "Zone not found" });
      }
      
      // Get warehouse for logging organizational context
      const warehouse = await storage.getWarehouse(updatedZone.warehouseId);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "zone",
        entityId: id.toString(),
        details: { name: updatedZone.name, warehouseId: updatedZone.warehouseId },
        organizationId: warehouse?.organizationId
      });
      
      res.json(updatedZone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid zone data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update zone" });
    }
  });

  // Bin Type routes
  app.get("/api/bin-types", isAuthenticated, async (req, res) => {
    const organizationId = parseInt(req.query.organizationId as string);
    
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    
    const binTypes = await storage.listBinTypes(organizationId);
    res.json(binTypes);
  });

  app.get("/api/bin-types/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const binType = await storage.getBinType(id);
    
    if (!binType) {
      return res.status(404).json({ message: "Bin type not found" });
    }
    
    res.json(binType);
  });

  app.post("/api/bin-types", isAuthenticated, hasPermission("warehouses:create"), async (req, res) => {
    try {
      const binTypeData = insertBinTypeSchema.parse(req.body);
      const binType = await storage.createBinType(binTypeData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "binType",
        entityId: binType.id.toString(),
        details: { name: binType.name },
        organizationId: binType.organizationId
      });
      
      res.status(201).json(binType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bin type data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create bin type" });
    }
  });

  app.patch("/api/bin-types/:id", isAuthenticated, hasPermission("warehouses:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedBinType = await storage.updateBinType(id, req.body);
      
      if (!updatedBinType) {
        return res.status(404).json({ message: "Bin type not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "binType",
        entityId: id.toString(),
        details: { name: updatedBinType.name },
        organizationId: updatedBinType.organizationId
      });
      
      res.json(updatedBinType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bin type data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update bin type" });
    }
  });

  // Bin routes
  app.get("/api/bins", isAuthenticated, async (req, res) => {
    const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string) : undefined;
    const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
    
    if (!zoneId && !warehouseId) {
      return res.status(400).json({ message: "Zone ID or Warehouse ID is required" });
    }
    
    let bins;
    if (warehouseId) {
      bins = await storage.listBinsByWarehouse(warehouseId);
    } else if (zoneId) {
      bins = await storage.listBins(zoneId);
    } else {
      bins = [];
    }
    
    res.json(bins);
  });

  app.get("/api/bins/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const bin = await storage.getBin(id);
    
    if (!bin) {
      return res.status(404).json({ message: "Bin not found" });
    }
    
    res.json(bin);
  });

  app.post("/api/bins", isAuthenticated, hasPermission("warehouses:create"), async (req, res) => {
    try {
      const binData = insertBinSchema.parse(req.body);
      const bin = await storage.createBin(binData);
      
      // Get zone and warehouse for logging context
      const zone = await storage.getZone(bin.zoneId);
      const warehouse = zone ? await storage.getWarehouse(zone.warehouseId) : undefined;
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "bin",
        entityId: bin.id.toString(),
        details: { name: bin.name, code: bin.code, zoneId: bin.zoneId },
        organizationId: warehouse?.organizationId
      });
      
      res.status(201).json(bin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bin data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create bin" });
    }
  });

  app.patch("/api/bins/:id", isAuthenticated, hasPermission("warehouses:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedBin = await storage.updateBin(id, req.body);
      
      if (!updatedBin) {
        return res.status(404).json({ message: "Bin not found" });
      }
      
      // Get zone and warehouse for logging context
      const zone = await storage.getZone(updatedBin.zoneId);
      const warehouse = zone ? await storage.getWarehouse(zone.warehouseId) : undefined;
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "bin",
        entityId: id.toString(),
        details: { name: updatedBin.name, code: updatedBin.code, zoneId: updatedBin.zoneId },
        organizationId: warehouse?.organizationId
      });
      
      res.json(updatedBin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bin data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update bin" });
    }
  });

  // Category routes
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    const organizationId = parseInt(req.query.organizationId as string);
    
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    
    const categories = await storage.listCategories(organizationId);
    res.json(categories);
  });

  app.get("/api/categories/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const category = await storage.getCategory(id);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.json(category);
  });

  app.post("/api/categories", isAuthenticated, hasPermission("inventory:create"), async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "category",
        entityId: category.id.toString(),
        details: { name: category.name },
        organizationId: category.organizationId
      });
      
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", isAuthenticated, hasPermission("inventory:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedCategory = await storage.updateCategory(id, req.body);
      
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "category",
        entityId: id.toString(),
        details: { name: updatedCategory.name },
        organizationId: updatedCategory.organizationId
      });
      
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Supplier routes
  app.get("/api/suppliers", isAuthenticated, async (req, res) => {
    const organizationId = parseInt(req.query.organizationId as string);
    
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    
    const suppliers = await storage.listSuppliers(organizationId);
    res.json(suppliers);
  });

  app.get("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const supplier = await storage.getSupplier(id);
    
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    
    res.json(supplier);
  });

  app.post("/api/suppliers", isAuthenticated, hasPermission("inventory:create"), async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "supplier",
        entityId: supplier.id.toString(),
        details: { name: supplier.name, code: supplier.code },
        organizationId: supplier.organizationId
      });
      
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.patch("/api/suppliers/:id", isAuthenticated, hasPermission("inventory:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedSupplier = await storage.updateSupplier(id, req.body);
      
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "supplier",
        entityId: id.toString(),
        details: { name: updatedSupplier.name, code: updatedSupplier.code },
        organizationId: updatedSupplier.organizationId
      });
      
      res.json(updatedSupplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  // Item routes
  app.get("/api/items", isAuthenticated, async (req, res) => {
    const organizationId = parseInt(req.query.organizationId as string);
    const categoryId = req.query.categoryId 
      ? parseInt(req.query.categoryId as string) 
      : undefined;
    
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    
    const items = await storage.listItems(organizationId, categoryId);
    res.json(items);
  });

  app.get("/api/items/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const item = await storage.getItem(id);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    res.json(item);
  });

  app.post("/api/items", isAuthenticated, hasPermission("inventory:create"), async (req, res) => {
    try {
      const itemData = insertItemSchema.parse(req.body);
      
      // Check if SKU already exists for this organization
      const existingItem = await storage.getItemBySku(itemData.sku, itemData.organizationId);
      if (existingItem) {
        return res.status(400).json({ message: "SKU already exists in this organization" });
      }
      
      const item = await storage.createItem(itemData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "item",
        entityId: item.id.toString(),
        details: { sku: item.sku, name: item.name },
        organizationId: item.organizationId
      });
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch("/api/items/:id", isAuthenticated, hasPermission("inventory:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentItem = await storage.getItem(id);
      
      if (!currentItem) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // If SKU is changing, check it's not a duplicate
      if (req.body.sku && req.body.sku !== currentItem.sku) {
        const existingItem = await storage.getItemBySku(req.body.sku, currentItem.organizationId);
        if (existingItem && existingItem.id !== id) {
          return res.status(400).json({ message: "SKU already exists in this organization" });
        }
      }
      
      const updatedItem = await storage.updateItem(id, req.body);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "item",
        entityId: id.toString(),
        details: { sku: updatedItem.sku, name: updatedItem.name },
        organizationId: updatedItem.organizationId
      });
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
    const binId = req.query.binId ? parseInt(req.query.binId as string) : undefined;
    
    const inventoryList = await storage.listInventory(itemId, binId);
    
    // Expand with item details for each inventory record
    const expandedInventory = await Promise.all(
      inventoryList.map(async (inv) => {
        const item = await storage.getItem(inv.itemId);
        const bin = await storage.getBin(inv.binId);
        return {
          ...inv,
          item,
          bin
        };
      })
    );
    
    res.json(expandedInventory);
  });

  app.post("/api/inventory", isAuthenticated, hasPermission("inventory:create"), async (req, res) => {
    try {
      const inventoryData = insertInventorySchema.parse(req.body);
      
      // Check if this item is already in this bin
      const existingInventory = await storage.getInventory(inventoryData.itemId, inventoryData.binId);
      
      let inventory;
      if (existingInventory) {
        // Update existing inventory entry
        inventory = await storage.updateInventory(existingInventory.id, {
          quantity: existingInventory.quantity + inventoryData.quantity,
          allocatedQuantity: existingInventory.allocatedQuantity + (inventoryData.allocatedQuantity || 0)
        });
      } else {
        // Create new inventory entry
        inventory = await storage.createInventory(inventoryData);
      }
      
      // Get item and bin for context
      const item = await storage.getItem(inventoryData.itemId);
      const bin = await storage.getBin(inventoryData.binId);
      
      // Create inventory transaction record
      await storage.createInventoryTransaction({
        itemId: inventoryData.itemId,
        binId: inventoryData.binId,
        quantity: inventoryData.quantity,
        type: "receiving",
        reference: req.body.reference,
        notes: req.body.notes,
        createdBy: (req.user as any).id,
        timestamp: new Date()
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "inventory",
        entityId: inventory.id.toString(),
        details: { 
          itemId: inventoryData.itemId, 
          binId: inventoryData.binId, 
          quantity: inventoryData.quantity,
          itemSku: item?.sku,
          binCode: bin?.code
        },
        organizationId: item?.organizationId
      });
      
      res.status(201).json(inventory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create inventory" });
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, hasPermission("inventory:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentInventory = await storage.updateInventory(id, req.body);
      
      if (!currentInventory) {
        return res.status(404).json({ message: "Inventory record not found" });
      }
      
      // Get item for context
      const item = await storage.getItem(currentInventory.itemId);
      
      // Create inventory transaction if quantity changed
      if (req.body.quantity !== undefined) {
        await storage.createInventoryTransaction({
          itemId: currentInventory.itemId,
          binId: currentInventory.binId,
          quantity: req.body.quantity - (currentInventory.quantity - req.body.quantity),
          type: "adjustment",
          reference: req.body.reference,
          notes: req.body.notes,
          createdBy: (req.user as any).id,
          timestamp: new Date()
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "inventory",
        entityId: id.toString(),
        details: { 
          itemId: currentInventory.itemId, 
          binId: currentInventory.binId,
          quantityChange: req.body.quantity !== undefined
            ? req.body.quantity - currentInventory.quantity
            : 0,
          itemSku: item?.sku
        },
        organizationId: item?.organizationId
      });
      
      res.json(currentInventory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  // Inventory Transactions routes
  app.get("/api/inventory-transactions", isAuthenticated, async (req, res) => {
    const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
    const binId = req.query.binId ? parseInt(req.query.binId as string) : undefined;
    
    const transactions = await storage.listInventoryTransactions(itemId, binId);
    
    // Expand with item and bin details
    const expandedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const item = await storage.getItem(tx.itemId);
        const bin = await storage.getBin(tx.binId);
        const user = await storage.getUser(tx.createdBy);
        
        return {
          ...tx,
          item,
          bin,
          createdByUser: user ? { id: user.id, username: user.username, fullName: user.fullName } : undefined
        };
      })
    );
    
    res.json(expandedTransactions);
  });

  // Order routes
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    const organizationId = parseInt(req.query.organizationId as string);
    const status = req.query.status as string | undefined;
    
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    
    const orders = await storage.listOrders(organizationId, status);
    res.json(orders);
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Get order items
    const orderItems = await storage.listOrderItems(id);
    
    // Expand with item details
    const expandedOrderItems = await Promise.all(
      orderItems.map(async (item) => {
        const productItem = await storage.getItem(item.itemId);
        return {
          ...item,
          item: productItem
        };
      })
    );
    
    res.json({
      ...order,
      items: expandedOrderItems
    });
  });

  app.post("/api/orders", isAuthenticated, hasPermission("orders:create"), async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const items = req.body.items || [];
      
      // Check if order number already exists
      const existingOrder = await storage.getOrderByNumber(orderData.orderNumber, orderData.organizationId);
      if (existingOrder) {
        return res.status(400).json({ message: "Order number already exists" });
      }
      
      // Create order with current user
      const order = await storage.createOrder({
        ...orderData,
        createdBy: (req.user as any).id
      });
      
      // Create order items
      const orderItems = [];
      for (const item of items) {
        const orderItem = await storage.createOrderItem({
          orderId: order.id,
          itemId: item.itemId,
          quantity: item.quantity,
          allocatedQuantity: 0,
          pickedQuantity: 0,
          status: "pending"
        });
        orderItems.push(orderItem);
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "order",
        entityId: order.id.toString(),
        details: { orderNumber: order.orderNumber, customerName: order.customerName },
        organizationId: order.organizationId
      });
      
      res.status(201).json({
        ...order,
        items: orderItems
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", isAuthenticated, hasPermission("orders:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentOrder = await storage.getOrder(id);
      
      if (!currentOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Update order
      const updatedOrder = await storage.updateOrder(id, req.body);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Status change tracking for reporting
      if (req.body.status && req.body.status !== currentOrder.status) {
        await storage.createActivityLog({
          userId: (req.user as any).id,
          action: "status_change",
          entityType: "order",
          entityId: id.toString(),
          details: { 
            orderNumber: updatedOrder.orderNumber, 
            previousStatus: currentOrder.status,
            newStatus: req.body.status
          },
          organizationId: updatedOrder.organizationId
        });
      }
      
      // Log general update activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "order",
        entityId: id.toString(),
        details: { orderNumber: updatedOrder.orderNumber },
        organizationId: updatedOrder.organizationId
      });
      
      res.json(updatedOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Order Items routes
  app.get("/api/order-items", isAuthenticated, async (req, res) => {
    const orderId = parseInt(req.query.orderId as string);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Order ID is required" });
    }
    
    const orderItems = await storage.listOrderItems(orderId);
    
    // Expand with item details
    const expandedOrderItems = await Promise.all(
      orderItems.map(async (item) => {
        const productItem = await storage.getItem(item.itemId);
        return {
          ...item,
          item: productItem
        };
      })
    );
    
    res.json(expandedOrderItems);
  });

  app.patch("/api/order-items/:id", isAuthenticated, hasPermission("orders:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orderItem = await storage.updateOrderItem(id, req.body);
      
      if (!orderItem) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      // Get order for context
      const order = await storage.getOrder(orderItem.orderId);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "orderItem",
        entityId: id.toString(),
        details: { 
          orderId: orderItem.orderId,
          itemId: orderItem.itemId,
          status: orderItem.status
        },
        organizationId: order?.organizationId
      });
      
      res.json(orderItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order item data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update order item" });
    }
  });

  // Shipment routes
  app.get("/api/shipments", isAuthenticated, async (req, res) => {
    const orderId = req.query.orderId ? parseInt(req.query.orderId as string) : undefined;
    
    const shipments = await storage.listShipments(orderId);
    
    // Expand with order details
    const expandedShipments = await Promise.all(
      shipments.map(async (shipment) => {
        const order = await storage.getOrder(shipment.orderId);
        const user = await storage.getUser(shipment.createdBy);
        
        return {
          ...shipment,
          order,
          createdByUser: user ? { id: user.id, username: user.username, fullName: user.fullName } : undefined
        };
      })
    );
    
    res.json(expandedShipments);
  });

  app.get("/api/shipments/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const shipment = await storage.getShipment(id);
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Get order for context
    const order = await storage.getOrder(shipment.orderId);
    
    res.json({
      ...shipment,
      order
    });
  });

  app.post("/api/shipments", isAuthenticated, hasPermission("shipping:create"), async (req, res) => {
    try {
      const shipmentData = insertShipmentSchema.parse(req.body);
      
      // Create shipment with current user
      const shipment = await storage.createShipment({
        ...shipmentData,
        createdBy: (req.user as any).id
      });
      
      // Get order for context
      const order = await storage.getOrder(shipment.orderId);
      
      // Update order status if provided in the request
      if (req.body.updateOrderStatus && order) {
        await storage.updateOrder(order.id, { status: "shipped" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "create",
        entityType: "shipment",
        entityId: shipment.id.toString(),
        details: { 
          orderId: shipment.orderId,
          carrier: shipment.carrier,
          trackingNumber: shipment.trackingNumber
        },
        organizationId: order?.organizationId
      });
      
      res.status(201).json(shipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid shipment data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create shipment" });
    }
  });

  app.patch("/api/shipments/:id", isAuthenticated, hasPermission("shipping:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedShipment = await storage.updateShipment(id, req.body);
      
      if (!updatedShipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      
      // Get order for context
      const order = await storage.getOrder(updatedShipment.orderId);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "update",
        entityType: "shipment",
        entityId: id.toString(),
        details: { 
          orderId: updatedShipment.orderId,
          status: updatedShipment.status
        },
        organizationId: order?.organizationId
      });
      
      res.json(updatedShipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid shipment data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to update shipment" });
    }
  });

  // Activity Logs routes
  app.get("/api/activity-logs", isAuthenticated, hasPermission("logs:read"), async (req, res) => {
    const organizationId = req.query.organizationId 
      ? parseInt(req.query.organizationId as string) 
      : undefined;
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    
    const logs = await storage.listActivityLogs(organizationId, entityType, entityId);
    
    // Expand with user details
    const expandedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = await storage.getUser(log.userId);
        
        return {
          ...log,
          user: user ? { id: user.id, username: user.username, fullName: user.fullName } : undefined
        };
      })
    );
    
    res.json(expandedLogs);
  });

  // Export CSV for inventory (simplified for MVP)
  app.get("/api/reports/inventory-csv", isAuthenticated, hasPermission("reports:read"), async (req, res) => {
    const organizationId = parseInt(req.query.organizationId as string);
    
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    
    // Get all inventory
    const inventoryList = await storage.listInventory();
    
    // Create CSV data
    let csvData = "SKU,Name,Category,Warehouse,Zone,Bin,Quantity,Allocated,Available\n";
    
    for (const inv of inventoryList) {
      const item = await storage.getItem(inv.itemId);
      const bin = await storage.getBin(inv.binId);
      
      if (!item || !bin) continue; // Skip if missing data
      
      const zone = bin ? await storage.getZone(bin.zoneId) : null;
      const warehouse = zone ? await storage.getWarehouse(zone.warehouseId) : null;
      const category = item.categoryId ? await storage.getCategory(item.categoryId) : null;
      
      // Only include items from the requested organization
      if (item.organizationId !== organizationId) continue;
      
      csvData += `"${item.sku}","${item.name}","${category?.name || ''}","${warehouse?.name || ''}","${zone?.name || ''}","${bin.code}",${inv.quantity},${inv.allocatedQuantity},${inv.quantity - inv.allocatedQuantity}\n`;
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.csv');
    res.send(csvData);
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
