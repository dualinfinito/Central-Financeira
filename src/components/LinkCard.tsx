import { useState } from "react";
import { LinkItem } from "@/types";
import { ExternalLink, Star, Edit2, Trash2, Globe, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";

interface LinkCardProps {
  link: LinkItem;
  onToggleFavorite: (id: string) => void;
  onClick: (id: string) => void;
  onEdit?: (link: LinkItem) => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_SYMBOLS: Record<string, string> = {
  'Bancos': '🏦',
  'Utilitários': '🛠️',
};

export function LinkCard({ link, onToggleFavorite, onClick, onEdit, onDelete }: LinkCardProps) {
  const [imgError, setImgError] = useState(false);
  const { isAdmin } = useAuth();

  const symbol = CATEGORY_SYMBOLS[link.category] || '🔗';

  return (
    <Card className="bento-card group h-full bg-white hover:border-primary/30 transition-all duration-500">
      <CardContent className="p-5 flex flex-col h-full relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#4ade80]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
        
        <div className="flex justify-between items-start mb-5 z-10">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden p-2.5 transition-all group-hover:scale-110 group-hover:border-primary/25 shadow-md">
              {link.logoUrl && !imgError ? (
                <img 
                  src={link.logoUrl} 
                  alt={link.title} 
                  className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,0,0,0.04)] group-hover:drop-shadow-[0_0_8px_rgba(74,222,128,0.2)]"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl bg-primary/5 text-primary/80">
                  <span className="grayscale-[0.5] group-hover:grayscale-0 transition-all">{symbol}</span>
                </div>
              )}
            </div>
            {link.isFavorite && (
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                <Star className="w-2 h-2 text-black fill-current" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 group-hover:border-primary/20 transition-colors">
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-600 group-hover:text-primary transition-colors">
                {link.category}
              </span>
            </div>
            
            {(isAdmin || ['Bancos', 'Utilitários'].includes(link.category)) && (
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(link.id);
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-all border border-slate-200/80",
                    link.isFavorite 
                      ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" 
                      : "bg-white text-slate-500 hover:text-yellow-500 hover:bg-yellow-500/10"
                  )}
                  title={link.isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
                >
                  <Star className={cn("w-3.5 h-3.5", link.isFavorite && "fill-current")} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(link);
                  }}
                  className="p-2 rounded-lg bg-white text-slate-500 hover:text-primary hover:bg-primary/10 transition-all border border-slate-200/80"
                  title="Ajustes"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(link.id);
                  }}
                  className="p-2 rounded-lg bg-white text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all border border-slate-200/80"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 z-10">
          <div className="flex items-center gap-2 mb-2">
             <h3 className="text-base font-bold text-slate-800 tracking-tight leading-tight group-hover:text-primary transition-colors">{link.title}</h3>
          </div>
          <p className="text-[11px] text-slate-550 leading-relaxed font-semibold line-clamp-2 italic">
            {link.description || 'Nenhuma descrição detalhada fornecida para este recurso corporativo.'}
          </p>
        </div>

        <button 
          className="w-full h-11 mt-6 bg-slate-50 border border-slate-200/80 hover:border-primary rounded-xl text-slate-600 hover:text-white hover:bg-primary text-xs font-black uppercase tracking-widest transition-all focus:outline-none flex items-center justify-center gap-2 overflow-hidden relative"
          onClick={() => {
            onClick(link.id);
            window.open(link.url, '_blank');
          }}
        >
          <span className="relative z-10 flex items-center gap-2">
            Acessar Plataforma
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
        </button>
      </CardContent>
    </Card>
  );
}
