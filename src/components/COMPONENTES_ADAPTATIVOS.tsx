import React from 'react';

// ============================================================================
// RESPONSIVE GRID - Se adapta automáticamente a mobile/tablet/desktop
// ============================================================================
interface ResponsiveGridProps {
  children: React.ReactNode;
  isMobile: boolean;
  isTablet: boolean;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  gap?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  isMobile,
  isTablet,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 4,
  gap = '1rem',
}) => {
  let columns = desktopColumns;
  if (isMobile) columns = mobileColumns;
  else if (isTablet) columns = tabletColumns;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// ADAPTIVE TABLE - Tabla que se convierte en cards en mobile
// ============================================================================
interface AdaptiveTableProps {
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
  isMobile: boolean;
}

export const AdaptiveTable: React.FC<AdaptiveTableProps> = ({ columns, data, isMobile }) => {
  if (isMobile) {
    // Vista Cards en mobile
    return (
      <div className="space-y-3">
        {data.map((row, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between items-center mb-2 last:mb-0">
                <span className="text-gray-600 text-sm font-medium">{col.label}:</span>
                <span className="text-gray-900 font-semibold">{row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Vista Tabla en desktop/tablet
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3 text-left font-semibold text-gray-900">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 text-gray-700">
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

// ============================================================================
// KPI CARD - Tarjeta para mostrar métricas
// ============================================================================
interface KPICardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  description?: string;
  isMobile?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon = '📊',
  color = 'blue',
  description,
  isMobile = false,
}) => {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-blue-50',
    green: 'border-l-green-500 bg-green-50',
    purple: 'border-l-purple-500 bg-purple-50',
    orange: 'border-l-orange-500 bg-orange-50',
    red: 'border-l-red-500 bg-red-50',
    indigo: 'border-l-indigo-500 bg-indigo-50',
  };

  return (
    <div className={`bg-white rounded-lg shadow border-l-4 p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>{title}</p>
          <p className={`font-bold text-gray-900 mt-1 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            {value}
          </p>
          {description && (
            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {description}
            </p>
          )}
        </div>
        <span className={isMobile ? 'text-2xl' : 'text-3xl'}>{icon}</span>
      </div>
    </div>
  );
};

// ============================================================================
// RESPONSIVE SELECT - Select grande en mobile
// ============================================================================
interface ResponsiveSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  isMobile: boolean;
}

export const ResponsiveSelect: React.FC<ResponsiveSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  isMobile,
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium outline-none ${
        isMobile ? 'px-3 py-3 text-sm' : 'px-4 py-2 text-base'
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

// ============================================================================
// INFO CARD - Tarjeta de información genérica
// ============================================================================
interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  isMobile?: boolean;
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, children, isMobile = false }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
      <h3 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>
        {title}
      </h3>
      {children}
    </div>
  );
};

// ============================================================================
// RESPONSIVE BUTTON - Botón adaptativo
// ============================================================================
interface ResponsiveButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  isMobile?: boolean;
  className?: string;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  isMobile = false,
  className = '',
}) => {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-lg font-semibold transition ${
        isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-base'
      } ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// ============================================================================
// FILTERS PANEL - Panel de filtros responsivo
// ============================================================================
interface FiltersPanelProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({ children, isMobile }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
      <div className={`flex flex-col gap-3 ${isMobile ? '' : 'flex-row'}`}>{children}</div>
    </div>
  );
};

// ============================================================================
// STATS LAYOUT - Layout para mostrar estadísticas
// ============================================================================
interface StatsLayoutProps {
  children: React.ReactNode;
  isMobile: boolean;
  isTablet: boolean;
}

export const StatsLayout: React.FC<StatsLayoutProps> = ({ children, isMobile, isTablet }) => {
  let columns = 4;
  if (isMobile) columns = 2;
  else if (isTablet) columns = 2;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1rem',
      }}
    >
      {children}
    </div>
  );
};