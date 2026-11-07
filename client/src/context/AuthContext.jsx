import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

/**
 * UI-only preview personas for academic demonstration of Owner / Member / Viewer roles.
 * IMPORTANT: These personas are strictly unauthenticated (`isDemo: true`, `isAuthenticated: false`)
 * and are rejected with HTTP 401 by the backend `requireAuth` middleware.
 */
export const DEMO_TRAVELLERS = [
  {
    id: 'demo-naveed',
    fullName: 'Naveed Mushtaq',
    email: 'naveed@routewise.edu',
    roleLabel: 'Trip Owner (Demo Preview)',
    isDemo: true,
    isAuthenticated: false,
    authMode: 'demo_preview',
  },
  {
    id: 'demo-shariq',
    fullName: 'Mohammad Shariq Khawaja',
    email: 'shariq@routewise.edu',
    roleLabel: 'Trip Member (Demo Preview)',
    isDemo: true,
    isAuthenticated: false,
    authMode: 'demo_preview',
  },
  {
    id: 'demo-nayeem',
    fullName: 'Nayeem',
    email: 'nayeem@routewise.edu',
    roleLabel: 'Trip Viewer (Demo Preview)',
    isDemo: true,
    isAuthenticated: false,
    authMode: 'demo_preview',
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(DEMO_TRAVELLERS[0]);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          id: firebaseUser.uid,
          fullName: firebaseUser.displayName || 'RouteWise Traveller',
          email: firebaseUser.email || '',
          roleLabel: 'Authenticated Google Account',
          isDemo: false,
          isAuthenticated: true,
          authMode: 'firebase',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const selectDemoTraveller = (travellerId) => {
    const found = DEMO_TRAVELLERS.find((t) => t.id === travellerId);
    if (found) {
      setCurrentUser(found);
      setAuthError(null);
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        setCurrentUser({
          id: result.user.uid,
          fullName: result.user.displayName || 'RouteWise Traveller',
          email: result.user.email || '',
          roleLabel: 'Authenticated Google Account',
          isDemo: false,
          isAuthenticated: true,
          authMode: 'firebase',
        });
      }
    } catch (error) {
      setAuthError(error.message || 'Google Sign-In could not be completed.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_err) {
      // Fallback to unauthenticated demo preview persona
    }
    setCurrentUser(DEMO_TRAVELLERS[0]);
  };

  /**
   * Returns a real Firebase ID token if and only if a real Firebase session is active.
   * Never returns a synthetic token for demo preview personas.
   */
  const getAccessToken = async () => {
    if (!auth.currentUser) {
      return null;
    }
    return auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser.isAuthenticated),
        isDemo: Boolean(currentUser.isDemo),
        demoTravellers: DEMO_TRAVELLERS,
        selectDemoTraveller,
        signInWithGoogle,
        logout,
        getAccessToken,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
