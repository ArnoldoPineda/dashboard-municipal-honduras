import React from 'react';
import { Download } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportData';

interface ExportButtonsProps {
  data: any[];
  fileName: string;
  sheetName?: string;
  pdfTitle?: string;
  pdfColumns?: string[];
  variant?: 'compact' | 'full';
}

export default function ExportButtons({
  data,
  fileName,
  sheetName = 'Datos',
  pdfTitle = 'Reporte',
  pdfColumns,
  variant = 'full',
}: ExportButtonsProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const columns = pdfColumns || Object.keys(data[0]);

  const handleExcelClick = () => {
    try {
      exportToExcel(data, fileName, sheetName);
    } catch (error) {
      alert('Error al exportar a Excel');
    }
  };

  const handlePDFClick = () => {
    try {
      exportToPDF(data, columns, fileName, pdfTitle);
    } catch (error) {
      alert('Error al exportar a PDF');
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleExcelClick}
          title="Descargar Excel"
          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
        >
          <Download size={18} />
        </button>
        <button
          onClick={handlePDFClick}
          title="Descargar PDF"
          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
        >
          <Download size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExcelClick}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        <Download size={18} />
        Exportar Excel
      </button>
      <button
        onClick={handlePDFClick}
        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        <Download size={18} />
        Exportar PDF
      </button>
    </div>
  );
}