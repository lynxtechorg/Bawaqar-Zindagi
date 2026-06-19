import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Globe, Tent, MapPin, ArrowLeft, ArrowRight } from 'lucide-react';

const LOGO = 'https://caravanoflifetrust.org/wp-content/uploads/2026/05/Caravan-of-Life-Pakistan-Trust-Logo.png';

const OrgSelection = () => {
  const { selectOrganization } = useAuth();
  const [showCopOptions, setShowCopOptions] = useState(false);

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-bwz-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-5xl animate-fade-in">{children}</div>
    </div>
  );

  if (showCopOptions) {
    return (
      <Shell>
        <button onClick={() => setShowCopOptions(false)} className="mb-8 inline-flex items-center text-slate-500 hover:text-indigo-600 font-semibold text-sm transition-colors">
          <ArrowLeft className="mr-2" size={16} /> Back to Organization
        </button>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">COP Operational Mode</h1>
          <p className="text-slate-500">Select the type of operation you are conducting today.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => selectOrganization('COP', 'FIELD')} className="card card-hover p-8 text-left group">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <MapPin size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">Field Operations</h2>
            <p className="text-slate-500 text-sm leading-relaxed">Mobile awareness, pamphlet distribution, and community engagement sessions.</p>
            <div className="mt-5 inline-flex items-center text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Start <ArrowRight size={15} className="ml-1" /></div>
          </button>
          <button onClick={() => selectOrganization('COP', 'CAMPSITE')} className="card card-hover p-8 text-left group">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Tent size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">Campsite (Medical Camp)</h2>
            <p className="text-slate-500 text-sm leading-relaxed">Full medical camp: Reception, Doctor, Pharmacy, and Therapy stations.</p>
            <div className="mt-5 inline-flex items-center text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Start <ArrowRight size={15} className="ml-1" /></div>
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center mb-10">
        <img src={LOGO} alt="Caravan of Life Pakistan Trust" className="h-16 w-auto mb-5 drop-shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Welcome to the Portal</h1>
        <p className="text-slate-500">A project of Caravan of Life Pakistan Trust · Select your organization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button onClick={() => selectOrganization('BWZ')} className="card card-hover p-9 text-left group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity"><Building2 size={120} /></div>
          <div className="w-16 h-16 bg-bwz-primary rounded-2xl flex items-center justify-center mb-6 shadow-soft group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-2xl">BZ</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1.5 group-hover:text-bwz-primary transition-colors">Bawaqar Zindagi</h2>
          <p className="text-slate-500 text-sm leading-relaxed">Psychiatric Rehabilitation &amp; Hospital Management</p>
          <p className="text-emerald-700 font-spectral text-lg mt-3">روشن ذہن روشن مستقبل</p>
          <div className="mt-6 inline-flex items-center text-sm font-semibold text-bwz-primary">Select Organization <ArrowRight size={15} className="ml-1.5" /></div>
        </button>

        <button onClick={() => setShowCopOptions(true)} className="card card-hover p-9 text-left group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity"><Globe size={120} className="text-indigo-900" /></div>
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-soft group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-2xl">CO</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">COP Initiative</h2>
          <p className="text-slate-500 text-sm leading-relaxed">Community Outreach &amp; Field Program</p>
          <p className="text-transparent select-none text-lg mt-3">—</p>
          <div className="mt-6 inline-flex items-center text-sm font-semibold text-indigo-600">Select Mode <ArrowRight size={15} className="ml-1.5" /></div>
        </button>
      </div>
    </Shell>
  );
};

export default OrgSelection;
