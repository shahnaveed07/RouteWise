import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

const DEV_E2E_STORAGE_KEY = 'ROUTEWISE_DEV_E2E_AUTH';
const DEV_E2E_TOKEN = 'e2e-local-playwright-token';

function isDevLoopbackE2EEnabled() {
  if (typeof window === 'undefined') return false;
  if (import.meta.env && import.meta.env.PROD) return false;
  const host = window.location?.hostname || '';
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  try {
    return isLocal && window.localStorage.getItem(DEV_E2E_STORAGE_KEY) === '1';
  } catch (_err) {
    return false;
  }
}

/**
 * UI-only preview personas for academic demonstration of Owner / Member / Viewer roles.
 * IMPORTANT: These personas are strictly unauthenticated (`isDemo: true`, `isAuthenticated: false`)
 * and never receive an access token or make protected API mutations.
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
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isCancelled) return;

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
        setAuthReady(true);
        return;
      }

      if (isDevLoopbackE2EEnabled()) {
        try {
          const res = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${DEV_E2E_TOKEN}`,
            },
          });
          if (!isCancelled && res.ok) {
            setCurrentUser({
              id: 'e2e-playwright-verifier',
              fullName: 'RouteWise E2E Verifier',
              email: 'e2e.verifier@routewise.test',
              roleLabel: 'Authenticated E2E Session',
              isDemo: false,
              isAuthenticated: true,
              authMode: 'dev_e2e',
            });
            setAuthReady(true);
            return;
          }
        } catch (_err) {
          // Server rejected or unreachable; fall back to unauthenticated demo mode
        }
        try {
          window.localStorage.removeItem(DEV_E2E_STORAGE_KEY);
        } catch (_ignore) {
          // ignore storage error
        }
      }

      if (!isCancelled) {
        setCurrentUser((prev) => (prev.isDemo ? prev : DEMO_TRAVELLERS[0]));
        setAuthReady(true);
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  const selectDemoTraveller = useCallback((travellerId) => {
    const found = DEMO_TRAVELLERS.find((t) => t.id === travellerId);
    if (found) {
      setCurrentUser(found);
      setAuthError(null);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
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
  }, []);

  const logout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DEV_E2E_STORAGE_KEY);
      }
      await signOut(auth);
    } catch (_err) {
      // Fallback to unauthenticated demo preview persona
    }
    setCurrentUser(DEMO_TRAVELLERS[0]);
  }, []);

  /**
   * Returns a real Firebase ID token if and only if a real Firebase session is active
   * (or the local loopback E2E verification flag is set on localhost).
   * Never returns a token for demo preview personas.
   */
  const getAccessToken = useCallback(async () => {
    if (currentUser.isDemo || !currentUser.isAuthenticated) {
      return null;
    }
    if (auth.currentUser) {
      return auth.currentUser.getIdToken();
    }
    if (currentUser.authMode === 'dev_e2e' && isDevLoopbackE2EEnabled()) {
      return DEV_E2E_TOKEN;
    }
    return null;
  }, [currentUser.isDemo, currentUser.isAuthenticated, currentUser.authMode]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authReady,
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
