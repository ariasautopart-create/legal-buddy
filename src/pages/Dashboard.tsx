import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentCases } from '@/components/dashboard/RecentCases';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { Users, Briefcase, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clients: 0,
    cases: 0,
    deadlines: 0,
    invoices: 0,
    pendingAmount: 0
  });
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [clientsRes, casesRes, deadlinesRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('cases').select('id', { count: 'exact' }),
        supabase.from('deadlines').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('invoices').select('total_amount, status')
      ]);

      const pendingInvoices = invoicesRes.data?.filter(i => i.status === 'pending') || [];
      const pendingAmount = pendingInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);

      setStats({
        clients: clientsRes.count || 0,
        cases: casesRes.count || 0,
        deadlines: deadlinesRes.count || 0,
        invoices: invoicesRes.data?.length || 0,
        pendingAmount
      });

      // Fetch recent cases with client info
      const { data: casesData } = await supabase
        .from('cases')
        .select(`
          id,
          case_number,
          title,
          status,
          priority,
          clients!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentCases(
        casesData?.map(c => ({
          ...c,
          client_name: (c.clients as any)?.name || 'Sin cliente'
        })) || []
      );

      // Fetch upcoming deadlines
      const { data: deadlinesData } = await supabase
        .from('deadlines')
        .select(`
          id,
          title,
          deadline_date,
          priority,
          cases!inner(title)
        `)
        .eq('status', 'pending')
        .gte('deadline_date', new Date().toISOString())
        .order('deadline_date', { ascending: true })
        .limit(5);

      setUpcomingDeadlines(
        deadlinesData?.map(d => ({
          ...d,
          case_title: (d.cases as any)?.title || 'Sin caso'
        })) || []
      );

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Clientes Activos"
            value={stats.clients}
            icon={<Users className="h-6 w-6" />}
            variant="default"
          />
          <StatCard
            title="Casos Abiertos"
            value={stats.cases}
            icon={<Briefcase className="h-6 w-6" />}
            variant="accent"
          />
          <StatCard
            title="Plazos Pendientes"
            value={stats.deadlines}
            icon={<Clock className="h-6 w-6" />}
            variant="warning"
          />
          <StatCard
            title="Facturación Pendiente"
            value={formatCurrency(stats.pendingAmount)}
            icon={<FileText className="h-6 w-6" />}
            variant="success"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentCases cases={recentCases} />
          <UpcomingDeadlines deadlines={upcomingDeadlines} />
        </div>
      </div>
    </AppLayout>
  );
}
