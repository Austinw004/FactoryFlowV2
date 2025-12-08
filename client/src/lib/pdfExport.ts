import jsPDF from 'jspdf';

interface DashboardData {
  companyName: string;
  exportDate: string;
  fdr: number;
  regime: string;
  regimeDescription: string;
  totalSKUs: number;
  avgFillRate: string;
  actionItems: number;
  allocations: Array<{
    skuName: string;
    materialName: string;
    quantity: number;
    priority: string;
  }>;
  policySignals: Array<{
    title: string;
    description: string;
    urgency: string;
  }>;
}

export function generateDashboardPDF(data: DashboardData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Prescient Labs Dashboard Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${data.companyName} | Generated: ${data.exportDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  doc.setDrawColor(200);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Economic Regime Status', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`FDR Score: ${data.fdr.toFixed(2)}`, 25, yPosition);
  yPosition += 7;
  doc.text(`Current Regime: ${data.regime}`, 25, yPosition);
  yPosition += 7;
  doc.setFontSize(9);
  doc.setTextColor(80);
  const descLines = doc.splitTextToSize(data.regimeDescription, pageWidth - 50);
  doc.text(descLines, 25, yPosition);
  yPosition += descLines.length * 5 + 10;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Key Performance Indicators', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const kpiStartX = 25;
  const kpiColWidth = 55;
  
  doc.text('Total SKUs', kpiStartX, yPosition);
  doc.text('Avg Fill Rate', kpiStartX + kpiColWidth, yPosition);
  doc.text('Action Items', kpiStartX + kpiColWidth * 2, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text(data.totalSKUs.toString(), kpiStartX, yPosition);
  doc.text(`${data.avgFillRate}%`, kpiStartX + kpiColWidth, yPosition);
  doc.text(data.actionItems.toString(), kpiStartX + kpiColWidth * 2, yPosition);
  yPosition += 15;
  
  if (data.allocations.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Recent Allocations', 20, yPosition);
    yPosition += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SKU', 25, yPosition);
    doc.text('Material', 70, yPosition);
    doc.text('Quantity', 120, yPosition);
    doc.text('Priority', 150, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    const maxAllocations = Math.min(data.allocations.length, 10);
    for (let i = 0; i < maxAllocations; i++) {
      const alloc = data.allocations[i];
      doc.text(alloc.skuName.substring(0, 20), 25, yPosition);
      doc.text(alloc.materialName.substring(0, 25), 70, yPosition);
      doc.text(alloc.quantity.toString(), 120, yPosition);
      doc.text(alloc.priority, 150, yPosition);
      yPosition += 5;
    }
    if (data.allocations.length > 10) {
      doc.setTextColor(100);
      doc.text(`... and ${data.allocations.length - 10} more allocations`, 25, yPosition);
      yPosition += 5;
    }
    yPosition += 10;
  }
  
  if (data.policySignals.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Recommended Actions', 20, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    const maxSignals = Math.min(data.policySignals.length, 5);
    for (let i = 0; i < maxSignals; i++) {
      const signal = data.policySignals[i];
      doc.setFont('helvetica', 'bold');
      doc.text(`${signal.urgency.toUpperCase()}: ${signal.title}`, 25, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const signalLines = doc.splitTextToSize(signal.description, pageWidth - 50);
      doc.text(signalLines, 30, yPosition);
      yPosition += signalLines.length * 4 + 5;
      doc.setFontSize(10);
    }
  }
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | Prescient Labs Manufacturing Intelligence`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  const filename = `prescient-dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
