import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Layout } from './components/Layout';
import { DiagnosticForm } from './components/DiagnosticForm';
import { PatientList } from './components/PatientList';
import { OutbreakDashboard } from './components/OutbreakDashboard';
import { LogIn, Activity, Users, Bell } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'diagnose' | 'patients' | 'alerts'>('diagnose');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        } else {
          // Create default CHV profile if not exists
          const newProfile = {
            uid: u.uid,
            email: u.email,
            role: 'chv',
            name: u.displayName || 'CHV User',
            village: 'Unknown'
          };
          await setDoc(docRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
          <Activity className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2 font-sans tracking-tight">HealthGuard CHV</h1>
        <p className="text-slate-600 mb-8 max-w-xs">
          Empowering Community Health Volunteers with AI-driven diagnostics and outbreak alerts.
        </p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg active:scale-95"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <Layout 
      user={user} 
      profile={userProfile} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      {activeTab === 'diagnose' && <DiagnosticForm user={user} profile={userProfile} />}
      {activeTab === 'patients' && <PatientList />}
      {activeTab === 'alerts' && <OutbreakDashboard profile={userProfile} />}
    </Layout>
  );
}
