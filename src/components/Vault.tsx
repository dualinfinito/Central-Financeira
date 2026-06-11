import React, { useState, useEffect } from "react";
import { VaultItem } from "@/types";
import { ShieldCheck, Lock, Eye, EyeOff, Plus, User, Key, Globe, Search, Loader2, Trash2, Edit2, X, Save, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { collection, query, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, orderBy, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableVaultCardProps {
  key?: string | number;
  item: VaultItem;
  isMaster: boolean;
  showPassword: boolean;
  onTogglePassword: (id: string) => void;
  onEdit: (item: VaultItem) => void;
  onDelete: (id: string) => void;
}

function SortableVaultCard({ item, isMaster, showPassword, onTogglePassword, onEdit, onDelete }: SortableVaultCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, disabled: !isMaster });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/vault-sortable">
       {isMaster && (
        <div 
          {...attributes} 
          {...listeners}
          className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/vault-sortable:opacity-40 hover:opacity-100 cursor-grab active:cursor-grabbing p-1 z-10"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <Card className={cn("bento-card group/vault", isMaster && "ml-4")}>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-tight">{item.title}</h3>
                <p className="text-[10px] text-primary font-bold truncate max-w-[120px]">{item.bank}</p>
              </div>
            </div>
            {isMaster && (
              <div className="flex gap-1 opacity-0 group-hover/vault:opacity-100 transition-opacity">
                 <button onClick={() => onEdit(item)} className="p-1.5 hover:text-primary transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                 </button>
                 <button onClick={() => onDelete(item.id)} className="p-1.5 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                 </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1 px-3 py-2 bg-secondary rounded-xl border border-border">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-500/90">Agência</span>
              <span className="text-xs font-bold tracking-tight">{item.agency}</span>
            </div>
            <div className="grid gap-1 px-3 py-2 bg-secondary rounded-xl border border-border">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-500/90">Conta</span>
              <span className="text-xs font-bold tracking-tight">{item.account}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid gap-1 px-3 py-2 bg-secondary rounded-xl border border-border">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-500/90">Usuário / Operador</span>
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-primary/70" />
                <span className="text-xs font-bold tracking-tight">{item.username}</span>
              </div>
            </div>

            <div className="grid gap-1 px-3 py-2 bg-secondary rounded-xl border border-border">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-500/90">Senha de Acesso</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Key className="w-3 h-3 text-primary/70 shrink-0" />
                  <span className="text-xs font-mono font-bold">
                    {showPassword ? item.password : '••••••••••••'}
                  </span>
                </div>
                <button 
                  onClick={() => onTogglePassword(item.id)}
                  className="text-slate-500 hover:text-primary transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              className="flex-1 rounded-xl bg-secondary hover:bg-secondary/80 text-[10px] font-black uppercase tracking-widest h-9"
              onClick={() => {
                navigator.clipboard.writeText(item.password);
                toast.success("Senha copiada!");
              }}
            >
              Copiar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Vault() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { isAdmin, isMaster } = useAuth();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [formData, setFormData] = useState<Partial<VaultItem>>({
    title: '', bank: '', account: '', agency: '', username: '', password: '', description: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isAuthenticated) {
      const q = query(collection(db, "vault"), orderBy("order", "asc"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const vaultList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultItem));
          setItems(vaultList);
          setLoading(false);
        },
        (error) => {
          console.error("Vault snapshot error:", error);
          toast.error("Erro ao carregar o cofre: Sem permissão.");
          setLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const vaultConfigRef = doc(db, "config", "vault");
      const vaultConfig = await getDoc(vaultConfigRef);
      
      if (vaultConfig.exists()) {
        const correctPassword = vaultConfig.data().password;
        if (password === correctPassword) {
          setIsAuthenticated(true);
          toast.success("Cofre desbloqueado");
        } else {
          toast.error("Senha do cofre incorreta");
        }
      } else {
        // First time setup fallback if nothing exists yet
        if (password === "admin123") {
          setIsAuthenticated(true);
          toast.info("Atenção: Usando senha padrão. Altere no Painel Master.");
        } else {
          toast.error("Cofre não configurado. Use 'admin123' ou contate o Master.");
        }
      }
    } catch (error: any) {
      toast.error("Erro ao verificar senha: " + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredItems.findIndex(i => i.id === active.id);
    const newIndex = filteredItems.findIndex(i => i.id === over.id);

    const reorderedItems = arrayMove(filteredItems, oldIndex, newIndex);
    
    const batch = writeBatch(db);
    reorderedItems.forEach((item: VaultItem, index) => {
      batch.update(doc(db, "vault", item.id), { order: index });
    });

    try {
      await batch.commit();
      toast.success("Ordem do cofre atualizada");
    } catch (err) {
      console.error("Error updating vault order:", err);
      toast.error("Erro ao sincronizar ordem do cofre");
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateDoc(doc(db, "vault", editingItem.id), {
          ...formData,
          updatedAt: Date.now()
        });
        toast.success("Item atualizado");
      } else {
        const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order || 0)) : -1;
        await addDoc(collection(db, "vault"), {
          ...formData,
          order: maxOrder + 1,
          createdAt: Date.now()
        });
        toast.success("Nova credencial salva");
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ title: '', bank: '', account: '', agency: '', username: '', password: '', description: '' });
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta credencial?")) return;
    try {
      await deleteDoc(doc(db, "vault", id));
      toast.success("Item removido");
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="w-16 h-16 rounded-3xl bg-destructive/10 flex items-center justify-center mb-8 border border-destructive/20">
          <ShieldCheck className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-3xl font-bold mb-2 tracking-tight">Acesso Restrito</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-sm leading-relaxed">
          Os acessos bancários contêm informações sensíveis. Digite a senha administrativa para prosseguir.
        </p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-xs">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="password" 
              placeholder="Senha do Cofre" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-12 py-6 bg-secondary border-border rounded-2xl focus:border-destructive/50"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isVerifying}
            className="bg-destructive text-white hover:bg-destructive/90 rounded-2xl py-6 font-bold tracking-wide"
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Desbloquear Cofre
          </Button>
        </form>
      </div>
    );
  }

  const filteredItems: VaultItem[] = items.filter(item => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Acessos Bancários</h2>
          <p className="text-muted-foreground">Credenciais estratégicas protegidas por camada de segurança master.</p>
        </div>
        <Button 
          onClick={() => {
            setEditingItem(null);
            setFormData({ title: '', bank: '', account: '', agency: '', username: '', password: '', description: '' });
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary rounded-xl gap-2 font-bold px-6"
        >
          <Plus className="w-4 h-4" />
          Nova Credencial
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Localizar credencial por nome ou usuário..." 
          className="pl-12 bg-secondary border-border rounded-2xl focus:border-primary/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-20">
           <Loader2 className="w-12 h-12 animate-spin mb-4" />
           <p className="text-sm font-bold uppercase tracking-widest">Carregando Cofre...</p>
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={filteredItems.map(i => i.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <SortableVaultCard 
                  key={item.id}
                  item={item}
                  isMaster={true}
                  showPassword={!!showPasswords[item.id]}
                  onTogglePassword={togglePassword}
                  onEdit={(item) => {
                    setEditingItem(item);
                    setFormData(item);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal for adding/editing items */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border-slate-100 text-slate-800 shadow-2xl rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tighter italic text-slate-800">
              {editingItem ? 'Refinar Credencial' : 'Novo Registro Seguro'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 italic">
              As informações sensíveis são armazenadas em ambiente seguro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Empresa / Cliente</Label>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Grupo Corporate LTDA"
                className="bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-primary/50 rounded-xl"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Instituição Bancária</Label>
              <Input 
                value={formData.bank} 
                onChange={e => setFormData({...formData, bank: e.target.value})}
                placeholder="Ex: Banco Itaú"
                className="bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-primary/50 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Agência</Label>
                <Input 
                  value={formData.agency} 
                  onChange={e => setFormData({...formData, agency: e.target.value})}
                  placeholder="0001"
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-primary/50 rounded-xl"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Conta (com dígito)</Label>
                <Input 
                  value={formData.account} 
                  onChange={e => setFormData({...formData, account: e.target.value})}
                  placeholder="12345-6"
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-primary/50 rounded-xl"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Usuário / Operador</Label>
                <Input 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  placeholder="Ex: 123.456.789-00"
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-primary/50 rounded-xl"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Senha de Acesso</Label>
                <Input 
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-primary/50 rounded-xl font-mono"
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-4 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl hover:bg-slate-100 text-slate-500">Cancelar</Button>
              <Button type="submit" className="bg-primary text-white hover:bg-primary/95 font-bold px-8 rounded-xl gap-2 uppercase tracking-widest text-xs border-0">
                <Save className="w-4 h-4" />
                {editingItem ? 'Atualizar' : 'Salvar no Cofre'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
