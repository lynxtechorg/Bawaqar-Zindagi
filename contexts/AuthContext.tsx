

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, Organization, User } from '../types';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from the main instance's config to reuse for the temp client
const SUPABASE_URL = 'https://koafroefxddayhgzewcj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYWZyb2VmeGRkYXloZ3pld2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NDc0ODYsImV4cCI6MjA3ODAyMzQ4Nn0.qHemVTtPgkMnVWRXzBR3h85v8d1pbOrRczGaUQNoJXc';

export type CopMode = 'FIELD' | 'CAMPSITE';

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  organization: Organization | null;
  copMode: CopMode | null;
  isLoading: boolean; // New Loading State
  
  // Auth Actions
  login: (username: string, password: string) => Promise<{ success: boolean, msg: string }>;
  logout: () => void;
  selectOrganization: (org: Organization, mode?: CopMode) => void;
  initializeAdmin: () => Promise<{ success: boolean, msg: string }>;
  
  // Admin User Management
  users: User[];
  registerUser: (name: string, role: UserRole, org: Organization) => Promise<{ success: boolean, user?: User, msg?: string }>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (id: string) => Promise<string>; // Returns new password
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Organization state
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [copMode, setCopMode] = useState<CopMode | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Default to loading

  const userRole = currentUser ? currentUser.role : null;

  // Initial Check for Session
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && session.user) {
                // Fetch Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile && mounted) {
                    setCurrentUser({
                        id: session.user.id,
                        name: profile.username || session.user.email,
                        username: session.user.email || '',
                        password: '', 
                        role: profile.role as UserRole,
                        organization: profile.organization as Organization,
                        createdAt: session.user.created_at
                    });
                    setOrganization(profile.organization as Organization);
                }
            }
        } catch (error) {
            console.error("Auth Initialization Error:", error);
        } finally {
            if (mounted) setIsLoading(false);
        }
    };

    initializeAuth();

    // Listen for auth changes (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session) {
            if (mounted) {
                setCurrentUser(null);
                setOrganization(null);
            }
        }
        // Note: We primarily rely on the initial check for hydration,
        // preventing double-fetches or race conditions here.
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []); // Run once on mount — re-running this re-fetched the profile and re-subscribed needlessly.

  // Session Keep-Alive (Refresh every 4 minutes to prevent timeout issues). Only while logged in.
  useEffect(() => {
    if (!currentUser) return;
    const keepAliveInterval = setInterval(async () => {
        const { error } = await supabase.auth.refreshSession();
        if (error) console.warn("Session refresh warning:", error.message);
    }, 4 * 60 * 1000);
    return () => clearInterval(keepAliveInterval);
  }, [currentUser]);

  // Fetch all users for Admin View — only Admins need (or are shown) the directory.
  useEffect(() => {
    if (currentUser?.role !== UserRole.ADMIN) return;
    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*');
        if (data) {
            const mappedUsers: User[] = data.map((p: any) => ({
                id: p.id,
                name: p.username || 'Unknown',
                username: p.email || 'No Email',
                password: '(Hidden)',
                role: p.role as UserRole,
                organization: p.organization as Organization,
                createdAt: p.created_at
            }));
            setUsers(mappedUsers);
        }
    };
    fetchUsers();
  }, [currentUser]);

  const login = async (username: string, password: string) => {
    if (!organization) return { success: false, msg: 'Select Organization first.' };

    let email = username;
    if (!username.includes('@')) {
        email = `${username.toLowerCase()}@bwz-cop-system.com`;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
      return { success: false, msg: error.message };
    }

    if (data.user) {
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if ((!profile || profileError) && email === 'admin@bwz-cop-system.com') {
             console.log("Admin Profile missing, repairing...");
             const { error: insertError } = await supabase.from('profiles').insert([{
                 id: data.user.id,
                 username: 'Master Admin',
                 email: 'admin@bwz-cop-system.com',
                 role: UserRole.ADMIN,
                 organization: 'BWZ'
             }]);
             
             if (insertError) {
                 return { success: false, msg: 'Profile repair failed: ' + insertError.message };
             } else {
                 const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                 profile = newProfile;
                 profileError = null;
             }
        }

        if (profileError || !profile) {
            await supabase.auth.signOut();
            return { success: false, msg: 'Profile not found in DB.' };
        }

        const userOrg = profile.organization || 'BWZ'; 
        
        if (profile.role !== UserRole.ADMIN) {
            if (userOrg !== organization) {
                await supabase.auth.signOut();
                return { success: false, msg: `Access Denied: Account belongs to ${userOrg}.` };
            }
        }

        setCurrentUser({
            id: data.user.id,
            name: profile.username,
            username: email,
            password: '', 
            role: profile.role as UserRole,
            organization: userOrg as Organization,
            createdAt: data.user.created_at
        });

        return { success: true, msg: 'Login Successful' };
    }
    return { success: false, msg: 'Unknown Error' };
  };
  
  const logout = async () => {
      await supabase.auth.signOut();
      setCurrentUser(null);
  };
  
  const selectOrganization = (org: Organization, mode?: CopMode) => {
    setOrganization(org);
    setCopMode(mode || null);
  };

  const initializeAdmin = async () => {
      const { data, error } = await supabase.auth.signUp({
          email: 'admin@bwz-cop-system.com',
          password: 'masterkey123',
      });

      if (error) {
          if (error.message.includes('already registered')) {
               return { success: false, msg: 'User already exists.' };
          }
          return { success: false, msg: error.message };
      }

      if (data.user) {
          if (data.session) {
              const { error: profileError } = await supabase.from('profiles').upsert([{
                 id: data.user.id,
                 username: 'Master Admin',
                 email: 'admin@bwz-cop-system.com',
                 role: UserRole.ADMIN,
                 organization: 'BWZ'
              }]);
              if (profileError) return { success: false, msg: 'User created but Profile failed: ' + profileError.message };
              return { success: true, msg: 'Admin Initialized. Login now.' };
          } else {
              return { success: true, msg: 'Admin created! Confirm Email then Login.' };
          }
      }
      return { success: false, msg: 'Initialization failed.' };
  };

  const registerUser = async (name: string, role: UserRole, org: Organization) => {
     const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user';
     const randomSerial = Math.floor(Math.random() * 9000 + 1000).toString();
     const email = `${cleanName}.${role.substring(0,3).toLowerCase()}${randomSerial}@bwz-cop-system.com`;
     const password = Math.random().toString(36).slice(-8);

     const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: false, 
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
     });

     const { data: authData, error: authError } = await tempClient.auth.signUp({
        email,
        password,
     });

     if (authError) {
         if (authError.message.includes('rate limit') || authError.status === 429) {
             return { success: false, msg: 'Rate Limit. Disable "Confirm Email" in Supabase.' };
         }
         return { success: false, msg: authError.message };
     }

     if (!authData.user) {
         return { success: false, msg: 'User creation failed.' };
     }

     const newProfile = {
         id: authData.user.id,
         username: name,
         email: email,
         role: role,
         organization: org
     };

     const { error: profileError } = await supabase.from('profiles').insert([newProfile]);

     if (profileError) {
         return { success: false, msg: 'Profile insert failed: ' + profileError.message };
     }

     const newUser: User = {
         id: authData.user.id,
         name,
         username: email,
         password, 
         role,
         organization: org,
         createdAt: new Date().toISOString()
     };

     setUsers(prev => [...prev, newUser]);
     return { success: true, user: newUser };
  };

  const deleteUser = async (id: string) => {
      // Try the privileged Edge Function (removes the actual auth account).
      const { error } = await supabase.functions.invoke('admin-users', { body: { action: 'delete', userId: id } });
      if (error) {
          // Fallback: removing the profile already revokes all access (login requires a
          // profile, and RLS denies everything without one). The orphaned auth row is
          // cleaned up once the admin-users function is deployed.
          console.warn("admin-users function unavailable, falling back to profile-only delete:", error.message);
          await supabase.from('profiles').delete().eq('id', id);
      }
      setUsers(prev => prev.filter(u => u.id !== id));
  };

  const resetUserPassword = async (id: string): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'reset', userId: id } });
      if (error || !data?.password) {
          throw new Error(error?.message || 'Password reset requires the admin-users Edge Function to be deployed.');
      }
      return data.password as string;
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, userRole, organization, copMode, login, logout, selectOrganization, initializeAdmin,
        users, registerUser, deleteUser, resetUserPassword, isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};