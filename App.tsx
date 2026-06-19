import React, { useState, Suspense } from 'react';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserRole } from './types';
import Login from './components/Login';
import OrgSelection from './components/OrgSelection';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Toaster from './components/ui/Toaster';
import { DATABASE_SCHEMA_SQL } from './schema';
import { LogOut, Building, UserCircle, LayoutDashboard, Briefcase, Menu, X, Loader2 } from 'lucide-react';

// Code-split the heavy role views so the initial load stays small.
const DoctorView = React.lazy(() => import('./components/DoctorView'));
const ReceptionistView = React.lazy(() => import('./components/ReceptionistView'));
const ExecutiveView = React.lazy(() => import('./components/ExecutiveView'));
const PharmacistView = React.lazy(() => import('./components/PharmacistView'));
const PRPView = React.lazy(() => import('./components/PRPView'));
const AdminView = React.lazy(() => import('./components/AdminView'));
const PersonalDashboard = React.lazy(() => import('./components/PersonalDashboard'));

const ViewLoader = () => (
  <div className="flex items-center justify-center py-32 text-slate-400">
    <Loader2 size={28} className="animate-spin" />
  </div>
);

const MainLayout = () => {
  const { userRole, logout, organization, selectOrganization, currentUser, isLoading } = useAuth();
  const [showSchema, setShowSchema] = useState(false);
  const [viewMode, setViewMode] = useState<'WORK' | 'DASHBOARD'>('WORK');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 0. LOADING SCREEN
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-bwz-primary text-white flex items-center justify-center font-black text-lg shadow-card mb-5 animate-scale-in">BZ</div>
        <Loader2 size={22} className="text-bwz-primary animate-spin mb-3" />
        <h2 className="text-base font-semibold text-slate-700">Initializing secure session…</h2>
        <p className="text-slate-400 text-xs mt-1">Verifying access & decrypting profile</p>
      </div>
    );
  }

  if (!organization) return <OrgSelection />;
  if (!userRole) return <Login />;

  const renderView = () => {
    if (viewMode === 'DASHBOARD') return <PersonalDashboard />;
    switch (userRole) {
      case UserRole.ADMIN: return <AdminView />;
      case UserRole.DOCTOR: return <DoctorView />;
      case UserRole.RECEPTIONIST: return <ReceptionistView />;
      case UserRole.EXECUTIVE: return <ExecutiveView />;
      case UserRole.PHARMACIST: return <PharmacistView />;
      case UserRole.PRP_SPECIALIST: return <PRPView />;
      case UserRole.OUTREACH_SPECIALIST: return <PRPView />;
      default: return <div className="p-10 text-center text-slate-500">Unknown role.</div>;
    }
  };

  const accent = organization === 'COP' ? 'bg-indigo-600' : 'bg-bwz-primary';
  const isAdmin = userRole === UserRole.ADMIN;

  const ViewToggle = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`bg-slate-100 rounded-xl p-1 flex ${mobile ? 'w-full' : ''}`}>
      <button
        onClick={() => { setViewMode('WORK'); setIsMobileMenuOpen(false); }}
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mobile ? 'flex-1' : ''} ${viewMode === 'WORK' ? 'bg-white text-slate-800 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Briefcase size={14} /> Workstation
      </button>
      <button
        onClick={() => { setViewMode('DASHBOARD'); setIsMobileMenuOpen(false); }}
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mobile ? 'flex-1' : ''} ${viewMode === 'DASHBOARD' ? 'bg-white text-slate-800 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <LayoutDashboard size={14} /> My Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Clean, light Notion-style top bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Branding */}
            <div className="flex items-center gap-2.5">
              <div className={`h-9 w-9 ${isAdmin ? 'bg-slate-900' : accent} rounded-xl flex items-center justify-center font-black text-white text-sm shadow-soft`}>
                {organization === 'BWZ' ? 'BZ' : 'CO'}
              </div>
              <div className="leading-tight">
                <span className="block text-sm md:text-base font-bold text-slate-900 tracking-tight">
                  {organization === 'BWZ' ? 'Bawaqar Zindagi' : 'COP Initiative'}
                </span>
                <span className="hidden md:block text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                  {isAdmin ? 'Master Console' : 'Care Management'}
                </span>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4">
              <ViewToggle />
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2 text-slate-600">
                <UserCircle size={18} className="text-slate-400" />
                <span className="text-sm font-semibold">{currentUser?.name}</span>
              </div>
              {userRole === UserRole.EXECUTIVE && (
                <button onClick={() => setShowSchema(!showSchema)} className="text-xs text-slate-400 hover:text-slate-600 font-medium">DB Schema</button>
              )}
              <button onClick={() => selectOrganization(null as any)} className="btn-ghost px-2.5 py-1.5 text-xs">
                <Building size={14} /> Switch
              </button>
              <button onClick={logout} className="btn px-3 py-1.5 text-xs bg-rose-50 text-rose-600 hover:bg-rose-100">
                <LogOut size={14} /> Logout
              </button>
            </div>

            {/* Mobile button */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-500 hover:text-slate-800">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 p-4 space-y-4 animate-fade-in bg-white">
            <div className="flex items-center gap-2 text-slate-600">
              <UserCircle size={20} className="text-slate-400" />
              <span className="font-semibold">{currentUser?.name}</span>
            </div>
            <ViewToggle mobile />
            <div className="border-t border-slate-100 pt-3 space-y-2">
              {userRole === UserRole.EXECUTIVE && (
                <button onClick={() => { setShowSchema(!showSchema); setIsMobileMenuOpen(false); }} className="btn-secondary w-full justify-start">View DB Schema</button>
              )}
              <button onClick={() => selectOrganization(null as any)} className="btn-secondary w-full justify-start"><Building size={16} /> Switch Organization</button>
              <button onClick={logout} className="btn w-full justify-start bg-rose-50 text-rose-600"><LogOut size={16} /> Logout</button>
            </div>
          </div>
        )}
      </nav>

      {showSchema && (
        <div className="bg-slate-900 text-slate-300 p-6 overflow-auto max-h-64 border-b border-slate-700 font-mono text-xs no-print">
          <pre>{DATABASE_SCHEMA_SQL}</pre>
        </div>
      )}

      <main className="flex-grow w-full overflow-x-hidden">
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader />}>
            {renderView()}
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="bg-white border-t border-slate-200/80 mt-auto py-5 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} {organization === 'BWZ' ? 'Bawaqar Zindagi (BWZ)' : 'COP Initiative'} · A project of Caravan of Life Pakistan Trust
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <MainLayout />
          <Toaster />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
