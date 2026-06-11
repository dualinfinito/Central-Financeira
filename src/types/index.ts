export type Category = 'Bancos' | 'Utilitários' | 'Favoritos' | 'Cofre' | 'Configurações';

export type UserRole = 'MASTER' | 'ADMIN' | 'USER';

export interface LinkItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: Exclude<Category, 'Favoritos' | 'Cofre' | 'Configurações'>;
  logoUrl?: string;
  isFavorite: boolean;
  order: number;
  createdAt: number;
  lastAccessedAt?: number;
  createdBy?: string;
}

export interface VaultItem {
  id: string;
  title: string; // Empresa/Identificador
  bank: string;
  account: string;
  agency: string;
  username: string; // CPF/CNPJ/Usuário
  password: string;
  order: number;
  description?: string;
  createdAt: number;
  url?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  photoURL?: string;
  jobTitle?: string;
  createdAt: number;
}
