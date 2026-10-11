import React from 'react';
import { RoadmapFeature } from '../types';

interface FeatureRoadmapProps {
  features: RoadmapFeature[];
}

const FeatureRoadmap: React.FC<FeatureRoadmapProps> = ({ features }) => {
  return (
    <div className="flex flex-col items-center py-6 w-full">
      <div className="text-center mb-10 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-semibold text-[#A78BFA] mb-3">
          <span>SaaS Capability Matrix</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
          Intelligent Proposal Lifecycle
        </h2>
        <p className="text-sm text-[#A7ADBD] mt-2">
          From first draft to predictive acceptance analytics, streamline every stage of your business proposals.
        </p>
      </div>

      <div className="relative flex flex-col items-start space-y-6 max-w-2xl w-full">
        {/* Subtle vertical connector with gradient */}
        <div className="absolute left-[17px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-[#8B5CF6] via-white/[0.08] to-white/[0.04]" />

        {features.map((feature, index) => (
          <div key={feature.id} className="relative w-full pl-12 group">
            {/* Step indicator node */}
            <div
              className={`absolute left-0 top-6 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-md ${
                feature.isActive
                  ? 'bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white ring-2 ring-[#8B5CF6]/40 shadow-[#8B5CF6]/30'
                  : 'bg-[#151823] text-[#A7ADBD] border border-white/[0.1] group-hover:border-[#8B5CF6]/40 group-hover:text-white'
              }`}
            >
              {index + 1}
            </div>

            {/* Feature Card */}
            <div className={`p-5 rounded-2xl transition-all duration-200 border ${
              feature.isActive
                ? 'bg-[#151823] border-[#8B5CF6]/30 shadow-lg shadow-[#8B5CF6]/5'
                : 'bg-[#10131C] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#151823]'
            }`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <h3 className="text-base font-semibold text-[#F8FAFC] tracking-tight group-hover:text-white">
                  {feature.title}
                </h3>
                {feature.isActive ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Active Module
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-[#A7ADBD] border border-white/[0.06]">
                    Integrated
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#A7ADBD] leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureRoadmap;