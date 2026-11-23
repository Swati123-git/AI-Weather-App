import React from 'react';

export const CardSkeleton = ({ height = '220px', className = '' }) => (
  <div className={`skeleton-card ${className}`} style={{ minHeight: height }}>
    <div className="skeleton-line skeleton-title shimmer"></div>
    <div className="skeleton-line skeleton-subtitle shimmer"></div>
    <div className="skeleton-grid">
      <div className="skeleton-box shimmer"></div>
      <div className="skeleton-box shimmer"></div>
    </div>
  </div>
);

export const ChartSkeleton = ({ height = '320px' }) => (
  <div className="skeleton-card" style={{ minHeight: height }}>
    <div className="skeleton-line skeleton-title shimmer" style={{ width: '40%' }}></div>
    <div className="skeleton-chart shimmer" style={{ height: '220px' }}></div>
  </div>
);

export const ListSkeleton = ({ count = 3 }) => (
  <div className="skeleton-list">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-card skeleton-item shimmer" style={{ height: '90px' }}>
        <div className="skeleton-line" style={{ width: '60%' }}></div>
        <div className="skeleton-line" style={{ width: '90%' }}></div>
      </div>
    ))}
  </div>
);

const SkeletonLoaders = {
  CardSkeleton,
  ChartSkeleton,
  ListSkeleton
};

export default SkeletonLoaders;
