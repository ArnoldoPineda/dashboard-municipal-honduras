import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
  sparkData?: Array<{ value: number }>;
}

export const EnhancedKPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  color,
  trend = 'neutral',
  trendValue = '0%',
  description,
  sparkData,
}) => {
  const bgColor = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  }[color] || 'bg-gray-50 border-gray-200';

  const textColor = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    purple: 'text-purple-900',
    orange: 'text-orange-900',
    red: 'text-red-900',
    indigo: 'text-indigo-900',
  }[color] || 'text-gray-900';

  const accentColor = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    indigo: 'text-indigo-600',
  }[color] || 'text-gray-600';

  const chartColor = {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f59e0b',
    red: '#ef4444',
    indigo: '#6366f1',
  }[color] || '#6b7280';

  return (
    <div className={`${bgColor} border rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow`}>
      {/* Header con icono */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold ${textColor} mt-1`}>{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>

      {/* Descripción si existe */}
      {description && <p className="text-xs text-gray-600 mb-3">{description}</p>}

      {/* Trend indicator */}
      {trendValue && (
        <div className="flex items-center gap-1 mb-3">
          <span
            className={`text-xs font-semibold ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-600'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        </div>
      )}

      {/* Mini gráfico */}
      {sparkData && sparkData.length > 0 && (
        <div className="h-16 mt-4 -mx-6 px-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <Area
                type="monotone"
                dataKey="value"
                fill={chartColor}
                stroke={chartColor}
                fillOpacity={0.2}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default EnhancedKPICard;