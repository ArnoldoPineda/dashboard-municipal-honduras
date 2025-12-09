import React from 'react';

// Grid responsivo
export const ResponsiveGrid = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <div className={`grid gap-4 ${className}`}>{children}</div>;
};

// KPI Card adaptativo
export const KPICard = ({
  label,
  value,
  icon,
  isMobile,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  isMobile: boolean;
}) => {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${isMobile ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>{label}</p>
          <p className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>{value}</p>
        </div>
        {icon && <div className={isMobile ? 'text-xl' : 'text-3xl'}>{icon}</div>}
      </div>
    </div>
  );
};

// Select grande en mobile
export const ResponsiveSelect = ({
  value,
  onChange,
  options,
  isMobile,
  ...props
}: any) => {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`border border-gray-300 rounded-lg w-full ${
        isMobile ? 'px-3 py-3 text-sm' : 'px-4 py-2'
      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
      {...props}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

// Convertir tabla a cards en mobile
export const AdaptiveTable = ({
  columns,
  data,
  isMobile,
}: {
  columns: any[];
  data: any[];
  isMobile: boolean;
}) => {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((row, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-4 space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between">
                <span className="text-gray-600 text-sm font-semibold">{col.label}:</span>
                <span className="text-gray-900 font-medium">{row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {columns.map((col) => (
              <th key={col.key} className="border p-3 text-left text-sm font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="border p-3 text-sm">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};