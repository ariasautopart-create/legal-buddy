import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface Invoice {
  id: string;
  invoice_number: string;
  ncf: string | null;
  ncf_type: string | null;
  rnc_cedula: string | null;
  amount: number;
  tax_rate: number;
  total_amount: number;
  isr_retention_rate: number;
  isr_retention_amount: number;
  issue_date: string;
  status: string;
  currency: string;
  exchange_rate: number;
  clients?: { name: string; document_number: string | null };
}

const MONTHS = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

export function DGIIReports() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reportType, setReportType] = useState<'607' | '608'>('607');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endDate = format(endOfMonth(new Date(`${selectedYear}-${selectedMonth}-01`)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name, document_number)')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate)
        .order('issue_date', { ascending: true });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las facturas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getReport607Data = () => {
    return invoices.filter(inv => inv.status !== 'cancelled');
  };

  const getReport608Data = () => {
    return invoices.filter(inv => inv.status === 'cancelled');
  };

  const formatRNC = (rnc: string | null) => {
    if (!rnc) return '';
    return rnc.replace(/[^0-9]/g, '').padStart(11, '0');
  };

  const formatAmount = (amount: number) => {
    return Math.round(amount * 100).toString().padStart(12, '0');
  };

  const formatDate606_607 = (date: string) => {
    return format(new Date(date), 'yyyyMMdd');
  };

  // Generar archivo TXT formato 607 (Ventas)
  const generate607File = () => {
    const data = getReport607Data();
    if (data.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay facturas para el período seleccionado', variant: 'destructive' });
      return;
    }

    const lines: string[] = [];
    
    // Encabezado (Tipo 1)
    // Formato: Tipo|RNC Informante|Período|Cantidad de Registros
    const headerLine = `607|000000000|${selectedYear}${selectedMonth}|${data.length}`;
    lines.push(headerLine);

    // Detalle (Tipo 2)
    data.forEach(inv => {
      const rnc = formatRNC(inv.rnc_cedula || inv.clients?.document_number);
      const ncf = (inv.ncf || '').padEnd(19, ' ');
      const ncfModificado = ''.padEnd(19, ' '); // NCF modificado si aplica
      const tipoIngreso = '01'; // 01 = Ingresos por operaciones
      const fechaComprobante = formatDate606_607(inv.issue_date);
      const fechaRetencion = '';
      
      // Montos en centavos
      const montoFacturado = formatAmount(Number(inv.amount));
      const itbisFacturado = formatAmount(Number(inv.amount) * (inv.tax_rate / 100));
      const itbisRetenidoPorTerceros = '000000000000';
      const itbisProporcionalidad = '000000000000';
      const itbisCostoLlevado = '000000000000';
      const itbisAdiantado = '000000000000';
      const itbisPercibido = '000000000000';
      const tipoRetencion = '';
      const isrRetenidoMonto = formatAmount(inv.isr_retention_amount || 0);
      const isrPercibido = '000000000000';
      const impuestoSelectivo = '000000000000';
      const otrosImpuestos = '000000000000';
      const montoPropina = '000000000000';
      const formaPago = inv.status === 'paid' ? '01' : '02'; // 01=Efectivo, 02=Crédito

      const line = [
        rnc,
        inv.ncf_type || 'B02',
        ncf,
        ncfModificado,
        tipoIngreso,
        fechaComprobante,
        fechaRetencion,
        montoFacturado,
        itbisFacturado,
        itbisRetenidoPorTerceros,
        itbisProporcionalidad,
        itbisCostoLlevado,
        itbisAdiantado,
        itbisPercibido,
        tipoRetencion,
        isrRetenidoMonto,
        isrPercibido,
        impuestoSelectivo,
        otrosImpuestos,
        montoPropina,
        formaPago
      ].join('|');
      
      lines.push(line);
    });

    const content = lines.join('\r\n');
    downloadFile(content, `607_${selectedYear}${selectedMonth}.txt`);
    toast({ title: 'Reporte 607 generado', description: `${data.length} registros de ventas exportados` });
  };

  // Generar archivo TXT formato 608 (NCF Anulados)
  const generate608File = () => {
    const data = getReport608Data();
    if (data.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay comprobantes anulados para el período', variant: 'destructive' });
      return;
    }

    const lines: string[] = [];
    
    // Encabezado
    const headerLine = `608|000000000|${selectedYear}${selectedMonth}|${data.length}`;
    lines.push(headerLine);

    // Detalle
    data.forEach(inv => {
      const ncf = (inv.ncf || '').padEnd(19, ' ');
      const fechaComprobante = formatDate606_607(inv.issue_date);
      const tipoAnulacion = '02'; // 02 = Deterioro de Factura Pre-impresa

      const line = [
        inv.ncf_type || 'B02',
        ncf,
        fechaComprobante,
        tipoAnulacion
      ].join('|');
      
      lines.push(line);
    });

    const content = lines.join('\r\n');
    downloadFile(content, `608_${selectedYear}${selectedMonth}.txt`);
    toast({ title: 'Reporte 608 generado', description: `${data.length} NCF anulados exportados` });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const formatCurrency = (amount: number, currency: string = 'DOP') => {
    const symbol = currency === 'USD' ? 'US$' : 'RD$';
    return `${symbol} ${new Intl.NumberFormat('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`;
  };

  const report607Data = getReport607Data();
  const report608Data = getReport608Data();

  const totalVentas = report607Data.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalItbis = report607Data.reduce((sum, inv) => sum + (Number(inv.amount) * (inv.tax_rate / 100)), 0);
  const totalRetenciones = report607Data.reduce((sum, inv) => sum + Number(inv.isr_retention_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Reportes Fiscales DGII
          </CardTitle>
          <CardDescription>
            Genera los formatos 606, 607 y 608 para tus declaraciones mensuales de impuestos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(year => (
                    <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchInvoices} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cargar Datos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumen */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Facturas Válidas</p>
                  <p className="text-2xl font-bold">{report607Data.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">NCF Anulados</p>
                  <p className="text-2xl font-bold">{report608Data.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Ventas</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalVentas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">ITBIS Facturado</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalItbis)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botones de descarga */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-muted">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Formato 606</h3>
                  <p className="text-sm text-muted-foreground">Compras de Bienes y Servicios</p>
                </div>
                <Badge variant="secondary">Próximamente</Badge>
                <p className="text-xs text-muted-foreground">
                  Requiere registro de compras/gastos
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Download className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Formato 607</h3>
                  <p className="text-sm text-muted-foreground">Ventas de Bienes y Servicios</p>
                </div>
                <Badge variant="default">{report607Data.length} registros</Badge>
                <Button onClick={generate607File} disabled={report607Data.length === 0} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar 607
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">Formato 608</h3>
                  <p className="text-sm text-muted-foreground">Comprobantes Anulados</p>
                </div>
                <Badge variant="destructive">{report608Data.length} registros</Badge>
                <Button 
                  onClick={generate608File} 
                  disabled={report608Data.length === 0}
                  variant="destructive"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar 608
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vista previa de datos */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vista Previa - Formato 607</CardTitle>
            <CardDescription>
              Registros de ventas para {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NCF</TableHead>
                    <TableHead>RNC/Cédula</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">ITBIS</TableHead>
                    <TableHead className="text-right">Ret. ISR</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report607Data.slice(0, 10).map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">
                        <div>
                          <Badge variant="secondary" className="text-xs">{inv.ncf_type}</Badge>
                          <p className="mt-1">{inv.ncf}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {inv.rnc_cedula || inv.clients?.document_number || '-'}
                      </TableCell>
                      <TableCell>{inv.clients?.name}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(inv.issue_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(inv.amount), inv.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(inv.amount) * (inv.tax_rate / 100), inv.currency)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {Number(inv.isr_retention_amount) > 0 
                          ? formatCurrency(Number(inv.isr_retention_amount), inv.currency)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {inv.status === 'paid' ? (
                          <Badge variant="default" className="bg-success/10 text-success border-success/20">Pagada</Badge>
                        ) : inv.status === 'cancelled' ? (
                          <Badge variant="destructive">Anulada</Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {report607Data.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Mostrando 10 de {report607Data.length} registros
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje si no hay datos */}
      {invoices.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Sin datos para mostrar</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Selecciona un período y haz clic en "Cargar Datos" para ver las facturas 
              y generar los reportes fiscales.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Información sobre formatos */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Información sobre los formatos DGII</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li><strong>606:</strong> Reporte de compras - requiere módulo de gastos (próximamente)</li>
              <li><strong>607:</strong> Reporte de ventas con NCF emitidos a clientes</li>
              <li><strong>608:</strong> Reporte de NCF anulados durante el período</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Los archivos generados son compatibles con el sistema de la DGII para carga masiva.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
