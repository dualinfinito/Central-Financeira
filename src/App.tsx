import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { LinkCard } from "./components/LinkCard";
import { AddLinkModal } from "./components/AddLinkModal";
import { Vault } from "./components/Vault";
import { Settings } from "./components/Settings";
import { Auth } from "./components/Auth";
import { ProfileModal } from "./components/ProfileModal";
import { Category, LinkItem } from "./types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./components/ui/card";
import { 
  Search, 
  Bell, 
  Settings as SettingsIcon, 
  Plus, 
  Grid2X2, 
  List, 
  ArrowUpRight,
  TrendingUp,
  Activity,
  History,
  LayoutDashboard,
  ShieldAlert,
  Loader2,
  GripVertical,
  Menu,
  X
} from "lucide-react";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import { Separator } from "./components/ui/separator";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster, toast } from 'sonner';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy, writeBatch } from "firebase/firestore";
import { db } from "./lib/firebase";
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
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  key?: string | number;
  link: LinkItem;
  isMaster: boolean;
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
}

function SortableLinkCard({ link, onToggleFavorite, onEdit, onDelete }: Omit<SortableItemProps, 'isMaster'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="col-span-4 md:col-span-2 lg:col-span-1 relative group/sortable">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/sortable:opacity-40 hover:opacity-100 cursor-grab active:cursor-grabbing p-1 z-10"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="pl-4">
        <LinkCard 
          link={link} 
          onToggleFavorite={onToggleFavorite}
          onClick={(id) => console.log('Accessed:', id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function DashboardContent() {
  const { profile, user, isAdmin, isMaster, loading: authLoading } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category>('Bancos');
  const [searchQuery, setSearchQuery] = useState('');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Persistence to Firestore
  useEffect(() => {
    if (!user) return;
    // Sort by order first, then creation date
    const q = query(collection(db, "links"), orderBy("order", "asc"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const linksList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LinkItem));
        setLinks(linksList);
        setLoading(false);
      },
      (error) => {
        console.error("Links snapshot error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredLinks: LinkItem[] = useMemo(() => {
    return links.filter(link => {
      const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            link.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (searchQuery.trim() !== '') {
        return matchesSearch;
      }
      
      if (activeCategory === 'Favoritos') return link.isFavorite && matchesSearch;
      if (activeCategory === 'Cofre' || activeCategory === 'Configurações') return false;
      return link.category === activeCategory && matchesSearch;
    });
  }, [links, activeCategory, searchQuery]);

  const handleToggleFavorite = async (id: string) => {
    const link = links.find(l => l.id === id);
    if (!link) return;
    try {
      await updateDoc(doc(db, "links", id), { isFavorite: !link.isFavorite });
      toast.info(link.isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } catch (e) {
      toast.error('Erro ao favoritar');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredLinks.findIndex(l => l.id === active.id);
    const newIndex = filteredLinks.findIndex(l => l.id === over.id);

    const reorderedLinks = arrayMove(filteredLinks, oldIndex, newIndex);
    
    // Update state locally for immediate feedback
    // We only update the order for the items in the current filtered view
    // to avoid messing up other categories if they share orders (unlikely with this logic)
    const batch = writeBatch(db);
    
    reorderedLinks.forEach((link: LinkItem, index) => {
      batch.update(doc(db, "links", link.id), { order: index });
    });

    try {
      await batch.commit();
      toast.success("Ordem atualizada");
    } catch (err) {
      console.error("Error updating order:", err);
      toast.error("Erro ao sincronizar ordem");
    }
  };

  const handleSaveLink = async (formData: Partial<LinkItem>) => {
    try {
      if (editingLink) {
        await updateDoc(doc(db, "links", editingLink.id), formData);
        toast.success('Link atualizado com sucesso');
      } else {
        // Find max order in current category to append
        const categoryLinks = links.filter(l => l.category === formData.category);
        const maxOrder = categoryLinks.length > 0 ? Math.max(...categoryLinks.map(l => l.order || 0)) : -1;
        
        await addDoc(collection(db, "links"), {
          ...formData,
          order: maxOrder + 1,
          createdAt: Date.now(),
          createdBy: user?.uid,
        });
        toast.success('Link publicado com sucesso');
      }
      setEditingLink(null);
    } catch (e) {
      toast.error('Erro ao salvar link');
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Você tem certeza que deseja excluir este link?')) return;
    try {
      await deleteDoc(doc(db, "links", id));
      toast.success('Link removido');
    } catch (e) {
      toast.error('Erro ao remover link');
    }
  };

  const handleEditLink = (link: LinkItem) => {
    setEditingLink(link);
    setIsAddModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center p-8 text-center italic opacity-40">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold tracking-widest uppercase">Iniciando Hub...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory} 
        onOpenProfile={() => setIsProfileOpen(true)}
        onQuickAdd={() => {
          setEditingLink(null);
          setIsAddModalOpen(true);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-25 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] border-b border-border flex items-center justify-between px-4 sm:px-8 bg-background/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-700 lg:hidden focus:outline-none"
              title="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Pesquisar links..." 
                className="pl-12 bg-secondary/50 border-border rounded-xl focus:border-primary/50 h-10 transition-all text-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4 sm:ml-8">
            <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground relative">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full glow-primary" />
            </button>
            <Separator orientation="vertical" className="h-6 mx-1 sm:mx-2 opacity-10" />
            <div 
              className="flex items-center gap-3 pl-1 sm:pl-2 cursor-pointer group"
              onClick={() => setIsProfileOpen(true)}
            >
              <div className="text-right hidden sm:block">
                <p className="text-[13px] font-bold leading-none group-hover:text-primary transition-colors underline decoration-primary/0 group-hover:decoration-primary/50">{profile?.displayName}</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">{profile?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:border-primary/50 transition-all overflow-hidden shrink-0">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="text-xs font-extrabold text-slate-600">
                    {profile?.displayName ? profile.displayName.slice(0, 2).toUpperCase() : 'UF'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_50%_-20%,rgba(34,197,94,0.04),transparent_60%)]">
          <div className="p-8 max-w-[1400px] mx-auto">
            {searchQuery.trim() !== '' ? (
              <div className="grid grid-cols-4 gap-5 animate-in fade-in duration-500">
                <div className="col-span-4 flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Busca Global: "{searchQuery}"
                  </h2>
                </div>

                {filteredLinks.length > 0 ? (
                  <div className="col-span-4 grid grid-cols-4 gap-5">
                    {filteredLinks.map((link) => (
                      <div key={link.id} className="col-span-4 md:col-span-2 lg:col-span-1">
                        <LinkCard 
                          link={link} 
                          onToggleFavorite={handleToggleFavorite}
                          onClick={(id) => console.log('Accessed:', id)}
                          onEdit={handleEditLink}
                          onDelete={handleDeleteLink}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="col-span-4 py-20 bento-card flex flex-col items-center justify-center border-dashed">
                    <Search className="w-8 h-8 text-slate-400 mb-4 opacity-50" />
                    <p className="text-sm font-semibold text-slate-500">Nenhum link encontrado</p>
                  </div>
                )}
              </div>
            ) : activeCategory === 'Cofre' ? (
              <Vault />
            ) : activeCategory === 'Configurações' ? (
              <Settings />
            ) : (
              <div className="grid grid-cols-4 gap-5 animate-in fade-in duration-500">
                <div className="col-span-4 flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {activeCategory === 'Favoritos' ? 'Meus Favoritos' : `Acessos Rápidos: ${activeCategory}`}
                  </h2>
                  <div className="flex items-center gap-3">
                    {(isAdmin || ['Bancos', 'Utilitários'].includes(activeCategory)) && (
                      <Button 
                        onClick={() => {
                          setEditingLink(null);
                          setIsAddModalOpen(true);
                        }}
                        className="bg-primary text-black hover:bg-primary/90 h-9 rounded-lg px-4 text-[13px] font-extrabold shadow-lg shadow-primary/10"
                      >
                        + Novo Link
                      </Button>
                    )}
                  </div>
                </div>

                {filteredLinks.length > 0 ? (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={filteredLinks.map(l => l.id)}
                      strategy={rectSortingStrategy}
                    >
                      {filteredLinks.map((link) => (
                        <SortableLinkCard 
                          key={link.id}
                          link={link} 
                          onToggleFavorite={handleToggleFavorite}
                          onEdit={handleEditLink}
                          onDelete={handleDeleteLink}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="col-span-4 py-20 bento-card flex flex-col items-center justify-center border-dashed">
                    <Search className="w-8 h-8 text-slate-400 mb-4 opacity-50" />
                    <p className="text-sm font-semibold text-slate-500">Nenhum link encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <footer className="mt-auto py-6 px-8 border-t border-border/40 text-center">
            <p className="text-[10px] uppercase font-medium tracking-[0.2em] text-slate-500">
              Desenvolvido por Júlia Lins e Talysson Santos
            </p>
          </footer>
        </div>
      </main>

      <AddLinkModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingLink(null);
        }} 
        onSave={handleSaveLink}
        editingLink={editingLink}
        defaultCategory={activeCategory}
      />

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
      <Toaster position="top-right" theme="light" richColors closeButton />
    </AuthProvider>
  );
}
