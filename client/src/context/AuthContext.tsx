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
        const res = await fetch("/api/auth/current-user", {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          
          // Fetch organizations
          fetchOrganizations();
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Fetch organizations when user is set
  const fetchOrganizations = async () => {
    try {
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
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await fetchOrganizations();
        return true;
      } else {
        const errorData = await res.json();
        toast({
          title: "Login Failed",
          description: errorData.message || "Invalid username or password",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
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
      await apiRequest("POST", "/api/auth/logout", {});
      setUser(null);
      setCurrentOrganization(null);
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
