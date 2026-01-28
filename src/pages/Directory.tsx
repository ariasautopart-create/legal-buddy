import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Trash2, 
  Building2,
  Users,
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
  Filter,
  X
} from 'lucide-react';
import { useDirectoryExport } from '@/hooks/useDirectoryExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import NotaryDirectory from '@/components/directory/NotaryDirectory';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CourtContact {
  id: string;
  name: string;
  court_type: string;
  jurisdiction: string | null;
  department: string | null;
  address: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  website: string | null;
  schedule: string | null;
  notes: string | null;
  created_at: string;
}

interface BailiffContact {
  id: string;
  name: string;
  license_number: string | null;
  court_assigned: string | null;
  jurisdiction: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  address: string | null;
  specialization: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

const COURT_TYPES = [
  { value: 'suprema_corte', label: 'Suprema Corte de Justicia' },
  { value: 'tribunal_constitucional', label: 'Tribunal Constitucional' },
  { value: 'corte_apelacion', label: 'Corte de Apelación' },
  { value: 'primera_instancia', label: 'Tribunal de Primera Instancia' },
  { value: 'juzgado_paz', label: 'Juzgado de Paz' },
  { value: 'tribunal_laboral', label: 'Tribunal de Trabajo' },
  { value: 'tribunal_nna', label: 'Tribunal de NNA' },
  { value: 'tribunal_tierras', label: 'Tribunal de Tierras' },
  { value: 'tribunal_superior_tierras', label: 'Tribunal Superior de Tierras' },
  { value: 'tribunal_contencioso', label: 'Tribunal Contencioso Administrativo' },
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
  { value: 'civil', label: 'Civil' },
  { value: 'penal', label: 'Penal' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'familia', label: 'Familia/NNA' },
  { value: 'tierras', label: 'Tierras' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'general', label: 'General' },
];

const getCourtTypeLabel = (type: string) => {
  return COURT_TYPES.find(t => t.value === type)?.label || type;
};

const getSpecializationLabel = (spec: string) => {
  return SPECIALIZATIONS.find(s => s.value === spec)?.label || spec;
};

export default function Directory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    exportCourtsToExcel,
    exportCourtsToCSV,
    exportBailiffsToExcel,
    exportBailiffsToCSV,
    parseCourtFile,
    parseBailiffFile,
    downloadCourtTemplate,
    downloadBailiffTemplate,
  } = useDirectoryExport();
  
  const [activeTab, setActiveTab] = useState('courts');
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  
  // Filters state
  const [courtFilters, setCourtFilters] = useState({
    type: '',
    jurisdiction: '',
  });
  const [bailiffFilters, setBailiffFilters] = useState({
    jurisdiction: '',
    specialization: '',
    status: '',
  });
  // Courts state
  const [courts, setCourts] = useState<CourtContact[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [isCourtDialogOpen, setIsCourtDialogOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<CourtContact | null>(null);
  const [deleteCourt, setDeleteCourt] = useState<CourtContact | null>(null);
  
  // Bailiffs state
  const [bailiffs, setBailiffs] = useState<BailiffContact[]>([]);
  const [loadingBailiffs, setLoadingBailiffs] = useState(true);
  const [isBailiffDialogOpen, setIsBailiffDialogOpen] = useState(false);
  const [editingBailiff, setEditingBailiff] = useState<BailiffContact | null>(null);
  const [deleteBailiff, setDeleteBailiff] = useState<BailiffContact | null>(null);

  // Court form state
  const [courtForm, setCourtForm] = useState({
    name: '',
    court_type: 'primera_instancia',
    jurisdiction: '',
    department: '',
    address: '',
    phone: '',
    phone_secondary: '',
    email: '',
    website: '',
    schedule: '',
    notes: '',
  });

  // Bailiff form state
  const [bailiffForm, setBailiffForm] = useState({
    name: '',
    license_number: '',
    court_assigned: '',
    jurisdiction: '',
    phone: '',
    phone_secondary: '',
    email: '',
    address: '',
    specialization: 'general',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      fetchCourts();
      fetchBailiffs();
    }
  }, [user]);

  const fetchCourts = async () => {
    try {
      const { data, error } = await supabase
        .from('court_directory')
        .select('*')
        .order('name');

      if (error) throw error;
      setCourts(data || []);
    } catch (error: any) {
      console.error('Error fetching courts:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los tribunales',
        variant: 'destructive',
      });
    } finally {
      setLoadingCourts(false);
    }
  };

  const fetchBailiffs = async () => {
    try {
      const { data, error } = await supabase
        .from('bailiff_directory')
        .select('*')
        .order('name');

      if (error) throw error;
      setBailiffs(data || []);
    } catch (error: any) {
      console.error('Error fetching bailiffs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los alguaciles',
        variant: 'destructive',
      });
    } finally {
      setLoadingBailiffs(false);
    }
  };

  const handleCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingCourt) {
        const { error } = await supabase
          .from('court_directory')
          .update({
            name: courtForm.name,
            court_type: courtForm.court_type,
            jurisdiction: courtForm.jurisdiction || null,
            department: courtForm.department || null,
            address: courtForm.address || null,
            phone: courtForm.phone || null,
            phone_secondary: courtForm.phone_secondary || null,
            email: courtForm.email || null,
            website: courtForm.website || null,
            schedule: courtForm.schedule || null,
            notes: courtForm.notes || null,
          })
          .eq('id', editingCourt.id);

        if (error) throw error;
        toast({ title: 'Tribunal actualizado correctamente' });
      } else {
        const { error } = await supabase.from('court_directory').insert({
          user_id: user.id,
          name: courtForm.name,
          court_type: courtForm.court_type,
          jurisdiction: courtForm.jurisdiction || null,
          department: courtForm.department || null,
          address: courtForm.address || null,
          phone: courtForm.phone || null,
          phone_secondary: courtForm.phone_secondary || null,
          email: courtForm.email || null,
          website: courtForm.website || null,
          schedule: courtForm.schedule || null,
          notes: courtForm.notes || null,
        });

        if (error) throw error;
        toast({ title: 'Tribunal agregado correctamente' });
      }

      setIsCourtDialogOpen(false);
      setEditingCourt(null);
      resetCourtForm();
      fetchCourts();
    } catch (error: any) {
      console.error('Error saving court:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el tribunal',
        variant: 'destructive',
      });
    }
  };

  const handleBailiffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingBailiff) {
        const { error } = await supabase
          .from('bailiff_directory')
          .update({
            name: bailiffForm.name,
            license_number: bailiffForm.license_number || null,
            court_assigned: bailiffForm.court_assigned || null,
            jurisdiction: bailiffForm.jurisdiction || null,
            phone: bailiffForm.phone || null,
            phone_secondary: bailiffForm.phone_secondary || null,
            email: bailiffForm.email || null,
            address: bailiffForm.address || null,
            specialization: bailiffForm.specialization || null,
            status: bailiffForm.status,
            notes: bailiffForm.notes || null,
          })
          .eq('id', editingBailiff.id);

        if (error) throw error;
        toast({ title: 'Alguacil actualizado correctamente' });
      } else {
        const { error } = await supabase.from('bailiff_directory').insert({
          user_id: user.id,
          name: bailiffForm.name,
          license_number: bailiffForm.license_number || null,
          court_assigned: bailiffForm.court_assigned || null,
          jurisdiction: bailiffForm.jurisdiction || null,
          phone: bailiffForm.phone || null,
          phone_secondary: bailiffForm.phone_secondary || null,
          email: bailiffForm.email || null,
          address: bailiffForm.address || null,
          specialization: bailiffForm.specialization || null,
          status: bailiffForm.status,
          notes: bailiffForm.notes || null,
        });

        if (error) throw error;
        toast({ title: 'Alguacil agregado correctamente' });
      }

      setIsBailiffDialogOpen(false);
      setEditingBailiff(null);
      resetBailiffForm();
      fetchBailiffs();
    } catch (error: any) {
      console.error('Error saving bailiff:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el alguacil',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCourt = async () => {
    if (!deleteCourt) return;

    try {
      const { error } = await supabase
        .from('court_directory')
        .delete()
        .eq('id', deleteCourt.id);

      if (error) throw error;
      toast({ title: 'Tribunal eliminado correctamente' });
      setDeleteCourt(null);
      fetchCourts();
    } catch (error: any) {
      console.error('Error deleting court:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el tribunal',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBailiff = async () => {
    if (!deleteBailiff) return;

    try {
      const { error } = await supabase
        .from('bailiff_directory')
        .delete()
        .eq('id', deleteBailiff.id);

      if (error) throw error;
      toast({ title: 'Alguacil eliminado correctamente' });
      setDeleteBailiff(null);
      fetchBailiffs();
    } catch (error: any) {
      console.error('Error deleting bailiff:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el alguacil',
        variant: 'destructive',
      });
    }
  };

  const resetCourtForm = () => {
    setCourtForm({
      name: '',
      court_type: 'primera_instancia',
      jurisdiction: '',
      department: '',
      address: '',
      phone: '',
      phone_secondary: '',
      email: '',
      website: '',
      schedule: '',
      notes: '',
    });
  };

  const resetBailiffForm = () => {
    setBailiffForm({
      name: '',
      license_number: '',
      court_assigned: '',
      jurisdiction: '',
      phone: '',
      phone_secondary: '',
      email: '',
      address: '',
      specialization: 'general',
      status: 'active',
      notes: '',
    });
  };

  const openEditCourt = (court: CourtContact) => {
    setEditingCourt(court);
    setCourtForm({
      name: court.name,
      court_type: court.court_type,
      jurisdiction: court.jurisdiction || '',
      department: court.department || '',
      address: court.address || '',
      phone: court.phone || '',
      phone_secondary: court.phone_secondary || '',
      email: court.email || '',
      website: court.website || '',
      schedule: court.schedule || '',
      notes: court.notes || '',
    });
    setIsCourtDialogOpen(true);
  };

  const openEditBailiff = (bailiff: BailiffContact) => {
    setEditingBailiff(bailiff);
    setBailiffForm({
      name: bailiff.name,
      license_number: bailiff.license_number || '',
      court_assigned: bailiff.court_assigned || '',
      jurisdiction: bailiff.jurisdiction || '',
      phone: bailiff.phone || '',
      phone_secondary: bailiff.phone_secondary || '',
      email: bailiff.email || '',
      address: bailiff.address || '',
      specialization: bailiff.specialization || 'general',
      status: bailiff.status || 'active',
      notes: bailiff.notes || '',
    });
    setIsBailiffDialogOpen(true);
  };

  const filteredCourts = courts.filter(court => {
    const matchesSearch = court.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      court.jurisdiction?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      court.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !courtFilters.type || court.court_type === courtFilters.type;
    const matchesJurisdiction = !courtFilters.jurisdiction || court.jurisdiction === courtFilters.jurisdiction;
    return matchesSearch && matchesType && matchesJurisdiction;
  });

  const filteredBailiffs = bailiffs.filter(bailiff => {
    const matchesSearch = bailiff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bailiff.jurisdiction?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bailiff.court_assigned?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bailiff.license_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJurisdiction = !bailiffFilters.jurisdiction || bailiff.jurisdiction === bailiffFilters.jurisdiction;
    const matchesSpecialization = !bailiffFilters.specialization || bailiff.specialization === bailiffFilters.specialization;
    const matchesStatus = !bailiffFilters.status || bailiff.status === bailiffFilters.status;
    return matchesSearch && matchesJurisdiction && matchesSpecialization && matchesStatus;
  });

  const activeCourtFiltersCount = Object.values(courtFilters).filter(v => v).length;
  const activeBailiffFiltersCount = Object.values(bailiffFilters).filter(v => v).length;

  const clearCourtFilters = () => setCourtFilters({ type: '', jurisdiction: '' });
  const clearBailiffFilters = () => setBailiffFilters({ jurisdiction: '', specialization: '', status: '' });

  const handleImportCourts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    try {
      const courtsData = await parseCourtFile(file);
      
      if (courtsData.length === 0) {
        toast({
          title: 'Archivo vacío',
          description: 'No se encontraron tribunales en el archivo',
          variant: 'destructive',
        });
        return;
      }

      const courtsToInsert = courtsData.map(court => ({
        user_id: user.id,
        name: court.name || '',
        court_type: court.court_type || 'primera_instancia',
        jurisdiction: court.jurisdiction || null,
        department: court.department || null,
        address: court.address || null,
        phone: court.phone || null,
        phone_secondary: court.phone_secondary || null,
        email: court.email || null,
        website: court.website || null,
        schedule: court.schedule || null,
        notes: court.notes || null,
      }));

      const { error } = await supabase.from('court_directory').insert(courtsToInsert);

      if (error) throw error;

      toast({
        title: 'Importación exitosa',
        description: `Se importaron ${courtsData.length} tribunales`,
      });
      fetchCourts();
    } catch (error: any) {
      console.error('Error importing courts:', error);
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

  const handleImportBailiffs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    try {
      const bailiffsData = await parseBailiffFile(file);
      
      if (bailiffsData.length === 0) {
        toast({
          title: 'Archivo vacío',
          description: 'No se encontraron alguaciles en el archivo',
          variant: 'destructive',
        });
        return;
      }

      const bailiffsToInsert = bailiffsData.map(bailiff => ({
        user_id: user.id,
        name: bailiff.name || '',
        license_number: bailiff.license_number || null,
        court_assigned: bailiff.court_assigned || null,
        jurisdiction: bailiff.jurisdiction || null,
        phone: bailiff.phone || null,
        phone_secondary: bailiff.phone_secondary || null,
        email: bailiff.email || null,
        address: bailiff.address || null,
        specialization: bailiff.specialization || 'general',
        status: bailiff.status || 'active',
        notes: bailiff.notes || null,
      }));

      const { error } = await supabase.from('bailiff_directory').insert(bailiffsToInsert);

      if (error) throw error;

      toast({
        title: 'Importación exitosa',
        description: `Se importaron ${bailiffsData.length} alguaciles`,
      });
      fetchBailiffs();
    } catch (error: any) {
      console.error('Error importing bailiffs:', error);
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

  return (
    <AppLayout title="Directorio de Contactos">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en el directorio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="courts" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Tribunales</span>
              <span className="sm:hidden">Trib.</span>
              ({courts.length})
            </TabsTrigger>
            <TabsTrigger value="bailiffs" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Alguaciles</span>
              <span className="sm:hidden">Alg.</span>
              ({bailiffs.length})
            </TabsTrigger>
            <TabsTrigger value="notaries" className="gap-2">
              <Stamp className="h-4 w-4" />
              <span className="hidden sm:inline">Notarios</span>
              <span className="sm:hidden">Not.</span>
            </TabsTrigger>
          </TabsList>

          {/* Courts Tab */}
          <TabsContent value="courts" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {activeCourtFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                        {activeCourtFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filtros</h4>
                      {activeCourtFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearCourtFilters}>
                          Limpiar
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Tribunal</Label>
                      <Select
                        value={courtFilters.type}
                        onValueChange={(value) => setCourtFilters(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos los tipos</SelectItem>
                          {COURT_TYPES.map((type) => (
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
                        value={courtFilters.jurisdiction}
                        onValueChange={(value) => setCourtFilters(prev => ({ ...prev, jurisdiction: value }))}
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
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Active filters badges */}
              {courtFilters.type && (
                <Badge variant="secondary" className="gap-1">
                  {getCourtTypeLabel(courtFilters.type)}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setCourtFilters(prev => ({ ...prev, type: '' }))}
                  />
                </Badge>
              )}
              {courtFilters.jurisdiction && (
                <Badge variant="secondary" className="gap-1">
                  {courtFilters.jurisdiction}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setCourtFilters(prev => ({ ...prev, jurisdiction: '' }))}
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
                  <DropdownMenuItem onClick={() => exportCourtsToExcel(courts)}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar a Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportCourtsToCSV(courts)}>
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
                        onChange={handleImportCourts}
                        disabled={importing}
                      />
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadCourtTemplate}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Descargar plantilla
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={isCourtDialogOpen} onOpenChange={(open) => {
                setIsCourtDialogOpen(open);
                if (!open) {
                  setEditingCourt(null);
                  resetCourtForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Tribunal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCourt ? 'Editar Tribunal' : 'Agregar Tribunal'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCourtSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="court_name">Nombre del Tribunal *</Label>
                        <Input
                          id="court_name"
                          value={courtForm.name}
                          onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })}
                          placeholder="Ej: Primer Tribunal Colegiado"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="court_type">Tipo de Tribunal *</Label>
                        <Select
                          value={courtForm.court_type}
                          onValueChange={(value) => setCourtForm({ ...courtForm, court_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COURT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="court_jurisdiction">Jurisdicción</Label>
                        <Select
                          value={courtForm.jurisdiction}
                          onValueChange={(value) => setCourtForm({ ...courtForm, jurisdiction: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar jurisdicción" />
                          </SelectTrigger>
                          <SelectContent>
                            {JURISDICTIONS.map((j) => (
                              <SelectItem key={j} value={j}>
                                {j}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="court_department">Departamento/Sala</Label>
                        <Input
                          id="court_department"
                          value={courtForm.department}
                          onChange={(e) => setCourtForm({ ...courtForm, department: e.target.value })}
                          placeholder="Ej: Sala Civil, Sala Penal"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="court_address">Dirección</Label>
                      <Input
                        id="court_address"
                        value={courtForm.address}
                        onChange={(e) => setCourtForm({ ...courtForm, address: e.target.value })}
                        placeholder="Dirección completa"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="court_phone">Teléfono Principal</Label>
                        <Input
                          id="court_phone"
                          value={courtForm.phone}
                          onChange={(e) => setCourtForm({ ...courtForm, phone: e.target.value })}
                          placeholder="809-XXX-XXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="court_phone2">Teléfono Secundario</Label>
                        <Input
                          id="court_phone2"
                          value={courtForm.phone_secondary}
                          onChange={(e) => setCourtForm({ ...courtForm, phone_secondary: e.target.value })}
                          placeholder="809-XXX-XXXX"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="court_email">Correo Electrónico</Label>
                        <Input
                          id="court_email"
                          type="email"
                          value={courtForm.email}
                          onChange={(e) => setCourtForm({ ...courtForm, email: e.target.value })}
                          placeholder="correo@poderjudicial.gob.do"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="court_website">Sitio Web</Label>
                        <Input
                          id="court_website"
                          value={courtForm.website}
                          onChange={(e) => setCourtForm({ ...courtForm, website: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="court_schedule">Horario de Atención</Label>
                      <Input
                        id="court_schedule"
                        value={courtForm.schedule}
                        onChange={(e) => setCourtForm({ ...courtForm, schedule: e.target.value })}
                        placeholder="Ej: Lunes a Viernes 8:00 AM - 4:00 PM"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="court_notes">Notas</Label>
                      <Textarea
                        id="court_notes"
                        value={courtForm.notes}
                        onChange={(e) => setCourtForm({ ...courtForm, notes: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsCourtDialogOpen(false);
                        setEditingCourt(null);
                        resetCourtForm();
                      }}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingCourt ? 'Actualizar' : 'Guardar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loadingCourts ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCourts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay tribunales registrados</h3>
                  <p className="text-muted-foreground mb-4">
                    Agrega tribunales para tener un directorio de contactos rápido
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCourts.map((court) => (
                  <Card key={court.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold line-clamp-2">
                            {court.name}
                          </CardTitle>
                          <Badge variant="secondary" className="mt-2">
                            {getCourtTypeLabel(court.court_type)}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditCourt(court)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteCourt(court)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {court.jurisdiction && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{court.jurisdiction}</span>
                        </div>
                      )}
                      {court.department && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span>{court.department}</span>
                        </div>
                      )}
                      {court.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0" />
                          <a href={`tel:${court.phone}`} className="hover:text-primary">
                            {court.phone}
                          </a>
                        </div>
                      )}
                      {court.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" />
                          <a href={`mailto:${court.email}`} className="hover:text-primary truncate">
                            {court.email}
                          </a>
                        </div>
                      )}
                      {court.schedule && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>{court.schedule}</span>
                        </div>
                      )}
                      {court.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4 shrink-0" />
                          <a 
                            href={court.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-primary truncate"
                          >
                            {court.website}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bailiffs Tab */}
          <TabsContent value="bailiffs" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {activeBailiffFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                        {activeBailiffFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filtros</h4>
                      {activeBailiffFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearBailiffFilters}>
                          Limpiar
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Jurisdicción</Label>
                      <Select
                        value={bailiffFilters.jurisdiction}
                        onValueChange={(value) => setBailiffFilters(prev => ({ ...prev, jurisdiction: value }))}
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
                      <Label>Especialización</Label>
                      <Select
                        value={bailiffFilters.specialization}
                        onValueChange={(value) => setBailiffFilters(prev => ({ ...prev, specialization: value }))}
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
                        value={bailiffFilters.status}
                        onValueChange={(value) => setBailiffFilters(prev => ({ ...prev, status: value }))}
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
              {bailiffFilters.jurisdiction && (
                <Badge variant="secondary" className="gap-1">
                  {bailiffFilters.jurisdiction}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setBailiffFilters(prev => ({ ...prev, jurisdiction: '' }))}
                  />
                </Badge>
              )}
              {bailiffFilters.specialization && (
                <Badge variant="secondary" className="gap-1">
                  {getSpecializationLabel(bailiffFilters.specialization)}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setBailiffFilters(prev => ({ ...prev, specialization: '' }))}
                  />
                </Badge>
              )}
              {bailiffFilters.status && (
                <Badge variant="secondary" className="gap-1">
                  {bailiffFilters.status === 'active' ? 'Activo' : 'Inactivo'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setBailiffFilters(prev => ({ ...prev, status: '' }))}
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
                  <DropdownMenuItem onClick={() => exportBailiffsToExcel(bailiffs)}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar a Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportBailiffsToCSV(bailiffs)}>
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
                        onChange={handleImportBailiffs}
                        disabled={importing}
                      />
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadBailiffTemplate}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Descargar plantilla
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={isBailiffDialogOpen} onOpenChange={(open) => {
                setIsBailiffDialogOpen(open);
                if (!open) {
                  setEditingBailiff(null);
                  resetBailiffForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Alguacil
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBailiff ? 'Editar Alguacil' : 'Agregar Alguacil'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBailiffSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_name">Nombre Completo *</Label>
                        <Input
                          id="bailiff_name"
                          value={bailiffForm.name}
                          onChange={(e) => setBailiffForm({ ...bailiffForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_license">Número de Matrícula</Label>
                        <Input
                          id="bailiff_license"
                          value={bailiffForm.license_number}
                          onChange={(e) => setBailiffForm({ ...bailiffForm, license_number: e.target.value })}
                          placeholder="Ej: ALG-12345"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_court">Tribunal Asignado</Label>
                        <Input
                          id="bailiff_court"
                          value={bailiffForm.court_assigned}
                          onChange={(e) => setBailiffForm({ ...bailiffForm, court_assigned: e.target.value })}
                          placeholder="Nombre del tribunal"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_jurisdiction">Jurisdicción</Label>
                        <Select
                          value={bailiffForm.jurisdiction}
                          onValueChange={(value) => setBailiffForm({ ...bailiffForm, jurisdiction: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar jurisdicción" />
                          </SelectTrigger>
                          <SelectContent>
                            {JURISDICTIONS.map((j) => (
                              <SelectItem key={j} value={j}>
                                {j}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_spec">Especialización</Label>
                        <Select
                          value={bailiffForm.specialization}
                          onValueChange={(value) => setBailiffForm({ ...bailiffForm, specialization: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPECIALIZATIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_status">Estado</Label>
                        <Select
                          value={bailiffForm.status}
                          onValueChange={(value) => setBailiffForm({ ...bailiffForm, status: value })}
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_phone">Teléfono Principal</Label>
                        <Input
                          id="bailiff_phone"
                          value={bailiffForm.phone}
                          onChange={(e) => setBailiffForm({ ...bailiffForm, phone: e.target.value })}
                          placeholder="809-XXX-XXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_phone2">Teléfono Secundario</Label>
                        <Input
                          id="bailiff_phone2"
                          value={bailiffForm.phone_secondary}
                          onChange={(e) => setBailiffForm({ ...bailiffForm, phone_secondary: e.target.value })}
                          placeholder="809-XXX-XXXX"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_email">Correo Electrónico</Label>
                        <Input
                          id="bailiff_email"
                          type="email"
                          value={bailiffForm.email}
                          onChange={(e) => setBailiffForm({ ...bailiffForm, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bailiff_address">Dirección / Oficina</Label>
                        <Input
                          id="bailiff_address"
                          value={bailiffForm.address}
                          onChange={(e) => setBailiffForm({ ...bailiffForm, address: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bailiff_notes">Notas</Label>
                      <Textarea
                        id="bailiff_notes"
                        value={bailiffForm.notes}
                        onChange={(e) => setBailiffForm({ ...bailiffForm, notes: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsBailiffDialogOpen(false);
                        setEditingBailiff(null);
                        resetBailiffForm();
                      }}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingBailiff ? 'Actualizar' : 'Guardar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loadingBailiffs ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBailiffs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay alguaciles registrados</h3>
                  <p className="text-muted-foreground mb-4">
                    Agrega alguaciles para tener un directorio de contactos rápido
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBailiffs.map((bailiff) => (
                  <Card key={bailiff.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">
                              {bailiff.name}
                            </CardTitle>
                            {bailiff.license_number && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BadgeCheck className="h-3 w-3" />
                                {bailiff.license_number}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditBailiff(bailiff)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteBailiff(bailiff)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={bailiff.status === 'active' ? 'default' : 'secondary'}
                        >
                          {bailiff.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {bailiff.specialization && (
                          <Badge variant="outline">
                            {getSpecializationLabel(bailiff.specialization)}
                          </Badge>
                        )}
                      </div>
                      {bailiff.court_assigned && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span className="line-clamp-1">{bailiff.court_assigned}</span>
                        </div>
                      )}
                      {bailiff.jurisdiction && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{bailiff.jurisdiction}</span>
                        </div>
                      )}
                      {bailiff.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0" />
                          <a href={`tel:${bailiff.phone}`} className="hover:text-primary">
                            {bailiff.phone}
                          </a>
                        </div>
                      )}
                      {bailiff.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" />
                          <a href={`mailto:${bailiff.email}`} className="hover:text-primary truncate">
                            {bailiff.email}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notaries Tab */}
          <TabsContent value="notaries" className="space-y-4">
            <NotaryDirectory searchTerm={searchTerm} />
          </TabsContent>
        </Tabs>

        {/* Delete Court Dialog */}
        <AlertDialog open={!!deleteCourt} onOpenChange={() => setDeleteCourt(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar tribunal?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente "{deleteCourt?.name}" del directorio.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCourt} className="bg-destructive text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Bailiff Dialog */}
        <AlertDialog open={!!deleteBailiff} onOpenChange={() => setDeleteBailiff(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar alguacil?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente "{deleteBailiff?.name}" del directorio.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteBailiff} className="bg-destructive text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}