import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { DGIIReports } from '@/components/reports/DGIIReports';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  FileText, 
  Euro, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Briefcase,
  Users
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#1e3a5f', '#c9a227', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface MonthlyData {
  month: string;
  cases: number;
  invoiced: number;
  collected: number;
}

interface StatusData {
  name: string;
  value: number;
}

interface ProductivityData {
  month: string;
  completed: number;
  overdue: number;
  pending: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [casesByStatus, setCasesByStatus] = useState<StatusData[]>([]);
  const [casesByType, setCasesByType] = useState<StatusData[]>([]);
  const [invoicesByStatus, setInvoicesByStatus] = useState<StatusData[]>([]);
  const [productivityData, setProductivityData] = useState<ProductivityData[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalCases: 0,
    activeCases: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    completedDeadlines: 0,
    overdueDeadlines: 0,
    totalClients: 0,
    avgCaseValue: 0
  });

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user]);

  const fetchReportData = async () => {
    try {
      // Fetch all data in parallel
      const [casesRes, invoicesRes, deadlinesRes, clientsRes] = await Promise.all([
        supabase.from('cases').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('deadlines').select('*'),
        supabase.from('clients').select('id', { count: 'exact' })
      ]);

      const cases = casesRes.data || [];
      const invoices = invoicesRes.data || [];
      const deadlines = deadlinesRes.data || [];

      // Calculate summary stats
      const activeCases = cases.filter(c => c.status === 'open' || c.status === 'in_progress').length;
      const totalRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + Number(i.total_amount), 0);
      const pendingRevenue = invoices
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + Number(i.total_amount), 0);
      const completedDeadlines = deadlines.filter(d => d.status === 'completed').length;
      const overdueDeadlines = deadlines.filter(d => 
        d.status === 'pending' && new Date(d.deadline_date) < new Date()
      ).length;

      setSummaryStats({
        totalCases: cases.length,
        activeCases,
        totalRevenue,
        pendingRevenue,
        completedDeadlines,
        overdueDeadlines,
        totalClients: clientsRes.count || 0,
        avgCaseValue: cases.length > 0 ? totalRevenue / cases.length : 0
      });

      // Cases by status
      const statusCount: Record<string, number> = {};
      cases.forEach(c => {
        const status = c.status || 'unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      setCasesByStatus(Object.entries(statusCount).map(([name, value]) => ({
        name: translateStatus(name),
        value
      })));

      // Cases by type
      const typeCount: Record<string, number> = {};
      cases.forEach(c => {
        const type = c.case_type || 'other';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      setCasesByType(Object.entries(typeCount).map(([name, value]) => ({
        name: translateType(name),
        value
      })));

      // Invoices by status
      const invStatusCount: Record<string, number> = {};
      invoices.forEach(i => {
        const status = i.status || 'pending';
        invStatusCount[status] = (invStatusCount[status] || 0) + 1;
      });
      setInvoicesByStatus(Object.entries(invStatusCount).map(([name, value]) => ({
        name: translateInvoiceStatus(name),
        value
      })));

      // Monthly data for last 6 months
      const last6Months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthCases = cases.filter(c => {
          const createdAt = new Date(c.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        }).length;

        const monthInvoiced = invoices
          .filter(inv => {
            const issueDate = inv.issue_date ? new Date(inv.issue_date) : new Date(inv.created_at);
            return issueDate >= monthStart && issueDate <= monthEnd;
          })
          .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

        const monthCollected = invoices
          .filter(inv => {
            if (!inv.paid_date || inv.status !== 'paid') return false;
            const paidDate = new Date(inv.paid_date);
            return paidDate >= monthStart && paidDate <= monthEnd;
          })
          .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

        last6Months.push({
          month: format(monthDate, 'MMM', { locale: es }),
          cases: monthCases,
          invoiced: monthInvoiced,
          collected: monthCollected
        });
      }
      setMonthlyData(last6Months);

      // Productivity data (deadlines)
      const productivityByMonth: ProductivityData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthDeadlines = deadlines.filter(d => {
          const deadlineDate = new Date(d.deadline_date);
          return deadlineDate >= monthStart && deadlineDate <= monthEnd;
        });

        productivityByMonth.push({
          month: format(monthDate, 'MMM', { locale: es }),
          completed: monthDeadlines.filter(d => d.status === 'completed').length,
          overdue: monthDeadlines.filter(d => 
            d.status === 'pending' && new Date(d.deadline_date) < new Date()
          ).length,
          pending: monthDeadlines.filter(d => 
            d.status === 'pending' && new Date(d.deadline_date) >= new Date()
          ).length
        });
      }
      setProductivityData(productivityByMonth);

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const translateStatus = (status: string): string => {
    const translations: Record<string, string> = {
      'open': 'Abierto',
      'in_progress': 'En Progreso',
      'closed': 'Cerrado',
      'won': 'Ganado',
      'lost': 'Perdido',
      'unknown': 'Desconocido'
    };
    return translations[status] || status;
  };

  const translateType = (type: string): string => {
    const translations: Record<string, string> = {
      'civil': 'Civil',
      'penal': 'Penal',
      'laboral': 'Laboral',
      'mercantil': 'Mercantil',
      'familia': 'Familia',
      'administrativo': 'Administrativo',
      'other': 'Otro'
    };
    return translations[type] || type;
  };

  const translateInvoiceStatus = (status: string): string => {
    const translations: Record<string, string> = {
      'pending': 'Pendiente',
      'paid': 'Pagada',
      'overdue': 'Vencida',
      'cancelled': 'Cancelada'
    };
    return translations[status] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === 'number' && entry.name.includes('€') 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AppLayout title="Reportes y Estadísticas">
      <div className="space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Casos Totales</p>
                  <p className="text-2xl font-bold text-foreground">{summaryStats.totalCases}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summaryStats.activeCases} activos
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(summaryStats.totalRevenue)}</p>
                  <p className="text-xs text-accent mt-1">
                    {formatCurrency(summaryStats.pendingRevenue)} pendiente
                  </p>
                </div>
                <div className="p-3 rounded-full bg-success/10">
                  <Euro className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plazos Cumplidos</p>
                  <p className="text-2xl font-bold text-foreground">{summaryStats.completedDeadlines}</p>
                  <p className="text-xs text-destructive mt-1">
                    {summaryStats.overdueDeadlines} vencidos
                  </p>
                </div>
                <div className="p-3 rounded-full bg-accent/10">
                  <CheckCircle2 className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold text-foreground">{summaryStats.totalClients}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor promedio: {formatCurrency(summaryStats.avgCaseValue)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-warning/10">
                  <Users className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="cases" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="cases">Casos</TabsTrigger>
            <TabsTrigger value="billing">Facturación</TabsTrigger>
            <TabsTrigger value="productivity">Productividad</TabsTrigger>
            <TabsTrigger value="dgii">DGII</TabsTrigger>
          </TabsList>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cases by Status */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-accent" />
                    Casos por Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {casesByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={casesByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {casesByStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos disponibles
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cases by Type */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Casos por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {casesByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={casesByType} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" className="text-muted-foreground" />
                        <YAxis dataKey="name" type="category" width={100} className="text-muted-foreground" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos disponibles
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Cases Trend */}
              <Card className="shadow-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    Evolución de Casos (Últimos 6 meses)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="cases" 
                        name="Nuevos Casos"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invoices by Status */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Estado de Facturas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invoicesByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={invoicesByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {invoicesByStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos disponibles
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue Summary Card */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="h-5 w-5 text-accent" />
                    Resumen de Ingresos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-success/10 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Cobrado</p>
                        <p className="text-2xl font-bold text-success">{formatCurrency(summaryStats.totalRevenue)}</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <div className="flex justify-between items-center p-4 bg-warning/10 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Pendiente</p>
                        <p className="text-2xl font-bold text-warning">{formatCurrency(summaryStats.pendingRevenue)}</p>
                      </div>
                      <Clock className="h-8 w-8 text-warning" />
                    </div>
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Facturado</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(summaryStats.totalRevenue + summaryStats.pendingRevenue)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Revenue Trend */}
              <Card className="shadow-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    Facturación Mensual (Últimos 6 meses)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-muted-foreground" />
                      <YAxis 
                        className="text-muted-foreground"
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        content={<CustomTooltip />}
                      />
                      <Legend />
                      <Bar dataKey="invoiced" name="Facturado (€)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="collected" name="Cobrado (€)" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Productivity Tab */}
          <TabsContent value="productivity" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deadline Performance */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-accent" />
                    Rendimiento de Plazos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Cumplidos</span>
                          <span className="text-sm font-medium text-success">{summaryStats.completedDeadlines}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success rounded-full transition-all"
                            style={{ 
                              width: `${summaryStats.completedDeadlines + summaryStats.overdueDeadlines > 0 
                                ? (summaryStats.completedDeadlines / (summaryStats.completedDeadlines + summaryStats.overdueDeadlines)) * 100 
                                : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Vencidos</span>
                          <span className="text-sm font-medium text-destructive">{summaryStats.overdueDeadlines}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-destructive rounded-full transition-all"
                            style={{ 
                              width: `${summaryStats.completedDeadlines + summaryStats.overdueDeadlines > 0 
                                ? (summaryStats.overdueDeadlines / (summaryStats.completedDeadlines + summaryStats.overdueDeadlines)) * 100 
                                : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tasa de Cumplimiento</span>
                        <span className="text-2xl font-bold text-primary">
                          {summaryStats.completedDeadlines + summaryStats.overdueDeadlines > 0 
                            ? Math.round((summaryStats.completedDeadlines / (summaryStats.completedDeadlines + summaryStats.overdueDeadlines)) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Summary */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    Resumen de Actividad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <span className="text-sm">Casos Activos</span>
                      </div>
                      <span className="font-bold text-primary">{summaryStats.activeCases}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-accent" />
                        <span className="text-sm">Clientes Totales</span>
                      </div>
                      <span className="font-bold text-accent">{summaryStats.totalClients}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Euro className="h-5 w-5 text-success" />
                        <span className="text-sm">Valor Promedio/Caso</span>
                      </div>
                      <span className="font-bold text-success">{formatCurrency(summaryStats.avgCaseValue)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <span className="text-sm">Plazos Vencidos</span>
                      </div>
                      <span className="font-bold text-warning">{summaryStats.overdueDeadlines}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Productivity Trend */}
              <Card className="shadow-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    Evolución de Plazos (Últimos 6 meses)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={productivityData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        name="Completados"
                        stroke="hsl(var(--success))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--success))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="overdue" 
                        name="Vencidos"
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--destructive))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pending" 
                        name="Pendientes"
                        stroke="hsl(var(--warning))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--warning))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DGII Tab */}
          <TabsContent value="dgii" className="mt-6">
            <DGIIReports />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
