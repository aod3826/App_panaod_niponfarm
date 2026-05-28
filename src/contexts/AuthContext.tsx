import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { getUserProfile, createUserProfile } from '../services/userService';
import { useBottomSheet } from './BottomSheetContext';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError?: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { showAlert } = useBottomSheet();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let authFlowLoadingTimeout: NodeJS.Timeout | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (authFlowLoadingTimeout) {
        clearTimeout(authFlowLoadingTimeout);
      }

      if (currentUser) {
        setLoading(true);
        setAuthError(null);

        // Fail-safe timeout
        authFlowLoadingTimeout = setTimeout(() => {
          setLoading(false);
        }, 5000); 

        const isOwnerEmail = currentUser.email === 'panaod3826@gmail.com';

        // Listen for profile changes in real-time
        // onSnapshot is generally faster and more resilient than getDoc for the primary app state
        unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), async (snapshot) => {
          if (authFlowLoadingTimeout) clearTimeout(authFlowLoadingTimeout);
          
          if (snapshot.exists()) {
            setUserProfile(snapshot.data() as UserProfile);
            setLoading(false);
          } else {
            // Totally new user or missing profile document
            if (navigator.onLine) {
              const targetRole = isOwnerEmail ? 'ADMIN' : 'STAFF';
              try {
                const newProfile = await createUserProfile(
                  currentUser.uid,
                  currentUser.email || '',
                  currentUser.displayName || 'Unknown',
                  targetRole
                );
                setUserProfile(newProfile);
              } catch (err) {
                console.error("Auto-creation failed:", err);
              }
            } else {
              // Offline and no profile found in cache
              setAuthError('ไม่พบข้อมูลโปรไฟล์ในรูปแบบออฟไลน์');
            }
            // Even if creation fails, we must eventually stop loading
            setLoading(false);
          }
        }, (err) => {
          console.error("Profile sync error:", err);
          setLoading(false);
          if (err.message?.includes('offline')) {
            setAuthError('คุณกำลังใช้งานในโหมดออฟไลน์ ข้อมูลอาจไม่เป็นปัจจุบัน');
          }
        });
      } else {
        setUserProfile(null);
        setLoading(false);
        if (authFlowLoadingTimeout) clearTimeout(authFlowLoadingTimeout);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (authFlowLoadingTimeout) clearTimeout(authFlowLoadingTimeout);
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        showAlert("คุณปิดหน้าต่างล็อกอินก่อนที่จะเสร็จสิ้น กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่ม 'เปิดในแท็บใหม่'");
      } else if (error.code === 'auth/unauthorized-domain') {
        showAlert("โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Console");
      }
      
      // Re-throw so Login.tsx handleLogin can also react
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing in with Email/Password", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
    } catch (error: any) {
      console.error("Error signing up with Email/Password", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, authError, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

