

import React, { useState } from 'react';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserRole } from './types';
import Login from './components/Login';
import OrgSelection from './components/OrgSelection';
import DoctorView from './components/DoctorView';
import ReceptionistView from './components/ReceptionistView';
import ExecutiveView from './components/ExecutiveView';
import PharmacistView from './components/PharmacistView';
import PRPView from './components/PRPView';
import AdminView from './components/AdminView';
import PersonalDashboard from './components/PersonalDashboard'; // Import Personal Dashboard
import { DATABASE_SCHEMA_SQL } from './schema';
import { LogOut, Building, UserCircle, LayoutDashboard, Briefcase, Menu, X, Loader2 } from 'lucide-react';

const MainLayout = () => {
  const { userRole, logout, organization, selectOrganization, currentUser, isLoading } = useAuth();
  const [showSchema, setShowSchema] = useState(false);
  const [viewMode, setViewMode] = useState<'WORK' | 'DASHBOARD'>('WORK'); // Toggle between Workstation and Personal Dashboard
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 0. SHOW LOADING SCREEN
  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-bwz-primary animate-spin mb-4" />
              <h2 className="text-xl font-bold text-slate-800">Initializing Secure Session...</h2>
              <p className="text-slate-500 text-sm">Verifying Access Rights & Decrypting Profile</p>
          </div>
      );
  }

  // 1. If no Org selected, show Org Selection
  if (!organization) return <OrgSelection />;

  // 2. If no User Role (logged out), show Login
  if (!userRole) return <Login />;

  const renderView = () => {
    if (viewMode === 'DASHBOARD') {
        return <PersonalDashboard />;
    }

    switch (userRole) {
      case UserRole.ADMIN: return <AdminView />;
      case UserRole.DOCTOR: return <DoctorView />;
      case UserRole.RECEPTIONIST: return <ReceptionistView />;
      case UserRole.EXECUTIVE: return <ExecutiveView />;
      case UserRole.PHARMACIST: return <PharmacistView />;
      // Both roles map to the same component, but the component adapts content based on Org flags
      case UserRole.PRP_SPECIALIST: return <PRPView />;
      case UserRole.OUTREACH_SPECIALIST: return <PRPView />;
      default: return <div>Error: Unknown Role</div>;
    }
  };

  const navColor = organization === 'COP' ? 'bg-indigo-900' : 'bg-bwz-primary';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <nav className={`${userRole === UserRole.ADMIN ? 'bg-slate-900' : navColor} text-white shadow-lg sticky top-0 z-50 no-print transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Branding */}
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                 {organization === 'BWZ' ? 'BZ' : 'CO'}
              </div>
              <span className="text-lg md:text-xl font-bold tracking-tight truncate max-w-[200px] md:max-w-none">
                 {organization === 'BWZ' ? 'Bawaqar Zindagi' : 'COP Initiative'}
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              
              {/* View Toggle */}
              <div className="bg-black/20 rounded-lg p-1 flex space-x-1">
                 <button 
                    onClick={() => setViewMode('WORK')} 
                    className={`flex items-center px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'WORK' ? 'bg-white text-slate-800 shadow' : 'text-white/70 hover:text-white'}`}
                 >
                    <Briefcase size={14} className="mr-1"/> Workstation
                 </button>
                 <button 
                    onClick={() => setViewMode('DASHBOARD')} 
                    className={`flex items-center px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'DASHBOARD' ? 'bg-white text-slate-800 shadow' : 'text-white/70 hover:text-white'}`}
                 >
                    <LayoutDashboard size={14} className="mr-1"/> My Dashboard
                 </button>
              </div>

              <div className="h-6 w-px bg-white/20 mx-2"></div>

              <div className="flex items-center space-x-2">
                  <UserCircle size={16} />
                  <span className="text-sm font-bold">{currentUser?.name}</span>
              </div>

              {userRole === UserRole.EXECUTIVE && (
                  <button onClick={() => setShowSchema(!showSchema)} className="text-xs text-white/70 hover:text-white">DB Schema</button>
              )}
              
              <button onClick={logout} className="flex items-center text-white/90 hover:text-white bg-red-500/20 px-3 py-1 rounded hover:bg-red-500/40 text-xs font-bold">
                <LogOut size={14} className="mr-1" /> Logout
              </button>
              <button onClick={() => selectOrganization(null as any)} className="flex items-center text-white/70 hover:text-white text-xs">
                 <Building size={14} className="mr-1"/> Switch Org
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white/80 hover:text-white focus:outline-none">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-black/20 backdrop-blur-md border-t border-white/10 p-4 space-y-4 animate-fade-in">
             <div className="flex items-center space-x-2 mb-4 text-white/80">
                  <UserCircle size={20} />
                  <span className="font-bold">{currentUser?.name}</span>
             </div>
             
             <div className="grid grid-cols-2 gap-2">
                 <button 
                    onClick={() => { setViewMode('WORK'); setIsMobileMenuOpen(false); }} 
                    className={`flex items-center justify-center px-3 py-3 rounded text-sm font-bold transition-all ${viewMode === 'WORK' ? 'bg-white text-slate-800 shadow' : 'bg-white/10 text-white'}`}
                 >
                    <Briefcase size={16} className="mr-2"/> Workstation
                 </button>
                 <button 
                    onClick={() => { setViewMode('DASHBOARD'); setIsMobileMenuOpen(false); }} 
                    className={`flex items-center justify-center px-3 py-3 rounded text-sm font-bold transition-all ${viewMode === 'DASHBOARD' ? 'bg-white text-slate-800 shadow' : 'bg-white/10 text-white'}`}
                 >
                    <LayoutDashboard size={16} className="mr-2"/> Dashboard
                 </button>
             </div>

             <div className="border-t border-white/10 pt-4 space-y-3">
                 {userRole === UserRole.EXECUTIVE && (
                    <button onClick={() => { setShowSchema(!showSchema); setIsMobileMenuOpen(false); }} className="w-full text-left text-sm text-white/80 py-2">View DB Schema</button>
                 )}
                 <button onClick={logout} className="w-full flex items-center text-red-300 py-2 text-sm font-bold">
                    <LogOut size={16} className="mr-2" /> Logout
                 </button>
                 <button onClick={() => selectOrganization(null as any)} className="w-full flex items-center text-white/70 py-2 text-sm">
                     <Building size={16} className="mr-2"/> Switch Organization
                 </button>
             </div>
          </div>
        )}
      </nav>

      {showSchema && (
        <div className="bg-slate-800 text-slate-300 p-6 overflow-auto max-h-64 border-b border-slate-700 font-mono text-xs no-print">
          <pre>{DATABASE_SCHEMA_SQL}</pre>
        </div>
      )}

      <main className="flex-grow w-full overflow-x-hidden">
        {renderView()}
      </main>

      <footer className="bg-white border-t mt-auto py-6 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          &copy; 2023 {organization === 'BWZ' ? 'Bawaqar Zindagi (BWZ)' : 'COP Initiative'}. HIPAA Compliant. Ultra-Advanced Edition.
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainLayout />
      </DataProvider>
    </AuthProvider>
  );
}