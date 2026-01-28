import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Loader2, 
  Download, 
  Upload,
  File,
  FileImage,
  FileSpreadsheet,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  case_id: string;
  created_at: string;
  cases?: { title: string; case_number: string };
}

interface Case {
  id: string;
  title: string;
  case_number: string;
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCase, setFilterCase] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    case_id: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchCases();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*, cases(title, case_number)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    const { data } = await supabase.from('cases').select('id, title, case_number');
    setCases(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Error', description: 'El archivo no puede superar 10MB', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formData.case_id) {
      toast({ title: 'Error', description: 'Selecciona un archivo y un caso', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user!.id}/${formData.case_id}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user!.id,
          case_id: formData.case_id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          description: formData.description || null
        });

      if (dbError) throw dbError;

      toast({ title: 'Documento subido correctamente' });
      setIsDialogOpen(false);
      resetForm();
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Error al subir', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('legal-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: 'Error al descargar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('¿Eliminar este documento?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('legal-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({ title: 'Documento eliminado' });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFormData({ case_id: '', description: '' });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string | null) => {
    if (!type) return <File className="h-5 w-5" />;
    if (type.includes('image')) return <FileImage className="h-5 w-5 text-info" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-destructive" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-success" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCase = filterCase === 'all' || doc.case_id === filterCase;
    return matchesSearch && matchesCase;
  });

  return (
    <AppLayout title="Documentos">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterCase} onValueChange={setFilterCase}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por caso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los casos</SelectItem>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Upload className="h-4 w-4" />
                Subir Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Subir Documento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="case">Caso *</Label>
                  <Select value={formData.case_id} onValueChange={(v) => setFormData({ ...formData, case_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar caso" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.case_number} - {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Archivo *</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-accent transition-colors">
                    <input
                      type="file"
                      id="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    />
                    <label htmlFor="file" className="cursor-pointer">
                      {selectedFile ? (
                        <div className="space-y-2">
                          <File className="h-10 w-10 mx-auto text-accent" />
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Haz clic para seleccionar un archivo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PDF, Word, Excel, Imágenes (máx. 10MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del documento..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary" disabled={uploading || !selectedFile}>
                    {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Subir
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/20">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Documentos</p>
                  <p className="text-2xl font-display font-bold">{documents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/20">
                  <Briefcase className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Casos con Documentos</p>
                  <p className="text-2xl font-display font-bold">
                    {new Set(documents.map(d => d.case_id)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/20">
                  <Upload className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tamaño Total</p>
                  <p className="text-2xl font-display font-bold">
                    {formatFileSize(documents.reduce((sum, d) => sum + (d.file_size || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay documentos</p>
                <p className="text-sm mt-1">Sube tu primer documento para empezar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Caso</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.file_type)}
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            {doc.description && (
                              <p className="text-sm text-muted-foreground">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/5">
                          {doc.cases?.case_number}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(doc.created_at), 'd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDownload(doc)}
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(doc)}
                            title="Eliminar"
                          >
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
