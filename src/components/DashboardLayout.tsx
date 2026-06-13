import React from 'react';
import { useSimho } from '../context/SimhoContext';

interface DashboardLayoutProps {
  title?: string;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isEmbedded } = useSimho();

  if (isEmbedded) {
    return (
      <div className="simho-scroll" style={{ padding: '24px 28px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      {children}
    </div>
  );
};

export default DashboardLayout;
