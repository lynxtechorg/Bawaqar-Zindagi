import React from 'react';
import { RiskProfile } from '../types';

interface RiskBannerProps {
  riskProfile: RiskProfile;
  name: string;
}

const RiskBanner: React.FC<RiskBannerProps> = ({ riskProfile, name }) => {
  if (!riskProfile.suicidalIdeation && !riskProfile.homicidalIntent) {
    return null;
  }

  return (
    <div className="bg-red-600 text-white p-4 shadow-md flex items-center justify-between animate-pulse">
      <div className="flex items-center space-x-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wider">High Risk Alert: {name}</h3>
          <p className="text-sm font-medium">
            Flags: 
            {riskProfile.suicidalIdeation && <span className="ml-1 bg-white text-red-600 px-2 py-0.5 rounded mr-2">Suicidal Ideation</span>}
            {riskProfile.homicidalIntent && <span className="bg-black text-white px-2 py-0.5 rounded">Homicidal Intent</span>}
          </p>
        </div>
      </div>
      <div className="text-sm italic">
        Last Assessed: {riskProfile.lastAssessmentDate}
      </div>
    </div>
  );
};

export default RiskBanner;