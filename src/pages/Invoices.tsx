import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText, Trash2, Loader2, CheckCircle, Printer, Receipt, Download, RotateCcw } from 'lucide-react';
import { useInvoicePdf } from '@/hooks/useInvoicePdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Invoice {
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
  client_id: string;
  currency: string;
  ncf_type: string | null;
  ncf: string | null;
  exchange_rate: number;
  rnc_cedula: string | null;
  isr_retention_rate: number;
  isr_retention_amount: number;
  clients?: { name: string; document_number: string | null };
}

interface Client {
  id: string;
  name: string;
  document_number: string | null;
}

// Tipos de NCF según normativa DGII República Dominicana (incluye e-NCF)
const ncfTypes = [
  { value: 'B01', label: 'B01 - Crédito Fiscal', description: 'Para contribuyentes con RNC', electronic: false },
  { value: 'B02', label: 'B02 - Consumo Final', description: 'Para consumidores finales', electronic: false },
  { value: 'B14', label: 'B14 - Régimen Especial', description: 'Zonas francas y régimen especial', electronic: false },
  { value: 'B15', label: 'B15 - Gubernamental', description: 'Entidades gubernamentales', electronic: false },
  { value: 'B16', label: 'B16 - Exportación', description: 'Exportaciones', electronic: false },
  { value: 'E31', label: 'E31 - e-CF Crédito Fiscal', description: 'Comprobante electrónico para contribuyentes', electronic: true },
  { value: 'E32', label: 'E32 - e-CF Consumo', description: 'Comprobante electrónico consumidor final', electronic: true },
  { value: 'E33', label: 'E33 - e-CF Nota de Débito', description: 'Nota de débito electrónica', electronic: true },
  { value: 'E34', label: 'E34 - e-CF Nota de Crédito', description: 'Nota de crédito electrónica', electronic: true },
  { value: 'E44', label: 'E44 - e-CF Régimen Especial', description: 'Comprobante electrónico zonas francas', electronic: true },
  { value: 'E45', label: 'E45 - e-CF Gubernamental', description: 'Comprobante electrónico gubernamental', electronic: true },
  { value: 'E46', label: 'E46 - e-CF Exportación', description: 'Comprobante electrónico exportación', electronic: true },
];

const currencyOptions = [
  { value: 'DOP', label: 'RD$ - Peso Dominicano', symbol: 'RD$' },
  { value: 'USD', label: 'US$ - Dólar Estadounidense', symbol: 'US$' },
];

// Tasas de ITBIS según normativa dominicana
const itbisOptions = [
  { value: '0', label: '0% - Exento' },
  { value: '16', label: '16% - Reducido' },
  { value: '18', label: '18% - General' },
];

// Tasas de retención ISR según normativa DGII
const isrRetentionOptions = [
  { value: '0', label: '0% - Sin retención' },
  { value: '5', label: '5% - Honorarios profesionales' },
  { value: '10', label: '10% - Otros servicios' },
  { value: '15', label: '15% - Premios' },
  { value: '25', label: '25% - Dividendos' },
  { value: '27', label: '27% - Pagos al exterior' },
];

const statusOptions = [
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'paid', label: 'Pagada', color: 'bg-success/10 text-success border-success/20' },
  { value: 'overdue', label: 'Vencida', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { value: 'cancelled', label: 'Anulada', color: 'bg-muted text-muted-foreground' },
];

export default function Invoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    concept: '',
    amount: '',
    tax_rate: '18',
    client_id: '',
    due_date: '',
    notes: '',
    currency: 'DOP',
    ncf_type: 'B02',
    ncf: '',
    exchange_rate: '1.00',
    rnc_cedula: '',
    isr_retention_rate: '0'
  });
  const [saving, setSaving] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const { generatePdf } = useInvoicePdf();

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      await generatePdf(invoice);
      toast({ title: 'PDF generado', description: `Factura ${invoice.ncf || invoice.invoice_number} descargada` });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error', description: 'No se pudo generar el PDF', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchClients();
    }
  }, [user]);

  // Estado para el contador de NCF
  const [ncfCounters, setNcfCounters] = useState<Record<string, number>>({});

  // Cargar contadores de NCF desde localStorage
  useEffect(() => {
    const savedCounters = localStorage.getItem('ncf_counters');
    if (savedCounters) {
      setNcfCounters(JSON.parse(savedCounters));
    }
  }, []);

  // Generar NCF secuencial basado en el tipo
  const generateNCF = (type: string) => {
    const currentCounter = ncfCounters[type] || 0;
    const nextCounter = currentCounter + 1;
    // Formato: TIPO + 8 dígitos secuenciales (Ej: E3100000001)
    return `${type}${nextCounter.toString().padStart(8, '0')}`;
  };

  // Incrementar y guardar contador al crear factura
  const incrementNcfCounter = (type: string) => {
    const currentCounter = ncfCounters[type] || 0;
    const newCounters = { ...ncfCounters, [type]: currentCounter + 1 };
    setNcfCounters(newCounters);
    localStorage.setItem('ncf_counters', JSON.stringify(newCounters));
  };

  // Resetear contadores de NCF
  const resetNcfCounters = () => {
    if (confirm('¿Está seguro de resetear todos los contadores de NCF? Esta acción no se puede deshacer.')) {
      setNcfCounters({});
      localStorage.removeItem('ncf_counters');
      toast({ title: 'Contadores reseteados', description: 'Todos los contadores de NCF han sido reseteados a 0' });
    }
  };

  useEffect(() => {
    if (formData.ncf_type && !formData.ncf) {
      setFormData(prev => ({ ...prev, ncf: generateNCF(prev.ncf_type) }));
    }
  }, [formData.ncf_type, ncfCounters]);

  // Auto-completar RNC/Cédula cuando se selecciona cliente
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setFormData(prev => ({ 
      ...prev, 
      client_id: clientId,
      rnc_cedula: client?.document_number || ''
    }));
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name, document_number)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name, document_number').eq('status', 'active');
    setClients(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoice_number || !formData.concept || !formData.amount || !formData.client_id) {
      toast({ title: 'Error', description: 'Complete los campos obligatorios', variant: 'destructive' });
      return;
    }

    if (!formData.ncf_type || !formData.ncf) {
      toast({ title: 'Error', description: 'El NCF es obligatorio para facturación electrónica', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(formData.amount);
    const taxRate = parseFloat(formData.tax_rate);
    const isrRetentionRate = parseFloat(formData.isr_retention_rate);
    const itbisAmount = amount * taxRate / 100;
    const isrRetentionAmount = amount * isrRetentionRate / 100;
    const totalAmount = amount + itbisAmount - isrRetentionAmount;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .insert({
          user_id: user!.id,
          invoice_number: formData.invoice_number,
          concept: formData.concept,
          amount,
          tax_rate: taxRate,
          total_amount: totalAmount,
          client_id: formData.client_id,
          due_date: formData.due_date || null,
          notes: formData.notes || null,
          currency: formData.currency,
          ncf_type: formData.ncf_type,
          ncf: formData.ncf,
          exchange_rate: parseFloat(formData.exchange_rate),
          rnc_cedula: formData.rnc_cedula || null,
          isr_retention_rate: isrRetentionRate,
          isr_retention_amount: isrRetentionAmount
        });

      if (error) throw error;
      incrementNcfCounter(formData.ncf_type);
      toast({ title: 'Factura electrónica creada', description: `NCF: ${formData.ncf}` });
      setIsDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Factura marcada como pagada' });
      fetchInvoices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Anular esta factura? Las facturas electrónicas no pueden eliminarse, solo anularse.')) return;
    
    try {
      // En facturación electrónica no se eliminan, se anulan
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Factura anulada' });
      fetchInvoices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    const defaultNcfType = 'E32';
    setFormData({
      invoice_number: '',
      concept: '',
      amount: '',
      tax_rate: '18',
      client_id: '',
      due_date: '',
      notes: '',
      currency: 'DOP',
      ncf_type: defaultNcfType,
      ncf: generateNCF(defaultNcfType),
      exchange_rate: '1.00',
      rnc_cedula: '',
      isr_retention_rate: '0'
    });
  };

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = 
      i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.clients?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.ncf?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCurrency = currencyFilter === 'all' || i.currency === currencyFilter;
    
    return matchesSearch && matchesCurrency;
  });

  const formatCurrency = (amount: number, currency: string = 'DOP') => {
    const symbol = currency === 'USD' ? 'US$' : 'RD$';
    return `${symbol} ${new Intl.NumberFormat('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`;
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return (
      <Badge variant="outline" className={option?.color || ''}>
        {option?.label || status}
      </Badge>
    );
  };

  const getNcfTypeBadge = (ncfType: string | null) => {
    if (!ncfType) return null;
    const type = ncfTypes.find(t => t.value === ncfType);
    const isElectronic = ncfType.startsWith('E');
    return (
      <Badge 
        variant="secondary" 
        className={`text-xs ${isElectronic ? 'bg-success/20 text-success border-success/30' : ''}`}
      >
        {isElectronic && '⚡'} {type?.value || ncfType}
      </Badge>
    );
  };

  // Calcular totales por moneda
  const totalsByMoney = {
    DOP: {
      pending: invoices.filter(i => i.status === 'pending' && i.currency === 'DOP').reduce((sum, i) => sum + Number(i.total_amount), 0),
      paid: invoices.filter(i => i.status === 'paid' && i.currency === 'DOP').reduce((sum, i) => sum + Number(i.total_amount), 0),
    },
    USD: {
      pending: invoices.filter(i => i.status === 'pending' && i.currency === 'USD').reduce((sum, i) => sum + Number(i.total_amount), 0),
      paid: invoices.filter(i => i.status === 'paid' && i.currency === 'USD').reduce((sum, i) => sum + Number(i.total_amount), 0),
    }
  };

  return (
    <AppLayout title="Facturación Electrónica">
      <div className="space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Pendiente RD$</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(totalsByMoney.DOP.pending, 'DOP')}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Pendiente US$</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(totalsByMoney.USD.pending, 'USD')}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Cobrado RD$</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(totalsByMoney.DOP.paid, 'DOP')}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Cobrado US$</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(totalsByMoney.USD.paid, 'USD')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por NCF, cliente, concepto..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="DOP">RD$ Pesos</SelectItem>
                <SelectItem value="USD">US$ Dólares</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={resetNcfCounters}
              title="Resetear contadores NCF"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="h-4 w-4" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Nueva Factura Electrónica (e-CF)
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Sección NCF */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold text-sm mb-3 text-primary">Comprobante Fiscal (DGII)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ncf_type">Tipo de NCF *</Label>
                      <Select 
                        value={formData.ncf_type} 
                        onValueChange={(v) => setFormData({ ...formData, ncf_type: v, ncf: generateNCF(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {ncfTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ncf">NCF *</Label>
                      <Input
                        id="ncf"
                        value={formData.ncf}
                        onChange={(e) => setFormData({ ...formData, ncf: e.target.value })}
                        placeholder="Ej: B0200000001"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Datos básicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_number">Nº Factura Interno *</Label>
                    <Input
                      id="invoice_number"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Select value={formData.client_id} onValueChange={handleClientChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rnc_cedula">RNC/Cédula del Cliente</Label>
                  <Input
                    id="rnc_cedula"
                    value={formData.rnc_cedula}
                    onChange={(e) => setFormData({ ...formData, rnc_cedula: e.target.value })}
                    placeholder="RNC o Cédula"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concept">Concepto *</Label>
                  <Input
                    id="concept"
                    value={formData.concept}
                    onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                    placeholder="Honorarios profesionales por servicios legales..."
                  />
                </div>

                {/* Moneda y Montos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda *</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto Base *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="1000.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">ITBIS</Label>
                    <Select value={formData.tax_rate} onValueChange={(v) => setFormData({ ...formData, tax_rate: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {itbisOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Retención ISR */}
                <div className="space-y-2">
                  <Label htmlFor="isr_retention_rate">Retención ISR</Label>
                  <Select value={formData.isr_retention_rate} onValueChange={(v) => setFormData({ ...formData, isr_retention_rate: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isrRetentionOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.currency === 'USD' && (
                  <div className="space-y-2">
                    <Label htmlFor="exchange_rate">Tasa de Cambio (1 USD = X DOP)</Label>
                    <Input
                      id="exchange_rate"
                      type="number"
                      step="0.01"
                      value={formData.exchange_rate}
                      onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                      placeholder="58.50"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas / Condiciones</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Condiciones de pago, notas adicionales..."
                    rows={2}
                  />
                </div>

                {/* Resumen de factura */}
                {formData.amount && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-semibold text-sm mb-3">Resumen de Factura</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Base imponible:</span>
                        <span>{formatCurrency(parseFloat(formData.amount) || 0, formData.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ITBIS ({formData.tax_rate}%):</span>
                        <span>+{formatCurrency((parseFloat(formData.amount) || 0) * parseFloat(formData.tax_rate) / 100, formData.currency)}</span>
                      </div>
                      {parseFloat(formData.isr_retention_rate) > 0 && (
                        <div className="flex justify-between text-destructive">
                          <span>Retención ISR ({formData.isr_retention_rate}%):</span>
                          <span>-{formatCurrency((parseFloat(formData.amount) || 0) * parseFloat(formData.isr_retention_rate) / 100, formData.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Total a Pagar:</span>
                        <span>{formatCurrency(
                          (parseFloat(formData.amount) || 0) * (1 + parseFloat(formData.tax_rate) / 100) - 
                          (parseFloat(formData.amount) || 0) * parseFloat(formData.isr_retention_rate) / 100, 
                          formData.currency
                        )}</span>
                      </div>
                      {formData.currency === 'USD' && formData.exchange_rate && (
                        <div className="flex justify-between text-muted-foreground pt-2 border-t">
                          <span>Equivalente en RD$:</span>
                          <span>{formatCurrency(
                            ((parseFloat(formData.amount) || 0) * (1 + parseFloat(formData.tax_rate) / 100) - 
                            (parseFloat(formData.amount) || 0) * parseFloat(formData.isr_retention_rate) / 100) * 
                            parseFloat(formData.exchange_rate), 
                            'DOP'
                          )}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Crear Factura
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info sobre facturación electrónica */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Receipt className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Sistema de Facturación Electrónica (e-CF) - DGII</p>
              <p className="text-xs text-muted-foreground mt-1">
                Conforme a la normativa de la Dirección General de Impuestos Internos de República Dominicana. 
                Incluye NCF, RNC/Cédula e ITBIS. Las facturas anuladas quedan registradas en el sistema.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay facturas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NCF</TableHead>
                    <TableHead>Nº Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className={invoice.status === 'cancelled' ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="space-y-1">
                          {getNcfTypeBadge(invoice.ncf_type)}
                          <p className="text-xs font-mono text-muted-foreground">{invoice.ncf || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <p>{invoice.clients?.name}</p>
                          {invoice.rnc_cedula && (
                            <p className="text-xs text-muted-foreground">RNC: {invoice.rnc_cedula}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{invoice.concept}</TableCell>
                      <TableCell className="text-right font-medium">
                        <div>
                          <p>{formatCurrency(Number(invoice.total_amount), invoice.currency)}</p>
                          {invoice.currency === 'USD' && invoice.exchange_rate > 1 && (
                            <p className="text-xs text-muted-foreground">
                              ≈ {formatCurrency(Number(invoice.total_amount) * invoice.exchange_rate, 'DOP')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(invoice.issue_date), 'd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDownloadPdf(invoice)} 
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4 text-primary" />
                          </Button>
                          {invoice.status === 'pending' && (
                            <Button variant="ghost" size="icon" onClick={() => handleMarkPaid(invoice.id)} title="Marcar como pagada">
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          {invoice.status !== 'cancelled' && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(invoice.id)} title="Anular factura">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}