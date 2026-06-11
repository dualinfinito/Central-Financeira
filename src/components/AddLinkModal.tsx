import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Globe, Upload, Loader2, X, Image as ImageIcon, Sparkles, AlertCircle, Save, Trash2 } from "lucide-react";
import { LinkItem, Category } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (link: Partial<LinkItem>) => void;
  editingLink?: LinkItem | null;
  defaultCategory?: Category;
}

export function AddLinkModal({ isOpen, onClose, onSave, editingLink, defaultCategory }: AddLinkModalProps) {
  const [formData, setFormData] = useState<Partial<LinkItem>>({
    title: '',
    url: '',
    description: '',
    category: 'Utilitários',
    logoUrl: '',
    isFavorite: false
  });
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLink) {
      setFormData({
        title: editingLink.title,
        url: editingLink.url,
        description: editingLink.description,
        category: editingLink.category,
        logoUrl: editingLink.logoUrl,
        isFavorite: editingLink.isFavorite
      });
    } else {
      const validCategories: Category[] = ['Bancos', 'Utilitários'];
      const initialCategory = defaultCategory && validCategories.includes(defaultCategory) 
        ? defaultCategory as Exclude<Category, 'Favoritos' | 'Cofre' | 'Configurações'>
        : 'Utilitários';

      setFormData({
        title: '',
        url: '',
        description: '',
        category: initialCategory,
        logoUrl: '',
        isFavorite: defaultCategory === 'Favoritos'
      });
    }
  }, [editingLink, isOpen, defaultCategory]);

  const getDomainFromUrl = (urlStr: string) => {
    try {
      if (!urlStr.startsWith('http')) {
        urlStr = 'https://' + urlStr;
      }
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  const handleFetchLogo = async () => {
    let domain = getDomainFromUrl(formData.url || '');
    const title = formData.title || '';
    
    if (!domain && !title) {
      toast.error("Insira o nome ou a URL para buscar a logo");
      return;
    }

    setLoading(true);
    
    // Helper to check if an image actually exists without triggering CORS issues like fetch()
    const checkImageExists = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    };

    try {
      const domainsToTry: string[] = [];
      if (domain) {
        domainsToTry.push(domain);
      } 
      
      if (title) {
        const cleanTitle = title.toLowerCase().trim()
          .replace(/\s+/g, '')
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
          
        if (cleanTitle) {
          if (!domainsToTry.includes(`${cleanTitle}.com.br`)) domainsToTry.push(`${cleanTitle}.com.br`);
          if (!domainsToTry.includes(`${cleanTitle}.com`)) domainsToTry.push(`${cleanTitle}.com`);
          if (!domainsToTry.includes(`${cleanTitle}.io`)) domainsToTry.push(`${cleanTitle}.io`);
        }
      }

      for (const targetDomain of domainsToTry) {
        // 1. Try Clearbit (High quality logo)
        const clearbitUrl = `https://logo.clearbit.com/${targetDomain}?size=256`;
        const exists = await checkImageExists(clearbitUrl);
        
        if (exists) {
          setFormData(prev => ({ ...prev, logoUrl: clearbitUrl }));
          toast.success(`Logomarca encontrada para: ${targetDomain}`);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to Google Favicon (Very reliable for any domain)
      if (domainsToTry.length > 0) {
        const target = domainsToTry[0];
        const googleFavicon = `https://www.google.com/s2/favicons?domain=${target}&sz=256`;
        // We don't strictly check this as Google almost always returns a 200 with at least a default icon
        setFormData(prev => ({ ...prev, logoUrl: googleFavicon }));
        toast.info("Ícone oficial obtido como alternativa.");
        setLoading(false);
        return;
      }

      toast.error("Não localizamos uma logo oficial. Tente inserir a URL completa.");
    } catch (e) {
      console.error("Search error:", e);
      toast.error("Houve uma falha na busca. Tente novamente ou use upload manual.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('O arquivo deve ser uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter menos de 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData(prev => ({ ...prev, logoUrl: result }));
      toast.success('Upload realizado com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] bg-white text-slate-800 border-slate-200/80 overflow-hidden p-0 gap-0 shadow-2xl rounded-2xl">
        <div className="p-5 pb-0">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-black italic tracking-tighter uppercase text-slate-800">
                {editingLink ? 'Refinar link' : 'Adicionar link'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Configure a identidade e os acessos para o ecossistema corporativo.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 grid gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {/* Main Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Título do Link</Label>
              <Input 
                id="title" 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Itaú Corporate"
                className="bg-slate-50 border-slate-200/80 rounded-xl focus:border-primary/50 text-slate-800 placeholder:text-slate-400 transition-all h-10 text-xs font-medium focus:bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Categoria Principal</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val: any) => setFormData({...formData, category: val})}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200/80 rounded-xl focus:ring-primary/50 h-10 text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  <SelectItem value="Bancos">🏦 Bancos & Fintechs</SelectItem>
                  <SelectItem value="Utilitários">🛠️ Utilitários & Operações</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="url" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Endereço Web (URL)</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input 
                id="url" 
                value={formData.url} 
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                placeholder="itau.com.br"
                className="pl-9 bg-slate-50 border-slate-200/80 rounded-xl focus:border-primary/50 text-slate-800 placeholder:text-slate-400 transition-all h-10 text-xs font-medium focus:bg-white"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Breve Descrição</Label>
            <Input 
              id="description" 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Ex: Gestão de contas PJ e fluxo de caixa..."
              className="bg-slate-50 border-slate-200/80 rounded-xl focus:border-primary/50 text-slate-800 placeholder:text-slate-400 transition-all h-10 text-xs focus:bg-white"
            />
          </div>

          {/* Visual Identity Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Identidade Visual</Label>
              <Button 
                type="button"
                variant="ghost" 
                onClick={handleFetchLogo}
                disabled={loading}
                className="h-5 text-[8px] uppercase tracking-tighter font-extrabold text-primary hover:bg-primary/10 rounded-full px-2.5"
              >
                {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> : <Sparkles className="w-2.5 h-2.5 mr-1" />}
                Busca Automática
              </Button>
            </div>

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative group flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all duration-300",
                dragging 
                  ? "border-primary bg-primary/5 scale-[0.98]" 
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/20"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*"
                className="hidden"
              />

              {formData.logoUrl ? (
                <div className="relative group/preview py-1 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-100 p-2.5 flex items-center justify-center overflow-hidden shadow-sm transition-transform group-hover/preview:scale-105">
                     <img src={formData.logoUrl} className="w-full h-full object-contain" alt="Preview" />
                  </div>
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                    className="absolute top-0 right-1/2 translate-x-10 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover/preview:opacity-100 transition-opacity"
                  >
                    <X className="w-3" />
                  </button>
                  <p className="text-[8px] font-bold text-center mt-2 text-slate-400 uppercase tracking-widest opacity-60">Preview Atual</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-sm">
                    <Upload className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-700">Arraste a logo aqui</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 mb-2">ou clique para selecionar do PC</p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 text-[9px] font-black uppercase tracking-widest h-7 rounded-full px-4 transition-all"
                  >
                    Selecionar Arquivo
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-1.5">
               <AlertCircle className="w-2.5 h-2.5 text-slate-405" />
               <p className="text-[8px] text-slate-400 leading-none">Formatos: SVG, PNG ou JPG (Máx 2MB)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setFormData({...formData, isFavorite: !formData.isFavorite})}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                formData.isFavorite 
                ? 'bg-yellow-500/10 border-yellow-250 text-yellow-600' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${formData.isFavorite ? 'fill-current' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">Atalhos Prioritários</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/80">
          <DialogFooter className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="rounded-xl hover:bg-slate-100 hover:text-slate-800 text-slate-400 hover:text-slate-600 transition-colors font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 h-10 px-3"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Descartar
            </Button>
            <Button 
              className="flex-1 bg-primary text-white hover:bg-primary/95 rounded-xl h-10 font-bold text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(22,163,74,0.1)] active:scale-95 flex items-center justify-center gap-1.5 border-0"
              onClick={() => {
                onSave(formData);
                onClose();
              }}
            >
              <Save className="w-3.5 h-3.5" />
              Salvar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
