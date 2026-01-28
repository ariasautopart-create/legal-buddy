import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

interface NotaryExportData {
  Nombre: string;
  'No. Colegiatura': string;
  'Tipo de Notario': string;
  Jurisdicción: string;
  'Nombre de Notaría': string;
  Dirección: string;
  'Teléfono Principal': string;
  'Teléfono Secundario': string;
  'Correo Electrónico': string;
  'Sitio Web': string;
  Horario: string;
  Especialidades: string;
  Estado: string;
  Notas: string;
}

interface NotaryContact {
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
}

const NOTARY_TYPES_MAP: Record<string, string> = {
  'publico': 'Notario Público',
  'de_fe_publica': 'Notario de Fe Pública',
};

const NOTARY_TYPES_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(NOTARY_TYPES_MAP).map(([k, v]) => [v.toLowerCase(), k])
);

const SPECIALIZATIONS_MAP: Record<string, string> = {
  'inmobiliario': 'Inmobiliario',
  'comercial': 'Comercial/Societario',
  'familia': 'Derecho de Familia',
  'sucesiones': 'Sucesiones/Testamentos',
  'contratos': 'Contratos Generales',
  'poderes': 'Poderes/Mandatos',
  'autenticaciones': 'Autenticaciones',
  'actas': 'Actas Notariales',
};

const SPECIALIZATIONS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIALIZATIONS_MAP).map(([k, v]) => [v.toLowerCase(), k])
);

export function useNotaryExport() {
  const { toast } = useToast();

  const exportNotariesToExcel = (notaries: NotaryContact[]) => {
    const data: NotaryExportData[] = notaries.map(notary => ({
      Nombre: notary.name,
      'No. Colegiatura': notary.license_number || '',
      'Tipo de Notario': NOTARY_TYPES_MAP[notary.notary_type || ''] || notary.notary_type || '',
      Jurisdicción: notary.jurisdiction || '',
      'Nombre de Notaría': notary.office_name || '',
      Dirección: notary.address || '',
      'Teléfono Principal': notary.phone || '',
      'Teléfono Secundario': notary.phone_secondary || '',
      'Correo Electrónico': notary.email || '',
      'Sitio Web': notary.website || '',
      Horario: notary.schedule || '',
      Especialidades: notary.specializations?.map(s => SPECIALIZATIONS_MAP[s] || s).join(', ') || '',
      Estado: notary.status === 'active' ? 'Activo' : 'Inactivo',
      Notas: notary.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notarios');
    
    ws['!cols'] = [
      { wch: 35 },
      { wch: 15 },
      { wch: 20 },
      { wch: 25 },
      { wch: 35 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 40 },
      { wch: 10 },
      { wch: 40 },
    ];

    XLSX.writeFile(wb, `notarios_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Exportación exitosa', description: 'Notarios exportados a Excel' });
  };

  const exportNotariesToCSV = (notaries: NotaryContact[]) => {
    const data: NotaryExportData[] = notaries.map(notary => ({
      Nombre: notary.name,
      'No. Colegiatura': notary.license_number || '',
      'Tipo de Notario': NOTARY_TYPES_MAP[notary.notary_type || ''] || notary.notary_type || '',
      Jurisdicción: notary.jurisdiction || '',
      'Nombre de Notaría': notary.office_name || '',
      Dirección: notary.address || '',
      'Teléfono Principal': notary.phone || '',
      'Teléfono Secundario': notary.phone_secondary || '',
      'Correo Electrónico': notary.email || '',
      'Sitio Web': notary.website || '',
      Horario: notary.schedule || '',
      Especialidades: notary.specializations?.map(s => SPECIALIZATIONS_MAP[s] || s).join(', ') || '',
      Estado: notary.status === 'active' ? 'Activo' : 'Inactivo',
      Notas: notary.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({ title: 'Exportación exitosa', description: 'Notarios exportados a CSV' });
  };

  const parseNotaryFile = async (file: File): Promise<Partial<NotaryContact>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

          const notaries: Partial<NotaryContact>[] = jsonData.map(row => {
            const typeLabel = (row['Tipo de Notario'] || '').toLowerCase();
            const notaryType = NOTARY_TYPES_REVERSE[typeLabel] || 'publico';
            const statusLabel = (row['Estado'] || '').toLowerCase();
            const status = statusLabel === 'inactivo' ? 'inactive' : 'active';

            const specsString = row['Especialidades'] || '';
            const specs = specsString.split(',')
              .map(s => s.trim().toLowerCase())
              .map(s => SPECIALIZATIONS_REVERSE[s] || s)
              .filter(s => s);

            return {
              name: row['Nombre'] || '',
              license_number: row['No. Colegiatura'] || null,
              notary_type: notaryType,
              jurisdiction: row['Jurisdicción'] || null,
              office_name: row['Nombre de Notaría'] || null,
              address: row['Dirección'] || null,
              phone: row['Teléfono Principal'] || null,
              phone_secondary: row['Teléfono Secundario'] || null,
              email: row['Correo Electrónico'] || null,
              website: row['Sitio Web'] || null,
              schedule: row['Horario'] || null,
              specializations: specs.length > 0 ? specs : null,
              status,
              notes: row['Notas'] || null,
            };
          }).filter(notary => notary.name);

          resolve(notaries);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const downloadNotaryTemplate = () => {
    const templateData = [{
      Nombre: 'Ejemplo: Lic. María Rodríguez',
      'No. Colegiatura': 'NOT-12345',
      'Tipo de Notario': 'Notario Público',
      Jurisdicción: 'Distrito Nacional',
      'Nombre de Notaría': 'Notaría Rodríguez',
      Dirección: 'Av. Winston Churchill #45, Piantini',
      'Teléfono Principal': '809-555-1234',
      'Teléfono Secundario': '',
      'Correo Electrónico': 'notaria@ejemplo.com',
      'Sitio Web': 'https://notariarodriguez.com',
      Horario: 'Lunes a Viernes 8:00 AM - 5:00 PM',
      Especialidades: 'Inmobiliario, Comercial/Societario, Sucesiones/Testamentos',
      Estado: 'Activo',
      Notas: '',
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notarios');
    XLSX.writeFile(wb, 'plantilla_notarios.xlsx');
    toast({ title: 'Plantilla descargada' });
  };

  return {
    exportNotariesToExcel,
    exportNotariesToCSV,
    parseNotaryFile,
    downloadNotaryTemplate,
  };
}
