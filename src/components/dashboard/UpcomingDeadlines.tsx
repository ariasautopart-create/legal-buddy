import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

interface Deadline {
  id: string;
  title: string;
  case_title: string;
  deadline_date: string;
  priority: string;
}

interface UpcomingDeadlinesProps {
  deadlines: Deadline[];
}

export function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
  const getDeadlineStatus = (date: string) => {
    const deadlineDate = new Date(date);
    const daysUntil = differenceInDays(deadlineDate, new Date());
    
    if (isPast(deadlineDate)) {
      return { label: 'Vencido', className: 'bg-destructive/10 text-destructive border-destructive/20' };
    }
    if (daysUntil <= 3) {
      return { label: `${daysUntil} días`, className: 'bg-destructive/10 text-destructive border-destructive/20' };
    }
    if (daysUntil <= 7) {
      return { label: `${daysUntil} días`, className: 'bg-warning/10 text-warning border-warning/20' };
    }
    return { label: `${daysUntil} días`, className: 'bg-success/10 text-success border-success/20' };
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Clock className="h-5 w-5 text-accent" />
          Próximos Plazos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay plazos próximos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deadlines.map((deadline) => {
              const status = getDeadlineStatus(deadline.deadline_date);
              const isOverdue = isPast(new Date(deadline.deadline_date));
              
              return (
                <div 
                  key={deadline.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                    isOverdue ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isOverdue && (
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{deadline.title}</p>
                      <p className="text-sm text-muted-foreground">{deadline.case_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(deadline.deadline_date), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
