import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { ShieldCheck, Mail, Lock, User, Github, Globe, Loader2, ArrowRight, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bem-vindo de volta!');
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
        toast.success('Conta criada com sucesso!');
      }
    } catch (error: any) {
      console.error('Auth Error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login com e-mail/senha não está habilitado no Firebase Console. Por favor, habilite o provider "E-mail/senha" nas configurações de Authentication.');
      } else {
        toast.error(error.message || 'Erro na autenticação');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login com Google não está habilitado no Firebase Console. Por favor, habilite o provider "Google" nas configurações de Authentication.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('O popup foi bloqueado pelo seu navegador. Por favor, permita popups para este site.');
      } else {
        toast.error(`Erro ao entrar com Google: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Digite seu e-mail para recuperar a senha');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('E-mail de recuperação enviado!');
    } catch (error) {
      toast.error('Erro ao enviar e-mail de recuperação');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(34,197,94,0.1),transparent_70%)] pointer-events-none" />
      
      <Card className="w-full max-w-md bento-card glass animate-in fade-in zoom-in-95 duration-500 overflow-hidden relative z-10">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6 relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
              <Link2 className="text-white w-8 h-8 relative z-10 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2 uppercase text-slate-800 text-center">
              HUB DE <span className="text-primary">LINKS</span> CORPORATIVOS
            </h1>
            <p className="text-muted-foreground text-sm text-center">
              Acesso à plataforma corporativa dos principais utilitários
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Seu nome" 
                    className="pl-12 bg-secondary border-border rounded-xl focus:border-primary/50 h-12"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">E-mail Corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="nome@empresa.com" 
                  className="pl-12 bg-secondary border-border rounded-xl focus:border-primary/50 h-12"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Senha</Label>
                {isLogin && (
                  <button 
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[10px] uppercase font-bold text-primary hover:underline"
                  >
                    Esqueceu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-12 bg-secondary border-border rounded-xl focus:border-primary/50 h-12"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-bold gap-2 mt-4 transition-all hover:scale-[1.02] active:scale-95"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Entrar Agora' : 'Criar Conta')}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </Button>
          </form>

          <div className="mt-8 flex items-center gap-4 py-2">
            <div className="flex-1 h-[1px] bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ou continue com</span>
            <div className="flex-1 h-[1px] bg-border" />
          </div>

          <div className="grid grid-cols-1 mt-6">
            <Button 
              variant="outline" 
              className="bg-secondary border-border hover:bg-secondary/70 text-foreground rounded-xl h-12 gap-2"
              onClick={handleGoogleSignIn}
            >
              <Globe className="w-5 h-5" />
              Google Workspace
            </Button>
          </div>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já possui conta? Faça login'}
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center relative z-10">
        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500">
          Desenvolvido por Júlia Lins e Talysson Santos
        </p>
      </div>
    </div>
  );
}
