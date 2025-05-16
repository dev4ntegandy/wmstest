import { createContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  organizationId?: number;
  roleId?: number;
  isActive: boolean;
  role?: {
    id: number;
    name: string;
    permissions: string[];
    scope: string;
  };
};

type Organization = {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  parentId?: number;
};

type AuthContextType = {
  user: User | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setCurrentOrganization: (org: Organization) => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  organizations: [],
  currentOrganization: null,
  isLoading: true,
  hasPermission: () => false,
  login: async () => false,
  logout: async () => {},
  setCurrentOrganization: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if the user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // For demo purposes, check localStorage first
        const storedUser = localStorage.getItem('wms_user');
        const storedOrgs = localStorage.getItem('wms_organizations');
        
        if (storedUser) {
          // Use stored user data
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          if (storedOrgs) {
            const orgsData = JSON.parse(storedOrgs);
            setOrganizations(orgsData);
            
            // Set default current organization if not set
            if (orgsData.length > 0) {
              const storedCurrentOrg = localStorage.getItem('wms_current_org');
              if (storedCurrentOrg) {
                setCurrentOrganization(JSON.parse(storedCurrentOrg));
              } else {
                setCurrentOrganization(orgsData[0]);
              }
            }
          } else {
            // If no stored orgs, create default ones
            initializeDefaultOrganizations();
          }
        } else {
          // Try API as fallback
          const res = await fetch("/api/auth/current-user", {
            credentials: "include",
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            fetchOrganizations();
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Initialize default organizations for demo
  const initializeDefaultOrganizations = () => {
    const defaultOrgs: Organization[] = [
      { 
        id: 1, 
        name: "Borderworx", 
        description: "Parent 3PL Organization", 
        isActive: true 
      },
      { 
        id: 2, 
        name: "Silver Crystal", 
        description: "Customer Organization", 
        isActive: true, 
        parentId: 1 
      },
      { 
        id: 3, 
        name: "CarCan", 
        description: "Automotive Parts Distributor", 
        isActive: true, 
        parentId: 1 
      }
    ];
    
    setOrganizations(defaultOrgs);
    setCurrentOrganization(defaultOrgs[0]);
    
    // Store for persistence
    localStorage.setItem('wms_organizations', JSON.stringify(defaultOrgs));
    localStorage.setItem('wms_current_org', JSON.stringify(defaultOrgs[0]));
  };

  // Fetch organizations when user is set
  const fetchOrganizations = async () => {
    try {
      // For demo, use default organizations
      if (!localStorage.getItem('wms_organizations')) {
        initializeDefaultOrganizations();
        return;
      }
      
      // Try API call as fallback
      const res = await fetch("/api/organizations", {
        credentials: "include",
      });

      if (res.ok) {
        const orgs = await res.json();
        setOrganizations(orgs);
        
        // Set default current organization if not set
        if (orgs.length > 0 && !currentOrganization) {
          setCurrentOrganization(orgs[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.role) return false;
    
    // Global admin has all permissions
    if (user.role.permissions.includes("all")) return true;
    
    // Check for specific permission
    return user.role.permissions.includes(permission);
  };

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // For demo purposes, hardcode successful login without API calls
      if (
        (username === "admin" && password === "password123") ||
        (username === "demo" && password === "demo123")
      ) {
        // Create mock user for demo
        const mockUser: User = {
          id: 1,
          username: username,
          fullName: username === "admin" ? "Admin User" : "Demo User",
          email: `${username}@example.com`,
          password: "", // Don't store actual password
          organizationId: 1,
          roleId: 1,
          isActive: true,
          role: {
            id: 1,
            name: "Global Admin",
            permissions: ["all"],
            scope: "global"
          }
        };
        
        // Set user in state and localStorage
        setUser(mockUser);
        localStorage.setItem('wms_user', JSON.stringify(mockUser));
        
        // Initialize organizations
        initializeDefaultOrganizations();
        
        return true;
      }
      
      // Try API as fallback
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await fetchOrganizations();
        return true;
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Invalid username or password. Try admin/password123",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Clear localStorage
      localStorage.removeItem('wms_user');
      localStorage.removeItem('wms_current_org');
      
      // Clear state
      setUser(null);
      setCurrentOrganization(null);
      
      // Try API logout as fallback
      await apiRequest("POST", "/api/auth/logout", {});
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrganization,
        isLoading,
        hasPermission,
        login,
        logout,
        setCurrentOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
