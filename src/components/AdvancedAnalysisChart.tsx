// src/components/AdvancedAnalysisChart.tsx
import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import SafeResponsiveContainer from './SafeResponsiveContainer';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface AdvancedAnalysisChartProps {
  data: { name: string; value: number }[];
  title: string;
  type?: 'bar' | 'line';
}

const AdvancedAnalysisChart: React.FC<AdvancedAnalysisChartProps> = ({
  data,
  title,
  type = 'bar',
}) => {
  const { isMobile } = useMediaQuery();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  const chartHeight = isMobile ? 220 : 260;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
      <h3 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>
        {title}
      </h3>

      {/* Contenedor fijo para que ResponsiveContainer siempre tenga alto */}
      <div style={{ width: '100%', height: chartHeight }}>
        {ready && data && data.length > 0 && (
          <SafeResponsiveContainer width="100%" height="100%">
            {type === 'line' ? (
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: isMobile ? 10 : 11 }}
                  angle={isMobile ? -30 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: isMobile ? 10 : 11 }}
                  angle={isMobile ? -30 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </SafeResponsiveContainer>
        )}

        {/* Placeholder silencioso mientras aún no está ready */}
        {!ready && <div style={{ width: '100%', height: '100%' }} />}
      </div>
    </div>
  );
};

export default AdvancedAnalysisChart;
