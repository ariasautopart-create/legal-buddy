import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Edit,
  User,
  BadgeCheck,
  Download,
  Upload,
  FileSpreadsheet,
  FileDown,
  Stamp,
  Building,
  Filter,
  X
} from 'lucide-react';
import { useNotaryExport } from '@/hooks/useNotaryExport';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface NotaryContact {
  id: string;
  name: string;
  license_number: string | null;
  notary_type: string | null;
  jurisdiction: string | null;
  office_name: string | null;
  address: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  website: string | null;
  schedule: string | null;
  specializations: string[] | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

const NOTARY_TYPES = [
  { value: 'publico', label: 'Notario Público' },
  { value: 'de_fe_publica', label: 'Notario de Fe Pública' },
];

const JURISDICTIONS = [
  'Distrito Nacional',
  'Santo Domingo Este',
  'Santo Domingo Norte',
  'Santo Domingo Oeste',
  'Santiago',
  'La Vega',
  'San Cristóbal',
  'Puerto Plata',
  'San Pedro de Macorís',
  'La Romana',
  'San Francisco de Macorís',
  'Higüey',
  'Moca',
  'Bonao',
  'Baní',
  'Azua',
  'San Juan de la Maguana',
  'Barahona',
  'Mao',
  'Nagua',
  'Monte Cristi',
  'Cotuí',
  'El Seibo',
  'Samaná',
  'Neiba',
  'Dajabón',
  'Salcedo',
  'Monte Plata',
  'Hato Mayor',
  'Pedernales',
  'Jimani',
  'Comendador',
];

const SPECIALIZATIONS = [
  { value: 'inmobiliario', label: 'Inmobiliario' },
  { value: 'comercial', label: 'Comercial/Societario' },
  { value: 'familia', label: 'Derecho de Familia' },
  { value: 'sucesiones', label: 'Sucesiones/Testamentos' },
  { value: 'contratos', label: 'Contratos Generales' },
  { value: 'poderes', label: 'Poderes/Mandatos' },
  { value: 'autenticaciones', label: 'Autenticaciones' },
  { value: 'actas', label: 'Actas Notariales' },
];

const getNotaryTypeLabel = (type: string) => {
  return NOTARY_TYPES.find(t => t.value === type)?.label || type;
};

interface NotaryDirectoryProps {
  searchTerm: string;
}

export default function NotaryDirectory({ searchTerm }: NotaryDirectoryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    exportNotariesToExcel,
    exportNotariesToCSV,
    parseNotaryFile,
    downloadNotaryTemplate,
  } = useNotaryExport();
  
  const [notaries, setNotaries] = useState<NotaryContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotary, setEditingNotary] = useState<NotaryContact | null>(null);
  const [deleteNotary, setDeleteNotary] = useState<NotaryContact | null>(null);

  // Filters state
  const [filters, setFilters] = useState({
    type: '',
    jurisdiction: '',
    specialization: '',
    status: '',
  });

  const [form, setForm] = useState({
    name: '',
    license_number: '',
    notary_type: 'publico',
    jurisdiction: '',
    office_name: '',
    address: '',
    phone: '',
    phone_secondary: '',
    email: '',
    website: '',
    schedule: '',
    specializations: [] as string[],
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      fetchNotaries();
    }
  }, [user]);

  const fetchNotaries = async () => {
    try {
      const { data, error } = await supabase
        .from('notary_directory')
        .select('*')
        .order('name');

      if (error) throw error;
      setNotaries(data || []);
    } catch (error: any) {
      console.error('Error fetching notaries:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los notarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingNotary) {
        const { error } = await supabase
          .from('notary_directory')
          .update({
            name: form.name,
            license_number: form.license_number || null,
            notary_type: form.notary_type,
            jurisdiction: form.jurisdiction || null,
            office_name: form.office_name || null,
            address: form.address || null,
            phone: form.phone || null,
            phone_secondary: form.phone_secondary || null,
            email: form.email || null,
            website: form.website || null,
            schedule: form.schedule || null,
            specializations: form.specializations.length > 0 ? form.specializations : null,
            status: form.status,
            notes: form.notes || null,
          })
          .eq('id', editingNotary.id);

        if (error) throw error;
        toast({ title: 'Notario actualizado correctamente' });
      } else {
        const { error } = await supabase.from('notary_directory').insert({
          user_id: user.id,
          name: form.name,
          license_number: form.license_number || null,
          notary_type: form.notary_type,
          jurisdiction: form.jurisdiction || null,
          office_name: form.office_name || null,
          address: form.address || null,
          phone: form.phone || null,
          phone_secondary: form.phone_secondary || null,
          email: form.email || null,
          website: form.website || null,
          schedule: form.schedule || null,
          specializations: form.specializations.length > 0 ? form.specializations : null,
          status: form.status,
          notes: form.notes || null,
        });

        if (error) throw error;
        toast({ title: 'Notario agregado correctamente' });
      }

      setIsDialogOpen(false);
      setEditingNotary(null);
      resetForm();
      fetchNotaries();
    } catch (error: any) {
      console.error('Error saving notary:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el notario',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteNotary) return;

    try {
      const { error } = await supabase
        .from('notary_directory')
        .delete()
        .eq('id', deleteNotary.id);

      if (error) throw error;
      toast({ title: 'Notario eliminado correctamente' });
      setDeleteNotary(null);
      fetchNotaries();
    } catch (error: any) {
      console.error('Error deleting notary:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el notario',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      license_number: '',
      notary_type: 'publico',
      jurisdiction: '',
      office_name: '',
      address: '',
      phone: '',
      phone_secondary: '',
      email: '',
      website: '',
      schedule: '',
      specializations: [],
      status: 'active',
      notes: '',
    });
  };

  const openEdit = (notary: NotaryContact) => {
    setEditingNotary(notary);
    setForm({
      name: notary.name,
      license_number: notary.license_number || '',
      notary_type: notary.notary_type || 'publico',
      jurisdiction: notary.jurisdiction || '',
      office_name: notary.office_name || '',
      address: notary.address || '',
      phone: notary.phone || '',
      phone_secondary: notary.phone_secondary || '',
      email: notary.email || '',
      website: notary.website || '',
      schedule: notary.schedule || '',
      specializations: notary.specializations || [],
      status: notary.status || 'active',
      notes: notary.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    try {
      const notariesData = await parseNotaryFile(file);
      
      if (notariesData.length === 0) {
        toast({
          title: 'Archivo vacío',
          description: 'No se encontraron notarios en el archivo',
          variant: 'destructive',
        });
        return;
      }

      const notariesToInsert = notariesData.map(notary => ({
        user_id: user.id,
        name: notary.name || '',
        license_number: notary.license_number || null,
        notary_type: notary.notary_type || 'publico',
        jurisdiction: notary.jurisdiction || null,
        office_name: notary.office_name || null,
        address: notary.address || null,
        phone: notary.phone || null,
        phone_secondary: notary.phone_secondary || null,
        email: notary.email || null,
        website: notary.website || null,
        schedule: notary.schedule || null,
        specializations: notary.specializations || null,
        status: notary.status || 'active',
        notes: notary.notes || null,
      }));

      const { error } = await supabase.from('notary_directory').insert(notariesToInsert);

      if (error) throw error;

      toast({
        title: 'Importación exitosa',
        description: `Se importaron ${notariesData.length} notarios`,
      });
      fetchNotaries();
    } catch (error: any) {
      console.error('Error importing notaries:', error);
      toast({
        title: 'Error al importar',
        description: error.message || 'No se pudo importar el archivo',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const toggleSpecialization = (spec: string) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const filteredNotaries = notaries.filter(notary => {
    const matchesSearch = notary.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notary.jurisdiction?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notary.office_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notary.license_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filters.type || notary.notary_type === filters.type;
    const matchesJurisdiction = !filters.jurisdiction || notary.jurisdiction === filters.jurisdiction;
    const matchesSpecialization = !filters.specialization || notary.specializations?.includes(filters.specialization);
    const matchesStatus = !filters.status || notary.status === filters.status;
    return matchesSearch && matchesType && matchesJurisdiction && matchesSpecialization && matchesStatus;
  });

  const activeFiltersCount = Object.values(filters).filter(v => v).length;
  const clearFilters = () => setFilters({ type: '', jurisdiction: '', specialization: '', status: '' });

  const getSpecLabel = (spec: string) => {
    return SPECIALIZATIONS.find(s => s.value === spec)?.label || spec;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Cargando notarios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-popover" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtros</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tipo de Notario</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los tipos</SelectItem>
                    {NOTARY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jurisdicción</Label>
                <Select
                  value={filters.jurisdiction}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, jurisdiction: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las jurisdicciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las jurisdicciones</SelectItem>
                    {JURISDICTIONS.map((jur) => (
                      <SelectItem key={jur} value={jur}>
                        {jur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Especialidad</Label>
                <Select
                  value={filters.specialization}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, specialization: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las especialidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las especialidades</SelectItem>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec.value} value={spec.value}>
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los estados</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Active filters badges */}
        {filters.type && (
          <Badge variant="secondary" className="gap-1">
            {getNotaryTypeLabel(filters.type)}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => setFilters(prev => ({ ...prev, type: '' }))}
            />
          </Badge>
        )}
        {filters.jurisdiction && (
          <Badge variant="secondary" className="gap-1">
            {filters.jurisdiction}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => setFilters(prev => ({ ...prev, jurisdiction: '' }))}
            />
          </Badge>
        )}
        {filters.specialization && (
          <Badge variant="secondary" className="gap-1">
            {getSpecLabel(filters.specialization)}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => setFilters(prev => ({ ...prev, specialization: '' }))}
            />
          </Badge>
        )}
        {filters.status && (
          <Badge variant="secondary" className="gap-1">
            {filters.status === 'active' ? 'Activo' : 'Inactivo'}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
            />
          </Badge>
        )}
        
        <div className="flex-1" />
        
        {/* Import/Export and Add buttons */}
        {/* Import/Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Importar/Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportNotariesToExcel(notaries)}>
              <Download className="h-4 w-4 mr-2" />
              Exportar a Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportNotariesToCSV(notaries)}>
              <Download className="h-4 w-4 mr-2" />
              Exportar a CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <label className="cursor-pointer flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Importar desde archivo
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                  disabled={importing}
                />
              </label>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={downloadNotaryTemplate}>
              <FileDown className="h-4 w-4 mr-2" />
              Descargar plantilla
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingNotary(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar Notario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNotary ? 'Editar Notario' : 'Agregar Notario'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_number">No. Colegiatura/Matrícula</Label>
                  <Input
                    id="license_number"
                    value={form.license_number}
                    onChange={(e) => setForm(prev => ({ ...prev, license_number: e.target.value }))}
                    placeholder="NOT-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notary_type">Tipo de Notario</Label>
                  <Select
                    value={form.notary_type}
                    onValueChange={(value) => setForm(prev => ({ ...prev, notary_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTARY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jurisdiction">Jurisdicción</Label>
                  <Select
                    value={form.jurisdiction}
                    onValueChange={(value) => setForm(prev => ({ ...prev, jurisdiction: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar jurisdicción" />
                    </SelectTrigger>
                    <SelectContent>
                      {JURISDICTIONS.map((jur) => (
                        <SelectItem key={jur} value={jur}>
                          {jur}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="office_name">Nombre de la Notaría</Label>
                  <Input
                    id="office_name"
                    value={form.office_name}
                    onChange={(e) => setForm(prev => ({ ...prev, office_name: e.target.value }))}
                    placeholder="Notaría Pérez & Asociados"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono Principal</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="809-555-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_secondary">Teléfono Secundario</Label>
                  <Input
                    id="phone_secondary"
                    value={form.phone_secondary}
                    onChange={(e) => setForm(prev => ({ ...prev, phone_secondary: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://notariaperez.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="schedule">Horario de Atención</Label>
                  <Input
                    id="schedule"
                    value={form.schedule}
                    onChange={(e) => setForm(prev => ({ ...prev, schedule: e.target.value }))}
                    placeholder="Lunes a Viernes 8:00 AM - 5:00 PM"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Especialidades</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map((spec) => (
                      <Badge
                        key={spec.value}
                        variant={form.specializations.includes(spec.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleSpecialization(spec.value)}
                      >
                        {spec.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingNotary ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notaries List */}
      {filteredNotaries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Stamp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay notarios registrados</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'Agrega tu primer notario al directorio.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotaries.map((notary) => (
            <Card key={notary.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Stamp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{notary.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getNotaryTypeLabel(notary.notary_type || 'publico')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(notary)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteNotary(notary)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {notary.license_number && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BadgeCheck className="h-4 w-4" />
                    <span>{notary.license_number}</span>
                  </div>
                )}
                {notary.office_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>{notary.office_name}</span>
                  </div>
                )}
                {notary.jurisdiction && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{notary.jurisdiction}</span>
                  </div>
                )}
                {notary.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{notary.phone}</span>
                  </div>
                )}
                {notary.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{notary.email}</span>
                  </div>
                )}
                {notary.schedule && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{notary.schedule}</span>
                  </div>
                )}
                {notary.specializations && notary.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {notary.specializations.slice(0, 3).map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {SPECIALIZATIONS.find(s => s.value === spec)?.label || spec}
                      </Badge>
                    ))}
                    {notary.specializations.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{notary.specializations.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                {notary.status === 'inactive' && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Inactivo
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteNotary} onOpenChange={() => setDeleteNotary(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar notario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente "{deleteNotary?.name}" del directorio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
