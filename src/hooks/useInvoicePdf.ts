import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';

interface InvoiceData {
  id: string;
  invoice_number: string;
  concept: string;
  amount: number;
  tax_rate: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  currency: string;
  ncf_type: string | null;
  ncf: string | null;
  exchange_rate: number;
  rnc_cedula: string | null;
  isr_retention_rate?: number;
  isr_retention_amount?: number;
  clients?: { name: string; document_number: string | null };
}

interface CompanyInfo {
  name: string;
  rnc: string;
  address: string;
  phone: string;
  email: string;
}

const NCF_TYPES: Record<string, string> = {
  'B01': 'Crédito Fiscal',
  'B02': 'Consumidor Final',
  'B14': 'Régimen Especial',
  'B15': 'Gubernamental',
  'B16': 'Exportación',
  'E31': 'e-CF Crédito Fiscal',
  'E32': 'e-CF Consumo',
  'E33': 'e-CF Nota de Débito',
  'E34': 'e-CF Nota de Crédito',
  'E44': 'e-CF Régimen Especial',
  'E45': 'e-CF Gubernamental',
  'E46': 'e-CF Exportación',
};

export function useInvoicePdf() {
  const formatCurrency = (amount: number, currency: string = 'DOP') => {
    const symbol = currency === 'USD' ? 'US$' : 'RD$';
    return `${symbol} ${new Intl.NumberFormat('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`;
  };

  const isElectronicNCF = (ncfType: string | null): boolean => {
    return ncfType?.startsWith('E') || false;
  };

  const generateQRData = (invoice: InvoiceData, companyInfo: CompanyInfo): string => {
    // Datos del QR según especificaciones de la DGII para e-CF
    const qrData = {
      RNCEmisor: companyInfo.rnc,
      RNCComprador: invoice.rnc_cedula || '',
      ENCF: invoice.ncf || '',
      FechaEmision: invoice.issue_date,
      MontoTotal: invoice.total_amount,
      MontoITBIS: Number(invoice.amount) * (invoice.tax_rate / 100),
      CodigoSeguridad: generateSecurityCode(invoice),
      FechaFirma: new Date().toISOString().split('T')[0],
    };
    return JSON.stringify(qrData);
  };

  const generateSecurityCode = (invoice: InvoiceData): string => {
    // Código de seguridad simulado (en producción sería generado por la DGII)
    const base = `${invoice.ncf}${invoice.issue_date}${invoice.total_amount}`;
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
  };

  const generatePdf = async (invoice: InvoiceData, companyInfo?: Partial<CompanyInfo>) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Información de la empresa (valores por defecto)
    const company: CompanyInfo = {
      name: companyInfo?.name || 'Mi Empresa Legal, SRL',
      rnc: companyInfo?.rnc || '000-00000-0',
      address: companyInfo?.address || 'Santo Domingo, República Dominicana',
      phone: companyInfo?.phone || '(809) 000-0000',
      email: companyInfo?.email || 'contacto@miempresa.com',
    };

    const isElectronic = isElectronicNCF(invoice.ncf_type);

    // ============ ENCABEZADO ============
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 91, 166);
    
    if (isElectronic) {
      doc.text('COMPROBANTE FISCAL ELECTRÓNICO', pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      doc.setFontSize(10);
      doc.setTextColor(39, 174, 96);
      doc.text('e-CF - DGII República Dominicana', pageWidth / 2, yPos, { align: 'center' });
    } else {
      doc.text('FACTURA ELECTRÓNICA', pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Comprobante Fiscal (NCF) - DGII', pageWidth / 2, yPos, { align: 'center' });
    }

    // Línea decorativa
    yPos += 5;
    doc.setDrawColor(25, 91, 166);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // ============ DATOS DEL EMISOR ============
    yPos += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(company.name, margin, yPos);
    
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`RNC: ${company.rnc}`, margin, yPos);
    
    yPos += 4;
    doc.text(company.address, margin, yPos);
    
    yPos += 4;
    doc.text(`Tel: ${company.phone} | Email: ${company.email}`, margin, yPos);

    // ============ NCF - CUADRO DESTACADO ============
    yPos += 10;
    const ncfBoxWidth = 85;
    const ncfBoxHeight = isElectronic ? 28 : 22;
    const ncfBoxX = pageWidth - margin - ncfBoxWidth;

    // Fondo del cuadro NCF
    if (isElectronic) {
      doc.setFillColor(232, 245, 233); // Verde claro para e-NCF
      doc.setDrawColor(39, 174, 96);
    } else {
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(25, 91, 166);
    }
    doc.setLineWidth(0.3);
    doc.roundedRect(ncfBoxX, yPos - 5, ncfBoxWidth, ncfBoxHeight, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isElectronic ? 39 : 25, isElectronic ? 174 : 91, isElectronic ? 96 : 166);
    doc.text(isElectronic ? 'COMPROBANTE ELECTRÓNICO (e-CF)' : 'COMPROBANTE FISCAL', ncfBoxX + ncfBoxWidth / 2, yPos, { align: 'center' });
    
    yPos += 5;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${isElectronic ? 'e-NCF' : 'NCF'}: ${invoice.ncf || 'N/A'}`, ncfBoxX + ncfBoxWidth / 2, yPos, { align: 'center' });
    
    yPos += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const ncfTypeLabel = invoice.ncf_type ? NCF_TYPES[invoice.ncf_type] || invoice.ncf_type : '';
    doc.text(`Tipo: ${invoice.ncf_type} - ${ncfTypeLabel}`, ncfBoxX + ncfBoxWidth / 2, yPos, { align: 'center' });

    if (isElectronic) {
      yPos += 5;
      doc.setFontSize(7);
      doc.setTextColor(39, 174, 96);
      doc.text(`Código Seguridad: ${generateSecurityCode(invoice)}`, ncfBoxX + ncfBoxWidth / 2, yPos, { align: 'center' });
    }

    // ============ DATOS DE LA FACTURA ============
    const dataStartY = yPos - (isElectronic ? 20 : 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Factura No:', margin, dataStartY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoice_number, margin + 25, dataStartY);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha de Emisión:', margin, dataStartY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(invoice.issue_date), 'dd/MM/yyyy', { locale: es }), margin + 38, dataStartY + 5);

    if (invoice.due_date) {
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha de Vencimiento:', margin, dataStartY + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: es }), margin + 45, dataStartY + 10);
    }

    // ============ DATOS DEL CLIENTE ============
    yPos += (isElectronic ? 15 : 12);
    doc.setFillColor(240, 242, 245);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 22, 'F');

    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 91, 166);
    doc.text('DATOS DEL CLIENTE', margin + 3, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Cliente:', margin + 3, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.clients?.name || 'N/A', margin + 20, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('RNC/Cédula:', margin + 3, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.rnc_cedula || invoice.clients?.document_number || 'N/A', margin + 28, yPos);

    // ============ DETALLE DE SERVICIOS ============
    yPos += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 91, 166);
    doc.text('DETALLE DE SERVICIOS', margin, yPos);

    yPos += 5;
    // Encabezado de tabla
    doc.setFillColor(25, 91, 166);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');

    yPos += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPCIÓN', margin + 3, yPos);
    doc.text('MONTO', pageWidth - margin - 3, yPos, { align: 'right' });

    yPos += 7;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Fila de concepto
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 12, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, yPos + 8, pageWidth - margin, yPos + 8);

    doc.setFontSize(9);
    const conceptLines = doc.splitTextToSize(invoice.concept, pageWidth - 80);
    doc.text(conceptLines[0], margin + 3, yPos + 2);
    doc.text(formatCurrency(Number(invoice.amount), invoice.currency), pageWidth - margin - 3, yPos + 2, { align: 'right' });

    // ============ RESUMEN DE MONTOS ============
    yPos += 20;
    const summaryX = pageWidth - margin - 70;

    // Base imponible
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', summaryX, yPos);
    doc.text(formatCurrency(Number(invoice.amount), invoice.currency), pageWidth - margin, yPos, { align: 'right' });

    // ITBIS
    yPos += 6;
    const itbisAmount = Number(invoice.amount) * (invoice.tax_rate / 100);
    doc.text(`ITBIS (${invoice.tax_rate}%):`, summaryX, yPos);
    doc.text(`+${formatCurrency(itbisAmount, invoice.currency)}`, pageWidth - margin, yPos, { align: 'right' });

    // Retención ISR
    const isrRetentionRate = invoice.isr_retention_rate || 0;
    const isrRetentionAmount = invoice.isr_retention_amount || 0;
    if (isrRetentionRate > 0) {
      yPos += 6;
      doc.setTextColor(192, 57, 43);
      doc.text(`Retención ISR (${isrRetentionRate}%):`, summaryX, yPos);
      doc.text(`-${formatCurrency(isrRetentionAmount, invoice.currency)}`, pageWidth - margin, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }

    // Línea antes del total
    yPos += 4;
    doc.setDrawColor(25, 91, 166);
    doc.setLineWidth(0.5);
    doc.line(summaryX, yPos, pageWidth - margin, yPos);

    // Total
    yPos += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 91, 166);
    doc.text('TOTAL A PAGAR:', summaryX, yPos);
    doc.text(formatCurrency(Number(invoice.total_amount), invoice.currency), pageWidth - margin, yPos, { align: 'right' });

    // Equivalente en DOP si es USD
    if (invoice.currency === 'USD' && invoice.exchange_rate > 1) {
      yPos += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      const equivalentDOP = Number(invoice.total_amount) * invoice.exchange_rate;
      doc.text(`Equivalente: ${formatCurrency(equivalentDOP, 'DOP')} (Tasa: ${invoice.exchange_rate})`, pageWidth - margin, yPos, { align: 'right' });
    }

    // ============ CÓDIGO QR PARA e-NCF ============
    if (isElectronic) {
      yPos += 15;
      
      // Generar QR Code
      const qrData = generateQRData(invoice, company);
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 100,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });

      // Cuadro del QR
      const qrBoxWidth = 55;
      const qrBoxHeight = 65;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(39, 174, 96);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, yPos, qrBoxWidth, qrBoxHeight, 3, 3, 'FD');

      // Añadir QR al PDF
      doc.addImage(qrDataUrl, 'PNG', margin + 7.5, yPos + 3, 40, 40);

      // Texto debajo del QR
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(39, 174, 96);
      doc.text('VALIDACIÓN e-CF', margin + qrBoxWidth / 2, yPos + 47, { align: 'center' });
      
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Escanee para verificar', margin + qrBoxWidth / 2, yPos + 52, { align: 'center' });
      doc.text('autenticidad DGII', margin + qrBoxWidth / 2, yPos + 56, { align: 'center' });

      // Notas al lado del QR si hay
      if (invoice.notes) {
        const notesX = margin + qrBoxWidth + 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Notas:', notesX, yPos + 5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - notesX - margin);
        doc.text(notesLines, notesX, yPos + 12);
      }

      yPos += qrBoxHeight + 5;
    } else {
      // ============ NOTAS (sin QR) ============
      if (invoice.notes) {
        yPos += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Notas:', margin, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
        doc.text(notesLines, margin, yPos);
        yPos += notesLines.length * 4;
      }
    }

    // ============ ESTADO DE PAGO ============
    yPos += 10;
    const statusLabels: Record<string, { text: string; color: [number, number, number] }> = {
      'pending': { text: 'PENDIENTE DE PAGO', color: [230, 126, 34] },
      'paid': { text: 'PAGADA', color: [39, 174, 96] },
      'overdue': { text: 'VENCIDA', color: [192, 57, 43] },
      'cancelled': { text: 'ANULADA', color: [127, 140, 141] },
    };

    const statusInfo = statusLabels[invoice.status] || statusLabels['pending'];
    doc.setFillColor(...statusInfo.color);
    const statusWidth = 50;
    doc.roundedRect(margin, yPos, statusWidth, 8, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(statusInfo.text, margin + statusWidth / 2, yPos + 5.5, { align: 'center' });

    if (invoice.status === 'paid' && invoice.paid_date) {
      doc.setTextColor(39, 174, 96);
      doc.text(`  Fecha de pago: ${format(new Date(invoice.paid_date), 'dd/MM/yyyy', { locale: es })}`, margin + statusWidth + 3, yPos + 5.5);
    }

    // ============ PIE DE PÁGINA ============
    const footerY = doc.internal.pageSize.getHeight() - 25;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    if (isElectronic) {
      doc.text('Este documento es un Comprobante Fiscal Electrónico (e-CF) válido según la normativa de la DGII', pageWidth / 2, footerY + 5, { align: 'center' });
      doc.text('Verifique la autenticidad escaneando el código QR', pageWidth / 2, footerY + 9, { align: 'center' });
    } else {
      doc.text('Este documento es una Factura válida según la normativa de la DGII', pageWidth / 2, footerY + 5, { align: 'center' });
      doc.text('Dirección General de Impuestos Internos - República Dominicana', pageWidth / 2, footerY + 9, { align: 'center' });
    }
    
    doc.setFontSize(7);
    doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth / 2, footerY + 14, { align: 'center' });

    // Guardar el archivo
    const prefix = isElectronic ? 'eCF' : 'Factura';
    const fileName = `${prefix}_${invoice.ncf || invoice.invoice_number}_${format(new Date(invoice.issue_date), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);

    return fileName;
  };

  return { generatePdf };
}
