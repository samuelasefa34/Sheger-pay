import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, Send, Smartphone, History, LogOut, 
  User, Lock, Eye, EyeOff, CheckCircle, AlertCircle, 
  Loader2, Plus, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';

// ------------------------------------------------------------------
// 1. CONFIGURATION (PASTE YOUR KEYS HERE)
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (Conditional check handles Replit vs Canvas environments)
const app = initializeApp(typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------------------------------------------------------------
// 2. COMPONENTS
// ------------------------------------------------------------------

// --- LOGIN / SIGNUP COMPONENT ---
const AuthScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login Logic
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Signup Logic
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set display name
        await updateProfile(userCredential.user, { displayName: name });
        
        // Create initial "Welcome Bonus" transaction
        const userId = userCredential.user.uid;
        // NOTE: In a real app, use Cloud Functions for this to be secure
        await addDoc(collection(db, `users/${userId}/transactions`), {
          type: 'deposit',
          amount: 1000,
          title: 'Welcome Bonus',
          date: serverTimestamp()
        });
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sheger Pay</h1>
          <p className="text-blue-100 text-sm">Ethiopia's Digital Wallet</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            )}
            
            <div className="relative">
              <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input 
                type={showPass ? "text" : "password"} 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-3.5 text-slate-400">
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex justify-center items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Wallet')}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isLogin ? "No account yet?" : "Already have a wallet?"}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-blue-600 font-bold ml-1 hover:underline"
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// --- DASHBOARD COMPONENT ---
const Dashboard = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); // 'send', 'topup', null
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [processState, setProcessState] = useState('idle'); // idle, processing, success

  // Fetch Transactions from Firestore
  useEffect(() => {
    if (!user) return;

    // NOTE: For simple "One File" mode, we fetch all and sort in JS to avoid index errors
    const q = collection(db, `users/${user.uid}/transactions`);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually by date (newest first)
      docs.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      setTransactions(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Calculate Balance
  const balance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      return t.type === 'deposit' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  // Handle Transactions
  const handleTransaction = async (e) => {
    e.preventDefault();
    setProcessState('processing');

    try {
      if (modalType === 'send') {
        if (parseFloat(amount) > balance) throw new Error("Insufficient Balance");
        
        // Add "Send" Transaction
        await addDoc(collection(db, `users/${user.uid}/transactions`), {
          type: 'withdrawal',
          amount: parseFloat(amount),
          title: `Sent to ${recipient}`,
          date: serverTimestamp()
        });
      } else if (modalType === 'topup') {
        // Add "Top Up" Transaction
        await addDoc(collection(db, `users/${user.uid}/transactions`), {
          type: 'deposit',
          amount: parseFloat(amount),
          title: 'Telebirr Top-Up',
          date: serverTimestamp()
        });
      }

      setProcessState('success');
      setTimeout(() => {
        setModalType(null);
        setProcessState('idle');
        setAmount('');
        setRecipient('');
      }, 2000);

    } catch (err) {
      alert(err.message);
      setProcessState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Top Header */}
      <div className="bg-blue-600 px-6 pt-12 pb-24 rounded-b-[2.5rem] shadow-xl relative">
        <div className="flex justify-between items-center mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-200 text-xs font-medium">Hello,</p>
              <p className="font-bold">{user.displayName || 'User'}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <p className="text-blue-200 text-sm font-medium mb-1">Total Balance</p>
          <h1 className="text-4xl font-bold text-white mb-2">{balance.toLocaleString()} ETB</h1>
        </div>
      </div>

      {/* Floating Action Card */}
      <div className="mx-6 -mt-12 bg-white rounded-2xl p-4 shadow-lg flex justify-around items-center relative z-10">
        <button onClick={() => setModalType('send')} className="flex flex-col items-center gap-2 group">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Send className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-600">Send</span>
        </button>
        <div className="w-px h-10 bg-slate-100"></div>
        <button onClick={() => setModalType('topup')} className="flex flex-col items-center gap-2 group">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-slate-600">Top Up</span>
        </button>
        <div className="w-px h-10 bg-slate-100"></div>
        <button className="flex flex-col items-center gap-2 group">
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
            <History className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-600">History</span>
        </button>
      </div>

      {/* Transactions List */}
      <div className="px-6 mt-8">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
          Recent Transactions
          <span className="text-xs text-blue-600 font-medium cursor-pointer">View All</span>
        </h3>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="space-y-3">
            {transactions.length === 0 ? (
               <div className="text-center text-slate-400 py-8 text-sm">No transactions yet.</div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {t.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{t.title}</p>
                      <p className="text-[10px] text-slate-400">
                         {t.date ? new Date(t.date.seconds * 1000).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${t.type === 'deposit' ? 'text-green-600' : 'text-slate-900'}`}>
                    {t.type === 'deposit' ? '+' : '-'}{t.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-in slide-in-from-bottom-10">
            {processState === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Success!</h3>
                <p className="text-slate-500">Transaction completed successfully.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl">{modalType === 'send' ? 'Send Money' : 'Top Up Wallet'}</h3>
                  <button onClick={() => setModalType(null)} className="p-2 bg-slate-100 rounded-full"><LogOut className="w-4 h-4" /></button>
                </div>
                
                <form onSubmit={handleTransaction} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Amount (ETB)</label>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full p-4 bg-slate-50 rounded-xl text-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0.00"
                      autoFocus
                      required
                    />
                  </div>
                  
                  {modalType === 'send' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Recipient Name</label>
                      <input 
                        type="text" 
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full p-4 bg-slate-50 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Abebe Kebede"
                        required
                      />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={processState === 'processing'}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {processState === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : (modalType === 'send' ? 'Confirm Transfer' : 'Add Funds')}
                  </button>
                  
                  {modalType === 'topup' && (
                    <p className="text-xs text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" /> Secured by Telebirr Gateway
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// --- ROOT APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [init, setInit] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInit(false);
    });
    return unsubscribe;
  }, []);

  if (init) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return user ? <Dashboard user={user} /> : <AuthScreen />;
}


