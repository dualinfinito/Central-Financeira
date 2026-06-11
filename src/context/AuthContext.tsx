import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

const getGooglePhotoURL = (user: any): string => {
  if (!user) return '';
  
  if (user.photoURL) return user.photoURL;
  
  if (user.user_metadata) {
    if (user.user_metadata.avatar_url) return user.user_metadata.avatar_url;
    if (user.user_metadata.picture) return user.user_metadata.picture;
    if (user.user_metadata.photoURL) return user.user_metadata.photoURL;
  }
  
  if (user.raw_user_meta_data) {
    if (user.raw_user_meta_data.avatar_url) return user.raw_user_meta_data.avatar_url;
    if (user.raw_user_meta_data.picture) return user.raw_user_meta_data.picture;
    if (user.raw_user_meta_data.photoURL) return user.raw_user_meta_data.photoURL;
  }
  
  if (user.identity_data) {
    if (user.identity_data.avatar_url) return user.identity_data.avatar_url;
    if (user.identity_data.picture) return user.identity_data.picture;
  }
  
  if (user.providerData && user.providerData.length > 0) {
    for (const provider of user.providerData) {
      if (provider.photoURL) return provider.photoURL;
      if (provider.user_metadata?.avatar_url) return provider.user_metadata.avatar_url;
      if (provider.raw_user_meta_data?.avatar_url) return provider.raw_user_meta_data.avatar_url;
    }
  }

  return '';
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isMaster: boolean;
  canEdit: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Unsubscribe from previous profile to avoid leaks
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(user);
      
      if (user) {
        try {
          // Subscribe to profile changes
          const profileRef = doc(db, 'users', user.uid);
          
          // Check if profile exists, if not, create default
          const docSnap = await getDoc(profileRef);
          const isDeveloperEmail = user.email === 'juliakarla2397@gmail.com';
          const capturedPhotoURL = getGooglePhotoURL(user);
          
          if (!docSnap.exists()) {
            // Check for pre-added placeholder by email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', user.email), limit(1));
            
            let querySnap = null;
            try {
              querySnap = await getDocs(q);
            } catch (err) {
              console.error("Erro ao verificar convites/placeholders de usuário:", err);
            }
            
            if (querySnap && !querySnap.empty) {
              const placeholderDoc = querySnap.docs[0];
              const placeholderData = placeholderDoc.data() as any;
              
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || placeholderData.displayName || 'Novo Usuário',
                role: placeholderData.role || 'USER',
                jobTitle: placeholderData.jobTitle || '',
                createdAt: placeholderData.createdAt || Date.now(),
                photoURL: capturedPhotoURL || placeholderData.photoURL || '',
              };
              
              await setDoc(profileRef, newProfile);
              // Only delete if it's actually a placeholder with a different ID
              if (placeholderDoc.id !== user.uid) {
                await deleteDoc(placeholderDoc.ref);
              }
              setProfile(newProfile);
            } else {
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'Novo Usuário',
                role: isDeveloperEmail ? 'MASTER' : 'USER',
                createdAt: Date.now(),
                photoURL: capturedPhotoURL || '',
              };
              await setDoc(profileRef, newProfile);
              setProfile(newProfile);
            }
          } else {
            // If profile exists but lacks photoURL, update it with captured photo
            const existingData = docSnap.data() as UserProfile;
            if (!existingData.photoURL && capturedPhotoURL) {
              await updateDoc(profileRef, { photoURL: capturedPhotoURL });
            }
          }

          unsubProfile = onSnapshot(profileRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              // Force master for developer email if not already
              if (isDeveloperEmail && data.role !== 'MASTER') {
                await updateDoc(profileRef, { role: 'MASTER' });
                // Snapshot will fire again, so we just wait
              } else {
                setProfile(data);
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          }, (err) => {
            console.error("Profile snapshot subscription error:", err);
            setLoading(false);
          });

        } catch (error) {
          console.error("Error loading user profile:", error);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) {
        unsubProfile();
      }
    };
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  const isMaster = profile?.role === 'MASTER';
  const isAdmin = profile?.role === 'ADMIN' || isMaster;
  const canEdit = isAdmin;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      isMaster, 
      canEdit,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
