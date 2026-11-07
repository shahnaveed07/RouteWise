import { createContext, useContext, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

const DEMO_TRAVELLERS = [
  {
    id: 'demo-naveed',
    fullName: 'Naveed Mushtaq',
    email: 'naveed@routewise.edu',
    roleLabel: 'Trip Owner (Demo)',
  },
  {
    id: 'demo-shariq',
    fullName: 'Mohammad Shariq Khawaja',
    email: 'shariq@routewise.edu',
    roleLabel: 'Trip Member (Demo)',
  },
  {
    id: 'demo-nayeem',
    fullName: 'Nayeem',
    email: 'nayeem@routewise.edu',
    roleLabel: 'Trip Viewer (Demo)',
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(DEMO_TRAVELLERS[0]);
  const [authError, setAuthError] = useState(null);

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
          fullName: result.user.displayName || 'RouteWise User',
          email: result.user.email || '',
          roleLabel: 'Authenticated Google Account',
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
      // Fallback to default demo account
    }
    setCurrentUser(DEMO_TRAVELLERS[0]);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        demoTravellers: DEMO_TRAVELLERS,
        selectDemoTraveller,
        signInWithGoogle,
        logout,
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
