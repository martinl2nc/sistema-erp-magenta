'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportButtonProps {
  dashboardRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
}

export function ExportButton({ dashboardRef, filename = 'dashboard' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!dashboardRef.current) return;

    setIsExporting(true);
    try {
      // Capturar el dashboard como imagen
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0F1115',
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight,
      });

      // Crear PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      // Descargar
      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`${filename}-${timestamp}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el dashboard. Por favor, intenta nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-sm font-medium transition-all hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <>
          <iconify-icon icon="solar:refresh-bold" style={{ fontSize: '1rem' }} className="animate-spin" />
          <span>Exportando...</span>
        </>
      ) : (
        <>
          <iconify-icon icon="solar:download-bold" style={{ fontSize: '1rem' }} />
          <span>Exportar PDF</span>
        </>
      )}
    </button>
  );
}
