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
import { Plus, Search, FileText, Edit, Trash2, Loader2, CheckCircle } from 'lucide-react';
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
  clients?: { name: string };
}

interface Client {
  id: string;
  name: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'paid', label: 'Pagada', color: 'bg-success/10 text-success border-success/20' },
  { value: 'overdue', label: 'Vencida', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-muted text-muted-foreground' },
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
    tax_rate: '21',
    client_id: '',
    due_date: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchClients();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name)')
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
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active');
    setClients(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoice_number || !formData.concept || !formData.amount || !formData.client_id) {
      toast({ title: 'Error', description: 'Complete los campos obligatorios', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(formData.amount);
    const taxRate = parseFloat(formData.tax_rate);
    const totalAmount = amount + (amount * taxRate / 100);

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
          notes: formData.notes || null
        });

      if (error) throw error;
      toast({ title: 'Factura creada' });
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
    if (!confirm('¿Eliminar esta factura?')) return;
    
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Factura eliminada' });
      fetchInvoices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      concept: '',
      amount: '',
      tax_rate: '21',
      client_id: '',
      due_date: '',
      notes: ''
    });
  };

  const filteredInvoices = invoices.filter(i => 
    i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.clients?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return (
      <Badge variant="outline" className={option?.color || ''}>
        {option?.label || status}
      </Badge>
    );
  };

  const totalPending = invoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + Number(i.total_amount), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.total_amount), 0);

  return (
    <AppLayout title="Facturación">
      <div className="space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Pendiente de cobro</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(totalPending)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Cobrado este mes</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total facturas</p>
              <p className="text-2xl font-display font-bold text-foreground">{invoices.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar facturas..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="h-4 w-4" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Nueva Factura</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_number">Nº Factura *</Label>
                    <Input
                      id="invoice_number"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
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
                  <Label htmlFor="concept">Concepto *</Label>
                  <Input
                    id="concept"
                    value={formData.concept}
                    onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                    placeholder="Honorarios profesionales..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Importe Base (€) *</Label>
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
                    <Label htmlFor="tax_rate">IVA (%)</Label>
                    <Select value={formData.tax_rate} onValueChange={(v) => setFormData({ ...formData, tax_rate: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Fecha de vencimiento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={2}
                  />
                </div>
                {formData.amount && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Base imponible:</span>
                      <span>{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IVA ({formData.tax_rate}%):</span>
                      <span>{formatCurrency((parseFloat(formData.amount) || 0) * parseFloat(formData.tax_rate) / 100)}</span>
                    </div>
                    <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency((parseFloat(formData.amount) || 0) * (1 + parseFloat(formData.tax_rate) / 100))}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Crear
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.clients?.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{invoice.concept}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(invoice.total_amount))}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(invoice.issue_date), 'd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {invoice.status === 'pending' && (
                            <Button variant="ghost" size="icon" onClick={() => handleMarkPaid(invoice.id)} title="Marcar como pagada">
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(invoice.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
