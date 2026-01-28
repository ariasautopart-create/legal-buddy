import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Clock, 
  Calendar, 
  FileText, 
  Settings,
  LogOut,
  Scale,
  FolderOpen,
  BarChart3,
  Library,
  Contact,
  Download
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', url: '/clients', icon: Users },
  { title: 'Casos', url: '/cases', icon: Briefcase },
  { title: 'Documentos', url: '/documents', icon: FolderOpen },
  { title: 'Plazos', url: '/deadlines', icon: Clock },
  { title: 'Calendario', url: '/calendar', icon: Calendar },
  { title: 'Facturación', url: '/invoices', icon: FileText },
  { title: 'Recursos Legales', url: '/legal-resources', icon: Library },
  { title: 'Directorio', url: '/directory', icon: Contact },
  { title: 'Reportes', url: '/reports', icon: BarChart3 },
];

export function AppSidebar() {
  const { signOut } = useAuth();

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-6 gradient-sidebar">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-sidebar-foreground">ARIAS LEGAL</h1>
            <p className="text-xs text-sidebar-foreground/70">GESTIÓN</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gradient-sidebar px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 font-body text-xs uppercase tracking-wider px-3 mb-2">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-body">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-11">
                  <NavLink 
                    to="/settings" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-body">Configuración</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gradient-sidebar p-4 border-t border-sidebar-border space-y-2">
        <NavLink 
          to="/install" 
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
        >
          <Download className="h-5 w-5" />
          <span className="font-body">Instalar App</span>
        </NavLink>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          <span className="font-body">Cerrar Sesión</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
