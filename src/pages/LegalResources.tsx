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
  Download, 
  Trash2, 
  Upload,
  Scale,
  Gavel,
  FileText,
  BookOpen,
  ScrollText,
  FileCheck,
  Eye,
  Calendar,
  Tag,
  Building
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  reference_number: string | null;
  issue_date: string | null;
  source: string | null;
  keywords: string[] | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  notes: string | null;
  created_at: string;
}

// Categorías adaptadas al sistema jurídico de República Dominicana
const CATEGORIES = [
  { value: 'constitucion', label: 'Constitución', icon: Scale, description: 'Constitución de la República Dominicana' },
  { value: 'ley', label: 'Leyes', icon: BookOpen, description: 'Leyes orgánicas y ordinarias del Congreso Nacional' },
  { value: 'decreto', label: 'Decretos', icon: ScrollText, description: 'Decretos del Poder Ejecutivo' },
  { value: 'reglamento', label: 'Reglamentos', icon: FileText, description: 'Reglamentos de aplicación de leyes' },
  { value: 'resolucion', label: 'Resoluciones', icon: FileCheck, description: 'Resoluciones administrativas y ministeriales' },
  { value: 'ordenanza', label: 'Ordenanzas', icon: Building, description: 'Ordenanzas municipales y distritales' },
  { value: 'jurisprudencia_scj', label: 'Jurisprudencia SCJ', icon: Gavel, description: 'Sentencias de la Suprema Corte de Justicia' },
  { value: 'jurisprudencia_tc', label: 'Jurisprudencia TC', icon: Gavel, description: 'Sentencias del Tribunal Constitucional' },
  { value: 'codigo', label: 'Códigos', icon: BookOpen, description: 'Códigos Civil, Penal, Laboral, Tributario, etc.' },
  { value: 'tratado', label: 'Tratados Internacionales', icon: Scale, description: 'Convenios y tratados ratificados por RD' },
];

const getCategoryInfo = (category: string) => {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
};

export default function LegalResources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<LegalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteResource, setDeleteResource] = useState<LegalResource | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [viewResource, setViewResource] = useState<LegalResource | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'ley',
    subcategory: '',
    reference_number: '',
    issue_date: '',
    source: '',
    keywords: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchResources();
    }
  }, [user]);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los recursos legales',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUploading(true);
    try {
      let filePath = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('legal-resources')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        fileType = selectedFile.type;
      }

      // Parse keywords
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const { error } = await supabase.from('legal_resources').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        subcategory: formData.subcategory || null,
        reference_number: formData.reference_number || null,
        issue_date: formData.issue_date || null,
        source: formData.source || null,
        keywords: keywordsArray.length > 0 ? keywordsArray : null,
        notes: formData.notes || null,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        file_type: fileType,
      });

      if (error) throw error;

      toast({
        title: 'Recurso agregado',
        description: 'El recurso legal se ha guardado correctamente',
      });

      setIsDialogOpen(false);
      resetForm();
      fetchResources();
    } catch (error: any) {
      console.error('Error saving resource:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el recurso',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteResource) return;

    try {
      // Delete file from storage if exists
      if (deleteResource.file_path) {
        await supabase.storage
          .from('legal-resources')
          .remove([deleteResource.file_path]);
      }

      const { error } = await supabase
        .from('legal_resources')
        .delete()
        .eq('id', deleteResource.id);

      if (error) throw error;

      toast({
        title: 'Recurso eliminado',
        description: 'El recurso legal se ha eliminado correctamente',
      });

      setDeleteResource(null);
      fetchResources();
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el recurso',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (resource: LegalResource) => {
    if (!resource.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('legal-resources')
        .download(resource.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.file_name || 'documento';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'ley',
      subcategory: '',
      reference_number: '',
      issue_date: '',
      source: '',
      keywords: '',
      notes: '',
    });
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = activeCategory === 'all' || resource.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryCounts = () => {
    const counts: Record<string, number> = { all: resources.length };
    CATEGORIES.forEach(cat => {
      counts[cat.value] = resources.filter(r => r.category === cat.value).length;
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();

  return (
    <AppLayout title="Recursos Legales">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, referencia, palabras clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Recurso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agregar Recurso Legal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reference_number">Número de Referencia</Label>
                    <Input
                      id="reference_number"
                      placeholder="Ej: Ley No. 107-13, Decreto 230-18"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issue_date">Fecha de Emisión</Label>
                    <Input
                      id="issue_date"
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Fuente / Organismo</Label>
                    <Input
                      id="source"
                      placeholder="Ej: Congreso Nacional, SCJ, Poder Ejecutivo, TC"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Subcategoría</Label>
                    <Input
                      id="subcategory"
                      placeholder="Ej: Derecho Civil, Laboral"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Resumen del contenido..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Palabras Clave</Label>
                  <Input
                    id="keywords"
                    placeholder="Separadas por coma: contrato, obligaciones, daños"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas adicionales..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Archivo (PDF, DOC, DOCX)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="file" className="cursor-pointer">
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="text-sm">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(selectedFile.size)})
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Clic para seleccionar archivo
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Guardando...' : 'Guardar Recurso'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Todos ({categoryCounts.all})
            </TabsTrigger>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger 
                  key={cat.value} 
                  value={cat.value}
                  className="gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {cat.label} ({categoryCounts[cat.value]})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 h-48 bg-muted/50" />
                  </Card>
                ))}
              </div>
            ) : filteredResources.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay recursos</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'No se encontraron recursos con ese criterio de búsqueda'
                      : 'Comienza agregando tu primer recurso legal'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar Recurso
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResources.map((resource) => {
                  const catInfo = getCategoryInfo(resource.category);
                  const Icon = catInfo.icon;
                  return (
                    <Card key={resource.id} className="shadow-card hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {catInfo.label}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewResource(resource)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {resource.file_path && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(resource)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteResource(resource)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-base line-clamp-2 mt-2">
                          {resource.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {resource.reference_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{resource.reference_number}</span>
                          </div>
                        )}
                        {resource.issue_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {format(new Date(resource.issue_date), "d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                          </div>
                        )}
                        {resource.source && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground line-clamp-1">{resource.source}</span>
                          </div>
                        )}
                        {resource.keywords && resource.keywords.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            {resource.keywords.slice(0, 3).map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {resource.keywords.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{resource.keywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        {resource.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* View Resource Dialog */}
        <Dialog open={!!viewResource} onOpenChange={() => setViewResource(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewResource && (
                  <>
                    {(() => {
                      const Icon = getCategoryInfo(viewResource.category).icon;
                      return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                    {viewResource.title}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {viewResource && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{getCategoryInfo(viewResource.category).label}</Badge>
                  {viewResource.subcategory && (
                    <Badge variant="outline">{viewResource.subcategory}</Badge>
                  )}
                </div>

                {viewResource.reference_number && (
                  <div>
                    <Label className="text-muted-foreground">Número de Referencia</Label>
                    <p className="font-medium">{viewResource.reference_number}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {viewResource.issue_date && (
                    <div>
                      <Label className="text-muted-foreground">Fecha de Emisión</Label>
                      <p className="font-medium">
                        {format(new Date(viewResource.issue_date), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                  {viewResource.source && (
                    <div>
                      <Label className="text-muted-foreground">Fuente</Label>
                      <p className="font-medium">{viewResource.source}</p>
                    </div>
                  )}
                </div>

                {viewResource.description && (
                  <div>
                    <Label className="text-muted-foreground">Descripción</Label>
                    <p className="whitespace-pre-wrap">{viewResource.description}</p>
                  </div>
                )}

                {viewResource.keywords && viewResource.keywords.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Palabras Clave</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {viewResource.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {viewResource.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notas</Label>
                    <p className="whitespace-pre-wrap">{viewResource.notes}</p>
                  </div>
                )}

                {viewResource.file_name && (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{viewResource.file_name}</p>
                        {viewResource.file_size && (
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(viewResource.file_size)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button onClick={() => handleDownload(viewResource)} className="gap-2">
                      <Download className="h-4 w-4" />
                      Descargar
                    </Button>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Agregado el {format(new Date(viewResource.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteResource} onOpenChange={() => setDeleteResource(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente "{deleteResource?.title}" y su archivo adjunto si existe.
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
    </AppLayout>
  );
}
