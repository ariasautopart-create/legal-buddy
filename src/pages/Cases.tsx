import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Briefcase, Edit, Trash2, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  case_type: string;
  court: string | null;
  judge: string | null;
  status: string;
  priority: string;
  start_date: string;
  client_id: string;
  clients?: { name: string };
}

interface Client {
  id: string;
  name: string;
}

const caseTypes = [
  'Civil', 'Penal', 'Laboral', 'Mercantil', 'Administrativo', 'Familia', 'Otro'
];

const statusOptions = [
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'closed', label: 'Cerrado' },
];

const priorityOptions = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

export default function Cases() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    case_number: '',
    title: '',
    description: '',
    case_type: 'Civil',
    court: '',
    judge: '',
    status: 'open',
    priority: 'medium',
    client_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCases();
      fetchClients();
    }
  }, [user]);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
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
    if (!formData.title.trim() || !formData.client_id || !formData.case_number) {
      toast({ title: 'Error', description: 'Complete los campos obligatorios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingCase) {
        const { error } = await supabase
          .from('cases')
          .update({
            case_number: formData.case_number,
            title: formData.title,
            description: formData.description || null,
            case_type: formData.case_type,
            court: formData.court || null,
            judge: formData.judge || null,
            status: formData.status,
            priority: formData.priority,
            client_id: formData.client_id
          })
          .eq('id', editingCase.id);

        if (error) throw error;
        toast({ title: 'Caso actualizado' });
      } else {
        const { error } = await supabase
          .from('cases')
          .insert({
            user_id: user!.id,
            case_number: formData.case_number,
            title: formData.title,
            description: formData.description || null,
            case_type: formData.case_type,
            court: formData.court || null,
            judge: formData.judge || null,
            status: formData.status,
            priority: formData.priority,
            client_id: formData.client_id
          });

        if (error) throw error;
        toast({ title: 'Caso creado' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCases();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (caseItem: Case) => {
    setEditingCase(caseItem);
    setFormData({
      case_number: caseItem.case_number,
      title: caseItem.title,
      description: caseItem.description || '',
      case_type: caseItem.case_type,
      court: caseItem.court || '',
      judge: caseItem.judge || '',
      status: caseItem.status,
      priority: caseItem.priority,
      client_id: caseItem.client_id
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este caso?')) return;
    
    try {
      const { error } = await supabase.from('cases').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Caso eliminado' });
      fetchCases();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingCase(null);
    setFormData({
      case_number: '',
      title: '',
      description: '',
      case_type: 'Civil',
      court: '',
      judge: '',
      status: 'open',
      priority: 'medium',
      client_id: ''
    });
  };

  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.case_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-info/10 text-info border-info/20',
      in_progress: 'bg-warning/10 text-warning border-warning/20',
      pending: 'bg-muted text-muted-foreground',
      closed: 'bg-success/10 text-success border-success/20',
    };
    const labels: Record<string, string> = {
      open: 'Abierto',
      in_progress: 'En Progreso',
      pending: 'Pendiente',
      closed: 'Cerrado',
    };
    return <Badge variant="outline" className={styles[status]}>{labels[status]}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: 'bg-destructive/10 text-destructive border-destructive/20',
      medium: 'bg-warning/10 text-warning border-warning/20',
      low: 'bg-success/10 text-success border-success/20',
    };
    const labels: Record<string, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return <Badge variant="outline" className={styles[priority]}>{labels[priority]}</Badge>;
  };

  return (
    <AppLayout title="Casos Legales">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar casos..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Caso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingCase ? 'Editar Caso' : 'Nuevo Caso'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="case_number">Número de Caso *</Label>
                    <Input
                      id="case_number"
                      value={formData.case_number}
                      onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                      placeholder="2024/001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Título del caso"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case_type">Tipo de Caso</Label>
                    <Select value={formData.case_type} onValueChange={(v) => setFormData({ ...formData, case_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {caseTypes.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="court">Juzgado</Label>
                    <Input
                      id="court"
                      value={formData.court}
                      onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                      placeholder="Juzgado de Primera Instancia"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="judge">Juez</Label>
                    <Input
                      id="judge"
                      value={formData.judge}
                      onChange={(e) => setFormData({ ...formData, judge: e.target.value })}
                      placeholder="Nombre del juez"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción del caso..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingCase ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay casos registrados</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCases.map((caseItem) => (
              <Card key={caseItem.id} className="shadow-card hover:shadow-elegant transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-lg font-semibold">{caseItem.title}</h3>
                        {getStatusBadge(caseItem.status)}
                        {getPriorityBadge(caseItem.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {caseItem.case_number} • {caseItem.case_type} • {caseItem.clients?.name}
                      </p>
                      {caseItem.court && (
                        <p className="text-sm text-muted-foreground">
                          Juzgado: {caseItem.court} {caseItem.judge && `• Juez: ${caseItem.judge}`}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Inicio: {format(new Date(caseItem.start_date), "d 'de' MMMM, yyyy", { locale: es })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(caseItem)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(caseItem.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
