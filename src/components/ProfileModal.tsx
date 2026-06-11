import { useState, useEffect } from "react";
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
import { User, Mail, Shield, Camera, Loader2, Key, Trash2, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { db, auth as firebaseAuth } from "../lib/firebase";
import { toast } from "sonner";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setJobTitle(profile.jobTitle || '');
      setPhotoURL(profile.photoURL || '');
    }
  }, [profile, isOpen]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Update Firebase Auth
      await updateProfile(user, { 
        displayName, 
        photoURL 
      });

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName,
        photoURL,
        jobTitle,
      });

      toast.success('Perfil atualizado com sucesso!');
      onClose();
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      if (firebaseAuth.currentUser) {
        await updatePassword(firebaseAuth.currentUser, newPassword);
        toast.success('Senha alterada com sucesso!');
        setShowPasswordChange(false);
        setNewPassword('');
      }
    } catch (error: any) {
      toast.error('Erro ao alterar senha. Talvez você precise sair e entrar novamente por segurança.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] bg-white text-slate-800 border-slate-200 shadow-2xl p-5 overflow-hidden rounded-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-xl font-extrabold tracking-tight text-slate-800 italic">MEU PERFIL</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Gerencie suas informações pessoais do ecossistema corporativo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-4 custom-scrollbar max-h-[55vh]">
          {/* Compact Horizontal Info Card */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="relative group shrink-0">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                {photoURL ? (
                  <img src={photoURL} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <span className="text-sm font-bold text-slate-600">
                    {profile?.displayName ? profile.displayName.slice(0, 2).toUpperCase() : 'UF'}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-slate-800 truncate">{profile?.displayName || 'Colaborador'}</h3>
              <div className="inline-flex items-center gap-1 text-[9px] text-primary font-bold uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 mt-1">
                <Shield className="w-2.5 h-2.5" />
                {profile?.role || 'MEMBRO'}
              </div>
            </div>
          </div>

          <div className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">E-mail</Label>
              <Input value={profile?.email} disabled className="bg-slate-50 border-slate-200 text-slate-400 rounded-xl opacity-85 h-10 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Nome Completo</Label>
                <Input 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:border-primary/50 focus:bg-white transition-all h-10 text-xs" 
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Cargo / Função</Label>
                <Input 
                  value={jobTitle} 
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="Ex: Controller Jr."
                  className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:border-primary/50 focus:bg-white transition-all h-10 text-xs" 
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">URL da Foto de Perfil</Label>
              <Input 
                value={photoURL} 
                onChange={e => setPhotoURL(e.target.value)}
                placeholder="https://..."
                className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:border-primary/50 focus:bg-white transition-all h-10 text-xs" 
              />
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-100">
            {!showPasswordChange ? (
              <Button 
                variant="outline" 
                className="w-full rounded-xl border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 gap-2 transition-all h-9 text-xs font-semibold"
                onClick={() => setShowPasswordChange(true)}
              >
                <Key className="w-3.5 h-3.5" />
                Alterar Senha de Acesso
              </Button>
            ) : (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Nova Senha</Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:border-primary/50 focus:bg-white h-9 text-xs"
                  />
                  <Button 
                    variant="destructive" 
                    className="rounded-xl px-4 h-9 text-xs"
                    onClick={handleChangePassword}
                    disabled={loading}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="rounded-xl hover:bg-slate-100 hover:text-slate-800 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 h-10 px-3 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Descartar
          </Button>
          <Button 
            className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-xl h-10 font-bold text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(22,163,74,0.1)] active:scale-95 flex items-center justify-center gap-1.5"
            onClick={handleUpdateProfile}
            disabled={loading}
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
