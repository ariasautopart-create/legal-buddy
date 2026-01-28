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
import { Plus, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  deadline_date: string;
  reminder_days: number;
  status: string;
  priority: string;
  case_id: string;
  cases?: { title: string; case_number: string };
}

interface Case {
  id: string;
  title: string;
  case_number: string;
}

export default function Deadlines() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline_date: '',
    reminder_days: '3',
    priority: 'high',
    case_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDeadlines();
      fetchCases();
    }
  }, [user]);

  const fetchDeadlines = async () => {
    try {
      const { data, error } = await supabase
        .from('deadlines')
        .select('*, cases(title, case_number)')
        .order('deadline_date', { ascending: true });

      if (error) throw error;
      setDeadlines(data || []);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    const { data } = await supabase.from('cases').select('id, title, case_number').neq('status', 'closed');
    setCases(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.case_id || !formData.deadline_date) {
      toast({ title: 'Error', description: 'Complete los campos obligatorios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('deadlines')
        .insert({
          user_id: user!.id,
          title: formData.title,
          description: formData.description || null,
          deadline_date: new Date(formData.deadline_date).toISOString(),
          reminder_days: parseInt(formData.reminder_days),
          priority: formData.priority,
          case_id: formData.case_id
        });

      if (error) throw error;
      toast({ title: 'Plazo creado' });
      setIsDialogOpen(false);
      resetForm();
      fetchDeadlines();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deadlines')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Plazo completado' });
      fetchDeadlines();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      deadline_date: '',
      reminder_days: '3',
      priority: 'high',
      case_id: ''
    });
  };

  const getDeadlineStatus = (date: string, status: string) => {
    if (status === 'completed') {
      return { icon: CheckCircle, label: 'Completado', className: 'bg-success/10 text-success border-success/20' };
    }
    const deadlineDate = new Date(date);
    const daysUntil = differenceInDays(deadlineDate, new Date());
    
    if (isPast(deadlineDate)) {
      return { icon: AlertTriangle, label: 'Vencido', className: 'bg-destructive/10 text-destructive border-destructive/20' };
    }
    if (daysUntil <= 3) {
      return { icon: AlertTriangle, label: `${daysUntil} días`, className: 'bg-destructive/10 text-destructive border-destructive/20' };
    }
    if (daysUntil <= 7) {
      return { icon: Clock, label: `${daysUntil} días`, className: 'bg-warning/10 text-warning border-warning/20' };
    }
    return { icon: Clock, label: `${daysUntil} días`, className: 'bg-success/10 text-success border-success/20' };
  };

  const pendingDeadlines = deadlines.filter(d => d.status === 'pending');
  const completedDeadlines = deadlines.filter(d => d.status === 'completed');

  return (
    <AppLayout title="Plazos Legales">
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Plazo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Nuevo Plazo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="case">Caso *</Label>
                  <Select value={formData.case_id} onValueChange={(v) => setFormData({ ...formData, case_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar caso" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.case_number} - {c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Presentación de demanda"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deadline_date">Fecha límite *</Label>
                    <Input
                      id="deadline_date"
                      type="datetime-local"
                      value={formData.deadline_date}
                      onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="low">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder">Recordatorio (días antes)</Label>
                  <Select value={formData.reminder_days} onValueChange={(v) => setFormData({ ...formData, reminder_days: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 día</SelectItem>
                      <SelectItem value="3">3 días</SelectItem>
                      <SelectItem value="7">7 días</SelectItem>
                      <SelectItem value="14">14 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalles del plazo..."
                    rows={3}
                  />
                </div>
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : deadlines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay plazos registrados</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Plazos Pendientes ({pendingDeadlines.length})
              </h2>
              <div className="grid gap-4">
                {pendingDeadlines.map((deadline) => {
                  const status = getDeadlineStatus(deadline.deadline_date, deadline.status);
                  const StatusIcon = status.icon;
                  
                  return (
                    <Card key={deadline.id} className="shadow-card hover:shadow-elegant transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${status.className}`}>
                              <StatusIcon className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-medium">{deadline.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {deadline.cases?.case_number} - {deadline.cases?.title}
                              </p>
                              <p className="text-sm font-medium">
                                {format(new Date(deadline.deadline_date), "EEEE, d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                              </p>
                              {deadline.description && (
                                <p className="text-sm text-muted-foreground">{deadline.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={status.className}>
                              {status.label}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleComplete(deadline.id)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Completar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {completedDeadlines.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-5 w-5" />
                  Completados ({completedDeadlines.length})
                </h2>
                <div className="grid gap-4 opacity-75">
                  {completedDeadlines.slice(0, 5).map((deadline) => (
                    <Card key={deadline.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success" />
                            <div>
                              <p className="font-medium line-through">{deadline.title}</p>
                              <p className="text-sm text-muted-foreground">{deadline.cases?.case_number}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            Completado
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
