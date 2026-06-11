import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  getDocs,
  getDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile, UserRole } from "../types";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Users, Shield, Trash2, Search, Loader2, UserCog, Edit2, UserPlus, Info, Key, Eye, EyeOff, Save } from "lucide-react";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { UserModal } from "./UserModal";
import { cn } from "@/lib/utils";

export function Settings() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Vault Management State
  const [vaultPassword, setVaultPassword] = useState("");
  const [showVaultPassword, setShowVaultPassword] = useState(false);
  const [isSavingVault, setIsSavingVault] = useState(false);

  const { profile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setUsers(usersList);
        setLoading(false);
      },
      (error) => {
        console.error("Users list fetch error:", error);
        setLoading(false);
      }
    );

    // Fetch Vault Password
    const fetchVaultConfig = async () => {
      try {
        const vaultRef = doc(db, "config", "vault");
        const vaultDoc = await getDoc(vaultRef);
        if (vaultDoc.exists()) {
          setVaultPassword(vaultDoc.data().password || "");
        }
      } catch (err) {
        console.error("Error fetching vault config:", err);
      }
    };
    fetchVaultConfig();

    return () => unsubscribe();
  }, []);

  const handleSaveVaultPassword = async () => {
    if (!vaultPassword) {
      toast.error("A senha do cofre não pode estar vazia");
      return;
    }
    setIsSavingVault(true);
    try {
      await setDoc(doc(db, "config", "vault"), { 
        password: vaultPassword,
        updatedAt: Date.now(),
        updatedBy: profile?.uid
      }, { merge: true });
      toast.success("Senha do cofre atualizada com sucesso");
    } catch (error: any) {
      toast.error("Erro ao salvar senha do cofre: " + error.message);
    } finally {
      setIsSavingVault(false);
    }
  };

  const handleSaveUser = async (userData: Partial<UserProfile>) => {
    try {
      if (editingUser) {
        // Update existing
        const userRef = doc(db, "users", editingUser.uid);
        await updateDoc(userRef, {
          displayName: userData.displayName,
          role: userData.role,
          jobTitle: userData.jobTitle || ''
        });
        toast.success("Usuário atualizado com sucesso");
      } else {
        // Create skeleton (User must still sign up with this email)
        // We'll use the email as an ID for lookup or just a random ID
        const tempId = `temp_${Date.now()}`;
        const userRef = doc(db, "users", tempId);
        await setDoc(userRef, {
            ...userData,
            uid: tempId,
            createdAt: Date.now(),
            isPlaceholder: true // Added logic in AuthContext could pick this up
        });
        toast.info("Perfil criado. O colaborador deve fazer login com o e-mail informado.");
      }
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(`Falha ao salvar: ${error.message}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === profile?.uid) {
        toast.error("Você não pode alterar seu próprio nível de acesso");
        return;
    }
    
    // Optimistic update
    const previousUsers = [...users];
    setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });
      toast.success(`Usuário agora é ${newRole}`);
    } catch (error: any) {
      console.error("Role update error:", error);
      setUsers(previousUsers); // Rollback
      toast.error("Erro ao atualizar: Verifique suas permissões Master");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === profile?.uid) {
        toast.error("Você não pode excluir a si mesmo");
        return;
    }
    
    const confirmDelete = window.confirm("Tem certeza que deseja remover este colaborador? O acesso dele será revogado imediatamente.");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("Colaborador removido com sucesso");
    } catch (error: any) {
      console.error("Delete user error:", error);
      toast.error(`Erro ao remover: ${error.message || 'Sem permissão'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Painel de Controle Master</h2>
          <p className="text-muted-foreground italic">Gerenciamento central de colaboradores e auditoria de acessos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-bold">{users.length} Colaboradores</span>
          </div>
          <Button 
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="rounded-xl bg-primary text-white hover:bg-primary/95 font-bold gap-2 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Usuário
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* User Management */}
        <div className="col-span-4 lg:col-span-3 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Localizar por nome, cargo ou e-mail..." 
              className="pl-12 bg-white border-slate-200 rounded-2xl h-11 focus:border-primary/50 focus:bg-white text-slate-800"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Cargo / Função</th>
                  <th className="px-6 py-4">Nível de Acesso</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" />
                    </td>
                  </tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img src={user.photoURL} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-150">
                            {user.displayName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="font-bold text-sm truncate flex items-center gap-2">
                             {user.displayName || 'Usuário'}
                             {user.uid === profile?.uid && <span className="bg-secondary text-[9px] px-1.5 py-0.5 rounded italic">Você</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                       <p className="font-medium">{user.jobTitle || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Select 
                        value={user.role} 
                        onValueChange={(val: UserRole) => handleRoleChange(user.uid, val)}
                        disabled={user.uid === profile?.uid}
                      >
                        <SelectTrigger className={cn(
                          "w-36 bg-slate-50 border-slate-200 rounded-xl h-10 text-xs font-bold transition-all text-slate-700",
                          user.role === 'MASTER' ? "text-primary border-primary/30 bg-primary/5" : 
                          user.role === 'ADMIN' ? "text-blue-500 border-blue-500/10 bg-blue-500/5" : ""
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-800">
                          <SelectItem value="MASTER">Master (Acesso Total)</SelectItem>
                          <SelectItem value="ADMIN">Admin (Gestor)</SelectItem>
                          <SelectItem value="USER">Comum (Membro)</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-10 w-10 p-0 border-border bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-xl shadow-sm"
                            onClick={() => {
                              setEditingUser(user);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-10 w-10 p-0 border-border bg-secondary text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl shadow-sm"
                            onClick={() => handleDeleteUser(user.uid)}
                            disabled={user.uid === profile?.uid}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="col-span-4 lg:col-span-1 space-y-6">
           <Card className="bento-card bg-white border-slate-200 overflow-hidden">
              <CardContent className="p-6">
                 <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 opacity-60 text-slate-500">
                    <Key className="w-3 h-3 text-primary" />
                    Senha do Cofre
                 </h3>
                 <div className="space-y-4">
                    <p className="text-[10px] text-slate-500">Esta senha é global e necessária para todos os usuários acessarem o cofre de credenciais.</p>
                    <div className="relative">
                      <Input 
                        type={showVaultPassword ? "text" : "password"}
                        value={vaultPassword}
                        onChange={(e) => setVaultPassword(e.target.value)}
                        placeholder="Nova senha do cofre"
                        className="bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-primary/50 rounded-xl pr-10 text-xs"
                      />
                      <button 
                        onMouseDown={() => setShowVaultPassword(true)}
                        onMouseUp={() => setShowVaultPassword(false)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showVaultPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <Button 
                      onClick={handleSaveVaultPassword}
                      disabled={isSavingVault}
                      className="w-full rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] font-bold h-9 gap-2 border-0 shadow-sm transition-all"
                    >
                      {isSavingVault ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Salvar Senha
                    </Button>
                 </div>
              </CardContent>
           </Card>

           <Card className="bento-card bg-white border-slate-200 overflow-hidden">
              <CardContent className="p-6">
                 <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 opacity-60 text-slate-500">
                    <Shield className="w-3 h-3 text-primary" />
                    Hierarquia
                 </h3>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-primary italic uppercase tracking-tighter">Master</p>
                       <p className="text-[11px] text-slate-500">Controle total, gestão de usuários e segurança.</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter text-slate-700">Admin</p>
                       <p className="text-[11px] text-slate-500">Adiciona, edita e remove links/recursos.</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold opacity-50 uppercase tracking-tighter text-slate-400">Comum</p>
                       <p className="text-[11px] text-slate-400">Apenas visualização e acesso aos links.</p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <Card className="bento-card border-primary/20 bg-[#4ade80]/5">
              <CardContent className="p-6 text-center">
                 <div className="w-10 h-10 rounded-full bg-[#4ade80]/10 flex items-center justify-center mx-auto mb-3">
                    <Info className="w-5 h-5 text-primary" />
                 </div>
                 <h3 className="font-bold text-sm mb-1 text-slate-850">Acesso Remoto</h3>
                 <p className="text-[10px] text-slate-500 mb-4">Ao adicionar um novo usuário, peça para ele logar com o e-mail exato para carregar as permissões.</p>
                 <Button variant="outline" className="w-full rounded-xl border-primary/20 bg-primary/10 text-primary text-[10px] font-bold h-9 hover:bg-primary/20">Ajuda</Button>
              </CardContent>
            </Card>
         </div>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
      />
    </div>
  );
}
