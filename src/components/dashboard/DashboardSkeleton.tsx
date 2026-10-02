import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'pill' | 'text';
}

/**
 * Base sleek, minimalist skeleton loader with subtle linear shimmer.
 * Zero-glare, dark-mode aligned, high perceived performance.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
}) => {
  const variantStyles = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    pill: 'rounded-full',
    text: 'rounded-md h-3.5',
  };

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-white/[0.04] ${variantStyles[variant]} ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-skeleton-shimmer bg-gradient-to-r from-transparent via-white/[0.07] to-transparent pointer-events-none" />
    </div>
  );
};

/**
 * Skeleton for single KPI Metric Card in Overview & Cockpit
 */
export const MetricCardSkeleton: React.FC<{ index?: number }> = () => {
  return (
    <div className="bg-rk-panel border border-rk-line rounded-2xl p-5 space-y-3 relative">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="pt-2 border-t border-rk-line-soft flex items-center justify-between">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
};

/**
 * Skeleton for 4 Primary KPI Cards Row
 */
export const MetricsRowSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </div>
  );
};

/**
 * Skeleton for Table Row in Data Tables (e.g. LeadsTab)
 */
export const TableRowSkeleton: React.FC = () => {
  return (
    <tr className="hover:bg-white/[0.01] transition-colors">
      <td className="py-3.5 px-4 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </td>
      <td className="py-3.5 px-4 space-y-1.5">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-24" />
      </td>
      <td className="py-3.5 px-4">
        <Skeleton className="h-6 w-24 rounded" />
      </td>
      <td className="py-3.5 px-4">
        <Skeleton className="h-7 w-32 rounded-xl" />
      </td>
      <td className="py-3.5 px-4">
        <Skeleton className="h-7 w-28 rounded-lg" />
      </td>
      <td className="py-3.5 px-4 text-right">
        <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
      </td>
    </tr>
  );
};

/**
 * Skeleton for Production Projects Quick Strip
 */
export const ProjectStripSkeleton: React.FC = () => {
  return (
    <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-rk-line pb-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-3.5 w-44" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-rk-bg border border-rk-line-soft space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <Skeleton className="h-full w-2/3" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for Recent Leads List Panel
 */
export const LeadsPanelSkeleton: React.FC = () => {
  return (
    <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-rk-line pb-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-3.5 w-32" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-rk-bg border border-rk-line-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-3/4 max-w-sm" />
              <div className="flex items-center gap-2 pt-0.5">
                <Skeleton className="h-3 w-24" />
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>

            <Skeleton className="h-8 w-24 rounded-lg self-start sm:self-auto" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for 6 Poles Performance List
 */
export const PolesPerformanceSkeleton: React.FC = () => {
  return (
    <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-2.5 rounded-xl bg-rk-bg border border-rk-line-soft space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <Skeleton className="h-full w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for the Strategic AI Report in Copilot Tab
 */
export const ReportPreviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Meta */}
      <div className="border-b border-rk-line pb-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-7 w-3/4" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>

      {/* Executive Summary Block */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-rk-line-soft space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2 pt-1">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[92%]" />
          <Skeleton className="h-3.5 w-[85%]" />
        </div>
      </div>

      {/* Key Strategic Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-rk-line-soft space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>

      {/* Structured Recommendations */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-52" />
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3.5 rounded-xl bg-rk-bg border border-rk-line-soft flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forfait Recommandé Banner */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-rk-line-soft flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Skeleton for Chat Message in Copilot Tab
 */
export const ChatResponseSkeleton: React.FC = () => {
  return (
    <div className="flex gap-2.5 text-xs sm:text-sm justify-start animate-fadeIn">
      <div className="p-4 rounded-2xl max-w-[85%] bg-rk-panel border border-rk-line rounded-tl-none space-y-2 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
};

/**
 * Skeleton for Projects Production Tab Full View
 */
export const ProjectsProductionSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top filter bar skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rk-panel border border-rk-line">
        <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Project Cards List */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-3xl bg-rk-panel border border-rk-line space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-56" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <Skeleton className="h-full w-1/2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for CRM / Leads Section
 */
export const CrmSectionSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rk-panel border border-rk-line">
        <Skeleton className="h-10 w-full sm:w-72 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Lead Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-rk-panel border border-rk-line space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-3.5 w-2/3" />
            <div className="flex items-center justify-between pt-2 border-t border-rk-line-soft">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Complete OverviewTab Skeleton
 */
export const OverviewTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Metrics Row */}
      <MetricsRowSkeleton />

      {/* Production Projects Strip */}
      <ProjectStripSkeleton />

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <LeadsPanelSkeleton />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <PolesPerformanceSkeleton />
          {/* IA Shortcut Skeleton */}
          <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 space-y-3">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-9 w-full rounded-xl mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProductionTabSkeleton = ProjectsProductionSkeleton;
