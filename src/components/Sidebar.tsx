import { cn } from "@/lib/utils";
import { 
  CreditCard, 
  Link2, 
  ShieldCheck, 
  Star, 
  Wrench, 
  Zap,
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  PlusCircle,
  X
} from "lucide-react";
import { Category } from "@/types";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeCategory: Category;
  setActiveCategory: (category: Category) => void;
  className?: string;
  onOpenProfile?: () => void;
  onQuickAdd?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activeCategory, setActiveCategory, className, onOpenProfile, onQuickAdd, isOpen, onClose }: SidebarProps) {
  const { profile, logout, isMaster, isAdmin } = useAuth();

  const navItems = [
    { id: 'Favoritos', icon: Star, label: 'Favoritos' },
    { id: 'Bancos', icon: CreditCard, label: 'Bancos' },
    { id: 'Utilitários', icon: Wrench, label: 'Utilitários' },
    { id: 'Cofre', icon: ShieldCheck, label: 'Acessos Bancários' },
  ];

  return (
    <aside className={cn(
      "w-[240px] bg-sidebar text-slate-100 border-r border-slate-800/85 flex flex-col h-screen fixed lg:sticky top-0 z-30 transition-all duration-300",
      isOpen ? "left-0" : "-left-[240px] lg:left-0",
      className
    )}>
      <div className="p-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
            <Link2 className="text-white w-4.5 h-4.5 stroke-[2.5]" />
          </div>
          <h1 className="font-extrabold text-xs sm:text-[13px] leading-tight tracking-tight text-white uppercase">
            Hub de Links<br/><span className="text-primary">Corporativos</span>
          </h1>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white lg:hidden transition-all focus:outline-none"
            title="Fechar Menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 py-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveCategory(item.id as Category);
              onClose?.();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-sm font-medium relative",
              activeCategory === item.id 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "text-slate-400 hover:bg-sidebar-hover hover:text-white"
            )}
          >
            <item.icon className={cn(
              "w-4.5 h-4.5",
              item.id === 'Cofre' && activeCategory !== 'Cofre' ? "text-red-400" : ""
            )} />
            <span>{item.label}</span>
            {activeCategory === item.id && (
              <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary glow-primary" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800/60 flex flex-col gap-2">
        {isMaster && (
          <button 
            onClick={() => {
              setActiveCategory('Configurações');
              onClose?.();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-xs font-black uppercase tracking-widest mb-2 border",
              activeCategory === 'Configurações' 
                ? "bg-primary text-[#0B0F19] border-primary glow-primary" 
                : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            )}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Painel Master</span>
          </button>
        )}

        <button 
          onClick={() => {
            onOpenProfile?.();
            onClose?.();
          }}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-hover transition-colors group"
        >
          {profile?.photoURL ? (
            <img src={profile.photoURL} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-slate-700/50" alt="Avatar" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-700">
              {profile?.displayName?.charAt(0) || 'U'}
            </div>
          )}
          <div className="overflow-hidden text-left flex-1">
            <p className="text-[13px] font-semibold text-slate-200 truncate leading-tight group-hover:text-primary transition-colors">
              {profile?.displayName || 'Usuário'}
            </p>
            <p className="text-[11px] text-slate-400 opacity-70 truncate uppercase tracking-tighter">
              {profile?.role || 'Apoiador'}
            </p>
          </div>
        </button>

        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-400/80 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all uppercase tracking-widest"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
