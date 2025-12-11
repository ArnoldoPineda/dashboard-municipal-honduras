import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
} from 'recharts';
import SafeResponsiveContainer from './SafeResponsiveContainer';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface EnhancedKPICardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  description?: string;
  trendValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  sparkData?: { value: number }[];
}

const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({
  title,
  value,
  icon,
  color = 'blue',
  description,
  trendValue,
  trend = 'neutral',
  sparkData = [],
}) => {
  const { isMobile } = useMediaQuery();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  const colorMap: Record<string, { bg: string; border: string; text: string; trend: string }> = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      trend: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      trend: 'text-green-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      trend: 'text-purple-600',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      trend: 'text-orange-600',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      trend: 'text-red-600',
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      trend: 'text-indigo-600',
    },
  };

  const colorClass = colorMap[color];

  const trendIcon =
    trend === 'up' ? '📈' : trend === 'down' ? '📉' : trend === 'neutral' ? '➡️' : '';

  return (
    <div
      className={`rounded-lg border-l-4 p-4 shadow-md hover:shadow-lg transition ${colorClass.bg} border-b ${colorClass.border}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className={`text-gray-600 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{title}</p>
          <p className={`font-bold mt-1 ${colorClass.text} ${isMobile ? 'text-lg' : 'text-2xl'}`}>
            {value}
          </p>
        </div>
        {icon && <span className={isMobile ? 'text-2xl' : 'text-3xl'}>{icon}</span>}
      </div>

      {/* Descripción */}
      {description && (
        <p className={`text-gray-600 mb-3 ${isMobile ? 'text-xs' : 'text-sm'}`}>{description}</p>
      )}

      {/* Trend */}
      {trendValue && (
        <div className={`flex items-center gap-1 mb-3 ${colorClass.trend}`}>
          <span className="text-sm">{trendIcon}</span>
          <span className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>{trendValue}</span>
        </div>
      )}

      {/* Spark Chart (si hay datos) */}
      {sparkData && sparkData.length > 0 && (
        <div style={{ width: '100%', height: isMobile ? 40 : 50 }}>
          {ready && (
            <SafeResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${color})`} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={`var(--color-${color})`} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={`var(--color-${color}, #3b82f6)`}
                  fill={`url(#gradient-${color})`}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </SafeResponsiveContainer>
          )}
          {!ready && <div style={{ width: '100%', height: '100%' }} />}
        </div>
      )}
    </div>
  );
};

export default EnhancedKPICard;