import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

interface CourtExportData {
  Nombre: string;
  'Tipo de Tribunal': string;
  Jurisdicción: string;
  'Departamento/Sala': string;
  Dirección: string;
  'Teléfono Principal': string;
  'Teléfono Secundario': string;
  'Correo Electrónico': string;
  'Sitio Web': string;
  Horario: string;
  Notas: string;
}

interface BailiffExportData {
  Nombre: string;
  'No. Matrícula': string;
  'Tribunal Asignado': string;
  Jurisdicción: string;
  Especialización: string;
  Estado: string;
  'Teléfono Principal': string;
  'Teléfono Secundario': string;
  'Correo Electrónico': string;
  Dirección: string;
  Notas: string;
}

interface CourtContact {
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
}

interface BailiffContact {
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
}

const COURT_TYPES_MAP: Record<string, string> = {
  'suprema_corte': 'Suprema Corte de Justicia',
  'tribunal_constitucional': 'Tribunal Constitucional',
  'corte_apelacion': 'Corte de Apelación',
  'primera_instancia': 'Tribunal de Primera Instancia',
  'juzgado_paz': 'Juzgado de Paz',
  'tribunal_laboral': 'Tribunal de Trabajo',
  'tribunal_nna': 'Tribunal de NNA',
  'tribunal_tierras': 'Tribunal de Tierras',
  'tribunal_superior_tierras': 'Tribunal Superior de Tierras',
  'tribunal_contencioso': 'Tribunal Contencioso Administrativo',
};

const COURT_TYPES_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(COURT_TYPES_MAP).map(([k, v]) => [v.toLowerCase(), k])
);

const SPECIALIZATIONS_MAP: Record<string, string> = {
  'civil': 'Civil',
  'penal': 'Penal',
  'laboral': 'Laboral',
  'comercial': 'Comercial',
  'familia': 'Familia/NNA',
  'tierras': 'Tierras',
  'administrativo': 'Administrativo',
  'general': 'General',
};

const SPECIALIZATIONS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIALIZATIONS_MAP).map(([k, v]) => [v.toLowerCase(), k])
);

export function useDirectoryExport() {
  const { toast } = useToast();

  const exportCourtsToExcel = (courts: CourtContact[]) => {
    const data: CourtExportData[] = courts.map(court => ({
      Nombre: court.name,
      'Tipo de Tribunal': COURT_TYPES_MAP[court.court_type] || court.court_type,
      Jurisdicción: court.jurisdiction || '',
      'Departamento/Sala': court.department || '',
      Dirección: court.address || '',
      'Teléfono Principal': court.phone || '',
      'Teléfono Secundario': court.phone_secondary || '',
      'Correo Electrónico': court.email || '',
      'Sitio Web': court.website || '',
      Horario: court.schedule || '',
      Notas: court.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tribunales');
    
    ws['!cols'] = [
      { wch: 40 },
      { wch: 35 },
      { wch: 25 },
      { wch: 20 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 40 },
    ];

    XLSX.writeFile(wb, `tribunales_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Exportación exitosa', description: 'Tribunales exportados a Excel' });
  };

  const exportCourtsToCSV = (courts: CourtContact[]) => {
    const data: CourtExportData[] = courts.map(court => ({
      Nombre: court.name,
      'Tipo de Tribunal': COURT_TYPES_MAP[court.court_type] || court.court_type,
      Jurisdicción: court.jurisdiction || '',
      'Departamento/Sala': court.department || '',
      Dirección: court.address || '',
      'Teléfono Principal': court.phone || '',
      'Teléfono Secundario': court.phone_secondary || '',
      'Correo Electrónico': court.email || '',
      'Sitio Web': court.website || '',
      Horario: court.schedule || '',
      Notas: court.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tribunales_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({ title: 'Exportación exitosa', description: 'Tribunales exportados a CSV' });
  };

  const exportBailiffsToExcel = (bailiffs: BailiffContact[]) => {
    const data: BailiffExportData[] = bailiffs.map(bailiff => ({
      Nombre: bailiff.name,
      'No. Matrícula': bailiff.license_number || '',
      'Tribunal Asignado': bailiff.court_assigned || '',
      Jurisdicción: bailiff.jurisdiction || '',
      Especialización: SPECIALIZATIONS_MAP[bailiff.specialization || ''] || bailiff.specialization || '',
      Estado: bailiff.status === 'active' ? 'Activo' : 'Inactivo',
      'Teléfono Principal': bailiff.phone || '',
      'Teléfono Secundario': bailiff.phone_secondary || '',
      'Correo Electrónico': bailiff.email || '',
      Dirección: bailiff.address || '',
      Notas: bailiff.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alguaciles');
    
    ws['!cols'] = [
      { wch: 35 },
      { wch: 15 },
      { wch: 35 },
      { wch: 25 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 40 },
      { wch: 40 },
    ];

    XLSX.writeFile(wb, `alguaciles_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Exportación exitosa', description: 'Alguaciles exportados a Excel' });
  };

  const exportBailiffsToCSV = (bailiffs: BailiffContact[]) => {
    const data: BailiffExportData[] = bailiffs.map(bailiff => ({
      Nombre: bailiff.name,
      'No. Matrícula': bailiff.license_number || '',
      'Tribunal Asignado': bailiff.court_assigned || '',
      Jurisdicción: bailiff.jurisdiction || '',
      Especialización: SPECIALIZATIONS_MAP[bailiff.specialization || ''] || bailiff.specialization || '',
      Estado: bailiff.status === 'active' ? 'Activo' : 'Inactivo',
      'Teléfono Principal': bailiff.phone || '',
      'Teléfono Secundario': bailiff.phone_secondary || '',
      'Correo Electrónico': bailiff.email || '',
      Dirección: bailiff.address || '',
      Notas: bailiff.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alguaciles_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({ title: 'Exportación exitosa', description: 'Alguaciles exportados a CSV' });
  };

  const parseCourtFile = async (file: File): Promise<Partial<CourtContact>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

          const courts: Partial<CourtContact>[] = jsonData.map(row => {
            const courtTypeLabel = (row['Tipo de Tribunal'] || '').toLowerCase();
            const courtType = COURT_TYPES_REVERSE[courtTypeLabel] || 'primera_instancia';

            return {
              name: row['Nombre'] || '',
              court_type: courtType,
              jurisdiction: row['Jurisdicción'] || null,
              department: row['Departamento/Sala'] || null,
              address: row['Dirección'] || null,
              phone: row['Teléfono Principal'] || null,
              phone_secondary: row['Teléfono Secundario'] || null,
              email: row['Correo Electrónico'] || null,
              website: row['Sitio Web'] || null,
              schedule: row['Horario'] || null,
              notes: row['Notas'] || null,
            };
          }).filter(court => court.name);

          resolve(courts);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseBailiffFile = async (file: File): Promise<Partial<BailiffContact>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

          const bailiffs: Partial<BailiffContact>[] = jsonData.map(row => {
            const specLabel = (row['Especialización'] || '').toLowerCase();
            const specialization = SPECIALIZATIONS_REVERSE[specLabel] || 'general';
            const statusLabel = (row['Estado'] || '').toLowerCase();
            const status = statusLabel === 'inactivo' ? 'inactive' : 'active';

            return {
              name: row['Nombre'] || '',
              license_number: row['No. Matrícula'] || null,
              court_assigned: row['Tribunal Asignado'] || null,
              jurisdiction: row['Jurisdicción'] || null,
              specialization,
              status,
              phone: row['Teléfono Principal'] || null,
              phone_secondary: row['Teléfono Secundario'] || null,
              email: row['Correo Electrónico'] || null,
              address: row['Dirección'] || null,
              notes: row['Notas'] || null,
            };
          }).filter(bailiff => bailiff.name);

          resolve(bailiffs);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const downloadCourtTemplate = () => {
    const templateData = [{
      Nombre: 'Ejemplo: Primer Tribunal Colegiado',
      'Tipo de Tribunal': 'Tribunal de Primera Instancia',
      Jurisdicción: 'Distrito Nacional',
      'Departamento/Sala': 'Sala Civil',
      Dirección: 'Av. Enrique Jiménez Moya, Centro de los Héroes',
      'Teléfono Principal': '809-533-3191',
      'Teléfono Secundario': '',
      'Correo Electrónico': 'ejemplo@poderjudicial.gob.do',
      'Sitio Web': 'https://poderjudicial.gob.do',
      Horario: 'Lunes a Viernes 8:00 AM - 4:00 PM',
      Notas: '',
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tribunales');
    XLSX.writeFile(wb, 'plantilla_tribunales.xlsx');
    toast({ title: 'Plantilla descargada' });
  };

  const downloadBailiffTemplate = () => {
    const templateData = [{
      Nombre: 'Ejemplo: Juan Pérez',
      'No. Matrícula': 'ALG-12345',
      'Tribunal Asignado': 'Primer Tribunal Colegiado DN',
      Jurisdicción: 'Distrito Nacional',
      Especialización: 'Civil',
      Estado: 'Activo',
      'Teléfono Principal': '809-555-1234',
      'Teléfono Secundario': '',
      'Correo Electrónico': 'ejemplo@email.com',
      Dirección: 'Santo Domingo',
      Notas: '',
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alguaciles');
    XLSX.writeFile(wb, 'plantilla_alguaciles.xlsx');
    toast({ title: 'Plantilla descargada' });
  };

  return {
    exportCourtsToExcel,
    exportCourtsToCSV,
    exportBailiffsToExcel,
    exportBailiffsToCSV,
    parseCourtFile,
    parseBailiffFile,
    downloadCourtTemplate,
    downloadBailiffTemplate,
  };
}