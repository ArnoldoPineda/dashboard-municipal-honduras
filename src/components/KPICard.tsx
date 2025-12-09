import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
  };

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className={`text-2xl ${iconColorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

export default KPICard;