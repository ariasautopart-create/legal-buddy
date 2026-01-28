import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase } from 'lucide-react';

interface Case {
  id: string;
  case_number: string;
  title: string;
  client_name: string;
  status: string;
  priority: string;
}

interface RecentCasesProps {
  cases: Case[];
}

const statusColors: Record<string, string> = {
  open: 'bg-info/10 text-info border-info/20',
  in_progress: 'bg-warning/10 text-warning border-warning/20',
  closed: 'bg-success/10 text-success border-success/20',
  pending: 'bg-muted text-muted-foreground border-muted',
};

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-success/10 text-success border-success/20',
};

export function RecentCases({ cases }: RecentCasesProps) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Briefcase className="h-5 w-5 text-accent" />
          Casos Recientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay casos registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((caseItem) => (
              <div 
                key={caseItem.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{caseItem.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {caseItem.case_number} • {caseItem.client_name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className={statusColors[caseItem.status] || statusColors.pending}>
                    {caseItem.status === 'open' ? 'Abierto' : 
                     caseItem.status === 'in_progress' ? 'En Progreso' : 
                     caseItem.status === 'closed' ? 'Cerrado' : 'Pendiente'}
                  </Badge>
                  <Badge variant="outline" className={priorityColors[caseItem.priority] || priorityColors.low}>
                    {caseItem.priority === 'high' ? 'Alta' : 
                     caseItem.priority === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
