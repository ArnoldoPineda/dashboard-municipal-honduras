import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Colores para los gráficos
const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16', '#f43f5e',
  '#0d9488', '#d946ef', '#059669', '#7c3aed',
];

export const AdvancedAnalysisChart = ({ data, title, type, customColors = COLORS }) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">Sin datos disponibles</div>;
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString('es-HN')} />
              <Legend />
              <Bar dataKey="value" fill={customColors[0]} name="Valor" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={customColors[index % customColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString('es-HN')} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString('es-HN')} />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke={customColors[0]}
                strokeWidth={2}
                dot={{ fill: customColors[0], r: 5 }}
                activeDot={{ r: 7 }}
                name="Valor"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name="Población" />
              <YAxis dataKey="y" name="Presupuesto" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Municipios" data={data} fill={customColors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-center text-gray-500">Tipo de gráfico no soportado</div>;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4 text-gray-800">{title}</h3>
      {renderChart()}
    </div>
  );
};

export default AdvancedAnalysisChart;