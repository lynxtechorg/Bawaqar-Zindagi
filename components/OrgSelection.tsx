import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Globe, Tent, MapPin, ArrowLeft } from 'lucide-react';

const OrgSelection = () => {
  const { selectOrganization } = useAuth();
  const [showCopOptions, setShowCopOptions] = useState(false);

  if (showCopOptions) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
           <button onClick={() => setShowCopOptions(false)} className="mb-8 flex items-center text-slate-500 hover:text-indigo-900 font-bold">
              <ArrowLeft className="mr-2"/> Back to Organization
           </button>
           
           <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">COP Operational Mode</h1>
              <p className="text-slate-500">Select the type of operation you are conducting today.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Field Operations */}
              <button 
                 onClick={() => selectOrganization('COP', 'FIELD')} 
                 className="bg-white p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-indigo-600 hover:shadow-2xl transition-all text-left group"
              >
                 <div className="w-16 h-16 bg-indigo-100 text-indigo-900 rounded-2xl flex items-center justify-center mb-6">
                    <MapPin size={32} />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-900">Field Operations</h2>
                 <p className="text-slate-500 text-sm">Mobile awareness, pamphlet distribution, and community engagement sessions.</p>
              </button>

              {/* Campsite */}
              <button 
                 onClick={() => selectOrganization('COP', 'CAMPSITE')} 
                 className="bg-white p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-indigo-600 hover:shadow-2xl transition-all text-left group"
              >
                 <div className="w-16 h-16 bg-indigo-900 text-white rounded-2xl flex items-center justify-center mb-6">
                    <Tent size={32} />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-900">Campsite (Medical Camp)</h2>
                 <p className="text-slate-500 text-sm">Full medical camp setup including Reception, Doctor, Pharmacy, and Therapy stations.</p>
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
         <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Welcome to the Portal</h1>
            <p className="text-slate-500">Please select your organization to proceed.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* BWZ Option */}
            <button 
               onClick={() => selectOrganization('BWZ')} 
               className="bg-white p-10 rounded-2xl shadow-lg border-2 border-transparent hover:border-bwz-primary hover:shadow-2xl transition-all group text-left relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Building2 size={120} />
               </div>
               <div className="w-16 h-16 bg-bwz-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-2xl">BZ</span>
               </div>
               <h2 className="text-3xl font-bold text-slate-800 mb-2 group-hover:text-bwz-primary transition-colors">BWZ</h2>
               <p className="text-slate-500 font-medium">Bawaqar Zindagi Hospital Management System</p>
               <div className="mt-8 flex items-center text-sm font-bold text-bwz-primary">
                  Select Organization &rarr;
               </div>
            </button>

            {/* COP Option */}
            <button 
               onClick={() => setShowCopOptions(true)} 
               className="bg-white p-10 rounded-2xl shadow-lg border-2 border-transparent hover:border-indigo-600 hover:shadow-2xl transition-all group text-left relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Globe size={120} className="text-indigo-900" />
               </div>
               <div className="w-16 h-16 bg-indigo-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-2xl">CO</span>
               </div>
               <h2 className="text-3xl font-bold text-slate-800 mb-2 group-hover:text-indigo-900 transition-colors">COP</h2>
               <p className="text-slate-500 font-medium">Community Outreach & Field Program</p>
               <div className="mt-8 flex items-center text-sm font-bold text-indigo-900">
                  Select Mode &rarr;
               </div>
            </button>
         </div>
      </div>
    </div>
  );
};

export default OrgSelection;