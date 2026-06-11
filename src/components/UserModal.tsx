import React, { useState, useEffect } from "react";
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
import { UserProfile, UserRole } from "../types";
import { User, Mail, Shield, Briefcase, Loader2 } from "lucide-react";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<UserProfile>) => void;
  user?: UserProfile | null;
}

export function UserModal({ isOpen, onClose, onSave, user }: UserModalProps) {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: '',
    email: '',
    role: 'USER',
    jobTitle: '',
    photoURL: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        role: user.role || 'USER',
        jobTitle: user.jobTitle || '',
        photoURL: user.photoURL || ''
      });
    } else {
      setFormData({
        displayName: '',
        email: '',
        role: 'USER',
        jobTitle: '',
        photoURL: ''
      });
    }
  }, [user, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSave(formData);
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-white border-slate-100 text-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {user ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {user 
              ? 'Atualize as permissões e informações do colaborador.' 
              : 'Cadastre as informações básicas para um novo membro da equipe.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">E-mail Corporativo</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@empresa.com"
                disabled={!!user}
                className="pl-10 bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:bg-white transition-all focus:border-primary/50"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Nome Completo</Label>
              <Input 
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Nome"
                className="bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:bg-white transition-all focus:border-primary/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Cargo</Label>
              <Input 
                value={formData.jobTitle}
                onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="Ex: Controller"
                className="bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:bg-white transition-all focus:border-primary/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Nível de Acesso</Label>
            <Select 
              value={formData.role} 
              onValueChange={(val: UserRole) => setFormData({ ...formData, role: val })}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-700 rounded-xl focus:ring-primary/50">
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-800">
                <SelectItem value="MASTER">Master (Acesso Total)</SelectItem>
                <SelectItem value="ADMIN">Admin (Gestão de Links)</SelectItem>
                <SelectItem value="USER">User (Apenas Visualização)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl hover:bg-slate-100 text-slate-500">Cancelar</Button>
            <Button 
              type="submit" 
              className="bg-primary text-white hover:bg-primary/95 rounded-xl px-6 font-bold transition-all border-0 shadow-sm"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
