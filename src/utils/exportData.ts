import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExportData {
  [key: string]: any[];
}

/**
 * Exportar datos a Excel
 */
export function exportToExcel(
  data: any[],
  fileName: string,
  sheetName: string = 'Datos'
): void {
  try {
    // Crear workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Ajustar ancho de columnas
    const colWidths = Object.keys(data[0] || {}).map(() => 15);
    ws['!cols'] = colWidths.map((width) => ({ wch: width }));

    // Descargar
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    throw new Error('No se pudo exportar a Excel');
  }
}

/**
 * Exportar tabla a Excel con múltiples hojas
 */
export function exportMultipleSheets(
  sheetsData: { [sheetName: string]: any[] },
  fileName: string
): void {
  try {
    const wb = XLSX.utils.book_new();

    Object.entries(sheetsData).forEach(([sheetName, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      const colWidths = Object.keys(data[0] || {}).map(() => 15);
      ws['!cols'] = colWidths.map((width) => ({ wch: width }));
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error exportando múltiples hojas:', error);
    throw new Error('No se pudo exportar a Excel');
  }
}

/**
 * Exportar tabla a PDF
 */
export function exportToPDF(
  data: any[],
  columns: string[],
  fileName: string,
  title: string = 'Reporte'
): void {
  try {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Título
    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });

    // Fecha
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-HN')}`, pageWidth / 2, 22, {
      align: 'center',
    });

    // Tabla
    (doc as any).autoTable({
      head: [columns],
      body: data.map((row) => columns.map((col) => row[col] || '-')),
      startY: 30,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      margin: { top: 30 },
      didDrawPage: (data: any) => {
        // Footer
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageNumber = data.pageNumber;

        doc.setFontSize(10);
        doc.text(
          `Página ${pageNumber} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      },
    });

    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error exportando a PDF:', error);
    throw new Error('No se pudo exportar a PDF');
  }
}

/**
 * Exportar gráficos y datos a PDF avanzado
 */
export function exportDashboardToPDF(
  title: string,
  sections: Array<{
    heading: string;
    table?: { columns: string[]; data: any[] };
    kpis?: Array<{ label: string; value: string | number }>;
  }>,
  fileName: string
): void {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 15;

    // Título principal
    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Fecha
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-HN')}`, pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 15;

    // Secciones
    sections.forEach((section) => {
      // Heading
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(section.heading, 10, yPosition);
      yPosition += 8;

      // KPIs
      if (section.kpis && section.kpis.length > 0) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        section.kpis.forEach((kpi) => {
          doc.text(`${kpi.label}: ${kpi.value}`, 15, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }

      // Tabla
      if (section.table) {
        (doc as any).autoTable({
          head: [section.table.columns],
          body: section.table.data.map((row) =>
            section.table!.columns.map((col) => row[col] || '-')
          ),
          startY: yPosition,
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          bodyStyles: {
            textColor: [50, 50, 50],
            fontSize: 9,
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240],
          },
          margin: { left: 10, right: 10 },
        });

        yPosition = (doc as any).internal.pageSize.getHeight() - 20;
      }

      yPosition += 10;
    });

    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error exportando dashboard a PDF:', error);
    throw new Error('No se pudo exportar el dashboard a PDF');
  }
}