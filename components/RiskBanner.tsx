import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { ClientProfile, RiskProfile } from '../types';
import { AlertTriangle, ShieldCheck, ShieldAlert, Heart, Calendar, CheckSquare, RefreshCw, XCircle } from 'lucide-react';

interface RiskBannerProps {
  client: ClientProfile;
}

const RiskBanner: React.FC<RiskBannerProps> = ({ client }) => {
  const { updateClientProfile } = useData();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);

  const riskProfile = client.riskProfile || {
    suicidalIdeation: false,
    homicidalIntent: false,
    lastAssessmentDate: '',
    safetyPlanGenerated: false
  };

  const isHighRisk = !!(riskProfile.suicidalIdeation || riskProfile.homicidalIntent);

  const handleToggleRisk = async (type: 'suicidal' | 'homicidal') => {
    setIsUpdating(true);
    try {
      const now = new Date();
      const updatedRiskProfile: RiskProfile = {
        ...riskProfile,
        suicidalIdeation: type === 'suicidal' ? !riskProfile.suicidalIdeation : riskProfile.suicidalIdeation,
        homicidalIntent: type === 'homicidal' ? !riskProfile.homicidalIntent : riskProfile.homicidalIntent,
        lastAssessmentDate: now.toLocaleDateString()
      };

      const updatedClient = {
        ...client,
        riskProfile: updatedRiskProfile
      };

      await updateClientProfile(updatedClient);
    } catch (e) {
      console.error("Failed to update risk profile:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearAll = async () => {
    setIsUpdating(true);
    try {
      const updatedRiskProfile: RiskProfile = {
        suicidalIdeation: false,
        homicidalIntent: false,
        lastAssessmentDate: new Date().toLocaleDateString(),
        safetyPlanGenerated: false
      };

      const updatedClient = {
        ...client,
        riskProfile: updatedRiskProfile
      };

      await updateClientProfile(updatedClient);
    } catch (e) {
      console.error("Failed to clear risk flags:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
      {/* Banner Header Accent */}
      {isHighRisk ? (
        <div className="bg-gradient-to-r from-red-500 via-rose-600 to-red-700 text-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm animate-pulse">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/30 px-2 py-0.5 rounded">High Psychiatric Risk</span>
                {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin opacity-80" />}
              </div>
              <h3 className="text-base font-extrabold tracking-tight mt-0.5">Clinical Alert: {client.name} requires intensive monitoring</h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {riskProfile.suicidalIdeation && (
              <span className="text-[11px] font-bold bg-white text-rose-700 px-2.5 py-1 rounded-md shadow-sm border border-rose-200">
                ⚠️ Suicidal Ideation Active
              </span>
            )}
            {riskProfile.homicidalIntent && (
              <span className="text-[11px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-sm">
                💥 Homicidal Intent Active
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-deep text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded">Psychiatric Risk: Normal</span>
                {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">No immediate active crisis risk flags registered for {client.name}.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 font-bold">
            Last Assessed: {riskProfile.lastAssessmentDate || 'Never'}
          </span>
        </div>
      )}

      {/* Controller / Override Panel */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Smart system automations trace risk terms (e.g. <i>suicide, self harm, homicide</i>) during clinical note entries. You can also override or adjust indicators manually below:
          </p>
          <button
            type="button"
            onClick={() => setShowManagePanel(!showManagePanel)}
            className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center shrink-0 border border-teal-200 hover:border-teal-300 bg-teal-50/50 px-3 py-1.5 rounded-lg transition"
          >
            {showManagePanel ? "Hide Controls" : "Adjust Risk Flags"}
          </button>
        </div>

        {showManagePanel && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            {/* Suicidal Checkbox Toggle */}
            <div className={`p-3.5 rounded-xl border transition ${riskProfile.suicidalIdeation ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50/50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${riskProfile.suicidalIdeation ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
                  Suicidal Ideation
                </span>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleToggleRisk('suicidal')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    riskProfile.suicidalIdeation
                      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {riskProfile.suicidalIdeation ? "Active (Disable)" : "Mark Active"}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Activate to trigger caretaker medication checklists, intensive outpatient monitoring, and crisis safety plans.</p>
            </div>

            {/* Homicidal Checkbox Toggle */}
            <div className={`p-3.5 rounded-xl border transition ${riskProfile.homicidalIntent ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50/50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${riskProfile.homicidalIntent ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`} />
                  Homicidal Intent
                </span>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleToggleRisk('homicidal')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    riskProfile.homicidalIntent
                      ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {riskProfile.homicidalIntent ? "Active (Disable)" : "Mark Active"}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Activates high-risk indicators to prompt forensic reviews, behavioral warnings, and caregiver alert protocols.</p>
            </div>

            {/* Safe Status Action */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-emerald-50/10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Clinical Safety Reset</span>
                <p className="text-[10px] text-slate-500 mt-1">If symptoms have fully resolved and the patient has completed the standard recovery phase, reset all active risk flags.</p>
              </div>
              <button
                type="button"
                disabled={isUpdating || !isHighRisk}
                onClick={handleClearAll}
                className={`w-full mt-3 text-xs font-bold py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  isHighRisk 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/55'
                }`}
              >
                <ShieldCheck size={14} />
                <span>Set Clinical Profile to Safe</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskBanner;
