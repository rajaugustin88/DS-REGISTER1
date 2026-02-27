import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LanguageSelector } from './components/LanguageSelector';
import { SLOGANS, TRANSLATIONS, SERVICE_CATEGORIES, LANGUAGES } from './constants';
import { Language, BusinessProfile, Transaction } from './types';
import { LogIn, Upload, Plus, Trash2, CheckCircle2, User, History, LogOut, Search, X, ChevronLeft, ChevronRight, Settings, Phone, Globe, Calendar, Clock, ChevronDown, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getUserProfile, saveUserProfile, getUserHistory, saveTransaction, updateTransactionStatus, clearUserHistory } from './lib/dataService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { THEMES } from './constants';
import { ThemeId } from './types';

// --- Helpers ---

const getBase64ImageFromUrl = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const generateReceiptPDF = async (tx: Transaction, profile: BusinessProfile | null, theme: ThemeId) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const { photoURL } = getUserInfo();
  const isDark = theme === 'dark';

  // Pick a random slogan
  const randomSlogan = SLOGANS[Math.floor(Math.random() * SLOGANS.length)];

  // Header Background
  const headerBg = isDark ? [37, 211, 102] : [232, 240, 254]; // WhatsApp Green vs Google Pay Soft Blue
  const headerText = isDark ? [255, 255, 255] : [33, 37, 41];
  
  // Calculate dynamic header height
  doc.setFontSize(9);
  const addressLines = doc.splitTextToSize(profile?.address || '', pageWidth - 40);
  const headerHeight = 65 + (addressLines.length > 1 ? (addressLines.length - 1) * 5 : 0);

  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Logo
  if (photoURL) {
    try {
      const base64 = await getBase64ImageFromUrl(photoURL);
      doc.addImage(base64, 'JPEG', pageWidth / 2 - 10, 8, 20, 20, undefined, 'FAST');
    } catch (e) {
      console.error("Failed to load logo for PDF", e);
    }
  }
  
  let currentY = photoURL ? 36 : 20;

  // Header Text
  doc.setTextColor(headerText[0], headerText[1], headerText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(profile?.businessName || 'DS-REGISTER', pageWidth / 2, currentY, { align: 'center' });
  
  // Slogan
  currentY += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(randomSlogan, pageWidth / 2, currentY, { align: 'center' });

  // Address (Wrapped)
  currentY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  addressLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  });

  // Contact Info
  doc.text(`Mobile: ${profile?.mobileNumber || ''} | Email: ${profile?.email || ''}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  if (profile?.gstNumber) {
    doc.text(`GST: ${profile.gstNumber}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  // Receipt Info
  const startY = headerHeight + 15;
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT', 15, startY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Receipt No: ${tx.receiptNumber || tx.id.substring(0, 8)}`, 15, startY + 8);
  const dateStr = tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : new Date(tx.createdAt || Date.now()).toLocaleString();
  doc.text(`Date: ${dateStr}`, 15, startY + 14);

  // Customer Info
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', 15, startY + 28);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name:`, 15, startY + 36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${tx.customerName}`, 45, startY + 36);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Mobile:`, 15, startY + 42);
  doc.text(`${tx.customerMobile || '-'}`, 45, startY + 42);
  
  if (tx.vehicleNumber) {
    doc.text(`Vehicle No:`, 15, startY + 48);
    doc.text(`${tx.vehicleNumber}`, 45, startY + 48);
  }
  if (tx.remarks) {
    doc.text(`Remarks:`, 15, startY + 54);
    doc.text(`${tx.remarks}`, 45, startY + 54);
  }

  // Services Table
  autoTable(doc, {
    startY: startY + 62,
    head: [['Service Name', 'Price (INR)']],
    body: tx.services.map(s => [s.name, s.price.toFixed(2)]),
    theme: 'striped',
    headStyles: { fillColor: isDark ? [37, 211, 102] : [26, 188, 156], textColor: [255, 255, 255] },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 15, right: 15 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Totals Section
  const rightAlignX = pageWidth - 15;
  const labelX = pageWidth - 75;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  
  doc.text(`Subtotal:`, labelX, finalY);
  const subtotalVal = tx.subtotal ?? tx.services.reduce((a, b) => a + b.price, 0);
  doc.text(`INR ${subtotalVal.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });

  const taxVal = tx.tax ?? (tx.totalAmount - subtotalVal);
  currentY = finalY;
  if (taxVal > 0) {
    currentY += 8;
    doc.text(`Tax:`, labelX, currentY);
    doc.text(`INR ${taxVal.toFixed(2)}`, rightAlignX, currentY, { align: 'right' });
  }

  currentY += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`TOTAL AMOUNT:`, labelX, currentY);
  doc.text(`INR ${tx.totalAmount.toFixed(2)}`, rightAlignX, currentY, { align: 'right' });

  currentY += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0); // Green for paid
  doc.text(`Amount Paid:`, labelX, currentY);
  doc.text(`INR ${(tx.amountPaid || 0).toFixed(2)}`, rightAlignX, currentY, { align: 'right' });

  if (tx.dueAmount > 0) {
    currentY += 8;
    doc.setTextColor(255, 0, 0); // Red for due
    doc.text(`Due Amount:`, labelX, currentY);
    doc.text(`INR ${tx.dueAmount.toFixed(2)}`, rightAlignX, currentY, { align: 'right' });
  }

  currentY += 15;
  if (tx.paymentStatus === 'Unpaid' || tx.dueAmount > 0) {
    doc.setTextColor(255, 0, 0);
  } else {
    doc.setTextColor(0, 128, 0);
  }
  doc.setFontSize(11);
  doc.text(`Payment Status: ${tx.paymentStatus.toUpperCase()}`, 15, currentY);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

  doc.save(`Receipt_${tx.customerName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};

const generateTransactionsPDF = async (history: Transaction[], profile: BusinessProfile | null, title: string, filename: string, theme: ThemeId) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const { photoURL } = getUserInfo();
  const isDark = theme === 'dark';

  // Header Background
  const headerBg = isDark ? [37, 211, 102] : [232, 240, 254];
  const headerText = isDark ? [255, 255, 255] : [33, 37, 41];
  
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Logo
  if (photoURL) {
    try {
      const base64 = await getBase64ImageFromUrl(photoURL);
      doc.addImage(base64, 'JPEG', pageWidth / 2 - 8, 6, 16, 16, undefined, 'FAST');
    } catch (e) {
      console.error("Failed to load logo for PDF", e);
    }
  }
  
  doc.setTextColor(headerText[0], headerText[1], headerText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(profile?.businessName || 'DS-REGISTER', pageWidth / 2, photoURL ? 28 : 15, { align: 'center' });
  
  // Slogan
  const randomSlogan = SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
  doc.setFontSize(9);
  doc.text(randomSlogan, pageWidth / 2, photoURL ? 33 : 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text(title, pageWidth / 2, photoURL ? 42 : 29, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, photoURL ? 48 : 35, { align: 'center' });

  const tableData = history.map((tx, index) => [
    index + 1,
    `${tx.customerName}\n${tx.customerMobile || ''}`,
    tx.vehicleNumber || '-',
    tx.services.map(s => s.name).join(', '),
    `₹${tx.totalAmount.toFixed(2)}`,
    `₹${(tx.amountPaid || 0).toFixed(2)}`,
    `₹${(tx.dueAmount || 0).toFixed(2)}`,
    tx.paymentStatus.toUpperCase(),
    tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('en-IN') : new Date(tx.createdAt || Date.now()).toLocaleDateString('en-IN')
  ]);

  autoTable(doc, {
    startY: 65,
    head: [['#', 'Customer', 'Vehicle', 'Services', 'Total', 'Paid', 'Due', 'Status', 'Date']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: isDark ? [37, 211, 102] : [26, 188, 156], fontSize: 8, textColor: [255, 255, 255] },
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 35 },
      4: { cellWidth: 18 },
      5: { cellWidth: 18 },
      6: { cellWidth: 18 },
      7: { cellWidth: 18 },
      8: { cellWidth: 20 }
    }
  });

  doc.save(filename);
};

// --- Helpers ---

const getUserInfo = () => {
  const user = auth.currentUser;
  if (!user) return { photoURL: null, initials: 'DS', displayName: 'User' };
  
  const initials = user.displayName 
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : user.email?.substring(0, 2).toUpperCase() || 'DS';
    
  return {
    photoURL: user.photoURL,
    initials,
    displayName: user.displayName || 'User'
  };
};

const BusinessLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  const { photoURL, initials } = getUserInfo();
  
  return (
    <div className={`${className} rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center overflow-hidden shadow-sm shrink-0`}>
      {photoURL ? (
        <img src={photoURL} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-primary font-black text-xs">{initials}</span>
      )}
    </div>
  );
};

// --- Components ---

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
}

function ProfileDropdown({ profile, onLogout, lang, setLang, currentTheme, setTheme }: { 
  profile: BusinessProfile | null, 
  onLogout: () => void, 
  lang: Language, 
  setLang: (l: Language) => void,
  currentTheme: ThemeId,
  setTheme: (t: ThemeId) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowLanguages(false);
        setShowThemes(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-primary/10 transition-all border border-white/30 bg-primary/5"
      >
        <BusinessLogo className="w-10 h-10" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 mt-3 w-64 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden origin-top-left"
          >
            <div className="px-5 py-4 border-b border-border bg-background/30">
              <p className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">Business Profile</p>
              <p className="text-sm font-black text-text break-words">{profile?.businessName || 'DS-REGISTER'}</p>
              <p className="text-[0.625rem] text-text/50 font-bold mt-0.5">{profile?.mobileNumber || 'No mobile set'}</p>
            </div>

            <div className="py-2">
              <button 
                onClick={() => { navigate('/setup'); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-text hover:bg-primary/5 transition-colors"
              >
                <Settings className="w-4 h-4 text-text/40" /> {t.editProfile}
              </button>
              <button 
                onClick={() => { navigate('/history'); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-text hover:bg-primary/5 transition-colors"
              >
                <History className="w-4 h-4 text-text/40" /> {t.history}
              </button>

              <div className="border-t border-border my-1"></div>

              {/* Theme Section */}
              <div className="px-2">
                <button 
                  onClick={() => { setShowThemes(!showThemes); setShowLanguages(false); }}
                  className="w-full flex items-center justify-between px-3 py-3 text-sm font-bold text-text hover:bg-primary/5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Palette className="w-4 h-4 text-text/40" />
                    <span>{t.theme}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-text/30 transition-transform duration-200 ${showThemes ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showThemes && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-background/50 rounded-xl mt-1"
                    >
                      {THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => setTheme(theme.id)}
                          className={`w-full text-left px-10 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${
                            currentTheme === theme.id ? 'text-primary bg-primary/10' : 'text-text/60 hover:text-text hover:bg-primary/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                            {theme.name}
                          </div>
                          {currentTheme === theme.id && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Language Section */}
              <div className="px-2">
                <button 
                  onClick={() => { setShowLanguages(!showLanguages); setShowThemes(false); }}
                  className="w-full flex items-center justify-between px-3 py-3 text-sm font-bold text-text hover:bg-primary/5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-text/40" />
                    <span>{t.language}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-text/30 transition-transform duration-200 ${showLanguages ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showLanguages && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-background/50 rounded-xl mt-1"
                    >
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLang(l.code as Language);
                          }}
                          className={`w-full text-left px-10 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${
                            lang === l.code ? 'text-primary bg-primary/10' : 'text-text/60 hover:text-text hover:bg-primary/5'
                          }`}
                        >
                          {l.name}
                          {lang === l.code && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border-t border-border mt-2 pt-2">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> {t.logout}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// --- Page 1: Login ---
function LoginPage({ lang, setLang, theme, setTheme }: { 
  lang: Language, 
  setLang: (l: Language) => void,
  theme: ThemeId,
  setTheme: (t: ThemeId) => void
}) {
  const navigate = useNavigate();
  const slogan = useMemo(() => SLOGANS[Math.floor(Math.random() * SLOGANS.length)], []);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          navigate('/billing');
        } else {
          navigate('/setup');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("User closed the popup");
      } else {
        console.error("Google login failed:", error);
        alert("Login failed: " + (error.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      alert("Authentication failed: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] py-10">
        <div className="w-full max-w-md p-10 bg-card border border-border rounded-2xl shadow-soft">
          <div className="teal-gradient px-8 py-4 rounded-2xl mb-10 w-full text-center shadow-soft">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Welcome</h2>
          </div>
          
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-4 px-8 py-4 bg-input border border-border rounded-2xl hover:bg-background transition-all shadow-soft active:scale-[0.98] group mb-8 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
            <span className="font-bold text-text group-hover:text-primary transition-colors">
              {loading ? 'Connecting...' : 'Login with Google'}
            </span>
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-4 text-text/40 font-black tracking-widest">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">Email Address</label>
              <input 
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-3 bg-input border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-text"
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">Password</label>
              <input 
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-5 py-3 bg-input border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-text"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-black rounded-xl hover:opacity-90 transition-all shadow-soft uppercase tracking-widest text-sm mt-4"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Login')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-bold text-primary hover:underline"
            >
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
        
        <div className="mt-16 text-center max-w-sm px-6">
          <p className="text-text/40 italic font-medium leading-relaxed">
            "{slogan}"
          </p>
        </div>
      </div>
    </Layout>
  );
}

// --- Page 2: Profile Setup ---
function SetupPage({ lang, setLang, theme, setTheme }: { 
  lang: Language, 
  setLang: (l: Language) => void,
  theme: ThemeId,
  setTheme: (t: ThemeId) => void
}) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<Partial<BusinessProfile>>({
    businessName: '',
    mobileNumber: '',
    email: '',
    address: '',
    gstNumber: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setFormData(profile);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.businessName?.trim()) newErrors.businessName = "Business name is required";
    if (!formData.mobileNumber?.trim()) newErrors.mobileNumber = "Mobile number is required";
    if (!formData.address?.trim()) newErrors.address = "Address is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    if (!validate()) return;

    setSaving(true);
    try {
      const finalData: BusinessProfile = {
        businessName: formData.businessName!.trim(),
        mobileNumber: formData.mobileNumber!.trim(),
        email: formData.email?.trim() || '',
        address: formData.address!.trim(),
        gstNumber: formData.gstNumber?.trim() || ''
      };

      await saveUserProfile(user.uid, finalData);
      navigate('/billing');
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      alert("Failed to save profile: " + (error.message || "Please try again."));
      setSaving(false); // Re-enable button on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="teal-gradient px-8 py-4 rounded-2xl inline-block mb-10 shadow-soft">
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{t.setupTitle}</h2>
        </div>
        
        <div className="flex items-center gap-6 mb-10 bg-card p-6 rounded-2xl border border-border shadow-soft">
          <BusinessLogo className="w-20 h-20" />
          <div>
            <h3 className="text-lg font-black text-text tracking-tighter uppercase">Business Identity</h3>
            <p className="text-xs text-text/50 font-bold">Using your Google profile photo as business logo</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-card p-8 rounded-2xl border border-border shadow-soft space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-text/50 uppercase tracking-widest">{t.businessName}</label>
                <input
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-4 bg-input border ${errors.businessName ? 'border-red-500' : 'border-border'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-text`}
                  placeholder="Enter business name"
                />
                {errors.businessName && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight">{errors.businessName}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-text/50 uppercase tracking-widest">{t.mobileNumber}</label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-4 bg-input border ${errors.mobileNumber ? 'border-red-500' : 'border-border'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-text`}
                  placeholder="Enter mobile number"
                />
                {errors.mobileNumber && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight">{errors.mobileNumber}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text/50 uppercase tracking-widest">{t.email}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-5 py-4 bg-input border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-text"
                placeholder="Enter business email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text/50 uppercase tracking-widest">{t.address}</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-5 py-4 bg-input border ${errors.address ? 'border-red-500' : 'border-border'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none font-bold text-text`}
                placeholder="Enter business address"
              />
              {errors.address && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight">{errors.address}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text/50 uppercase tracking-widest">
                {t.gstNumber} <span className="text-text/30 font-bold lowercase">{t.optional}</span>
              </label>
              <input
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleInputChange}
                className="w-full px-5 py-4 bg-input border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase font-bold text-text"
                placeholder="Enter GST number"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-5 bg-primary text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-soft active:scale-[0.99] mt-10 tracking-widest text-lg uppercase flex items-center justify-center gap-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                SAVING...
              </>
            ) : t.submit}
          </button>
        </form>
      </div>
    </Layout>
  );
}

// --- Page 3: Billing ---
function BillingPage({ lang, setLang, theme, setTheme }: { 
  lang: Language, 
  setLang: (l: Language) => void,
  theme: ThemeId,
  setTheme: (t: ThemeId) => void
}) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customer, setCustomer] = useState({
    name: '',
    mobile: '',
    vehicleNumber: '',
    remarks: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState<{ name: string, price: number }[]>([]);
  const [gstPercent, setGstPercent] = useState<number | ''>('');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const p = await getUserProfile(user.uid);
        if (!p) {
          navigate('/setup');
        } else {
          setProfile(p);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const allServices = useMemo(() => {
    return Object.entries(SERVICE_CATEGORIES).flatMap(([category, services]) => 
      services.map(s => ({ name: s, category }))
    );
  }, []);

  const filteredServices = useMemo(() => {
    if (!searchQuery) return [];
    return allServices.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, allServices]);

  const subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const gstAmount = gstPercent ? (subtotal * (gstPercent / 100)) : 0;
  const total = subtotal + gstAmount;

  const handleAddService = (name: string) => {
    if (!selectedServices.find(s => s.name === name)) {
      setSelectedServices([...selectedServices, { name, price: 0 }]);
    }
    setSearchQuery('');
  };

  const handleRemoveService = (name: string) => {
    setSelectedServices(selectedServices.filter(s => s.name !== name));
  };

  const handlePriceChange = (name: string, price: number) => {
    setSelectedServices(selectedServices.map(s => s.name === name ? { ...s, price } : s));
  };

  const handlePrint = async () => {
    const currentTx: any = {
      customerName: customer.name || 'Customer',
      customerMobile: customer.mobile || '',
      vehicleNumber: customer.vehicleNumber,
      remarks: customer.remarks,
      services: selectedServices,
      subtotal: subtotal,
      tax: gstAmount,
      totalAmount: total,
      paymentStatus: 'Unpaid'
    };
    await generateReceiptPDF(currentTx, profile, theme);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!customer.name?.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (selectedServices.length === 0) {
      newErrors.services = "At least one service is required";
    }
    if (total <= 0) {
      newErrors.total = "Total amount must be greater than 0";
    }
    if (amountPaid !== '' && Number(amountPaid) < 0) {
      newErrors.amountPaid = "Amount paid cannot be negative";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !profile) return;

    if (!validate()) return;

    setSaving(true);
    try {
      const paid = amountPaid === '' ? 0 : Number(amountPaid);
      const status = paid >= total ? 'Paid' : 'Unpaid';
      const due = Math.max(0, total - paid);

      const transaction: Omit<Transaction, 'id' | 'createdAt'> = {
        customerName: customer.name.trim(),
        customerMobile: customer.mobile.trim(),
        vehicleNumber: customer.vehicleNumber.trim(),
        remarks: customer.remarks.trim(),
        services: selectedServices,
        subtotal: subtotal,
        tax: gstAmount,
        totalAmount: total,
        amountPaid: paid,
        dueAmount: due,
        paymentStatus: status
      };

      await saveTransaction(user.uid, transaction);
      
      // Reset form
      setCustomer({ name: '', mobile: '', vehicleNumber: '', remarks: '' });
      setSelectedServices([]);
      setGstPercent('');
      setAmountPaid('');
      setSearchQuery('');
      setErrors({});
      
      alert("Transaction saved successfully!");
      navigate('/history');
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Failed to save transaction. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Layout 
      title={
        <div className="flex items-center gap-4">
          <ProfileDropdown 
            profile={profile} 
            onLogout={handleLogout} 
            lang={lang} 
            setLang={setLang}
            currentTheme={theme}
            setTheme={setTheme}
          />
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white tracking-tighter">{profile?.businessName || 'DS-REGISTER'}</h1>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Section */}
          <section className="bg-card p-8 rounded-2xl border border-border shadow-soft">
            <div className="bg-primary/10 px-5 py-2 rounded-xl inline-block mb-8 border border-primary/20">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest">{t.customerDetails}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.customerName}</label>
                <input 
                  required
                  value={customer.name}
                  onChange={e => setCustomer({...customer, name: e.target.value})}
                  className={`w-full px-5 py-3 bg-input border ${errors.customerName ? 'border-red-500' : 'border-border'} rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-text`}
                />
                {errors.customerName && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight">{errors.customerName}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.customerMobile} <span className="text-text/30 font-bold lowercase">{t.optional}</span></label>
                <input 
                  type="tel"
                  value={customer.mobile}
                  onChange={e => setCustomer({...customer, mobile: e.target.value})}
                  className="w-full px-5 py-3 bg-input border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.vehicleNumber} <span className="text-text/30 font-bold lowercase">{t.optional}</span></label>
                <input 
                  value={customer.vehicleNumber}
                  onChange={e => setCustomer({...customer, vehicleNumber: e.target.value})}
                  className="w-full px-5 py-3 bg-input border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.remarks} <span className="text-text/30 font-bold lowercase">{t.optional}</span></label>
                <input 
                  value={customer.remarks}
                  onChange={e => setCustomer({...customer, remarks: e.target.value})}
                  className="w-full px-5 py-3 bg-input border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-text"
                />
              </div>
            </div>
          </section>

          {/* Services Section */}
          <section className="bg-card p-8 rounded-2xl border border-border shadow-soft">
            <div className="bg-primary/10 px-5 py-2 rounded-xl inline-block mb-8 border border-primary/20">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest">{t.serviceNeeds}</h3>
            </div>
            {errors.services && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight mb-4">{errors.services}</p>}
            
            <div className="relative mb-10">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-text/30" />
              </div>
              <input
                type="text"
                placeholder={t.searchServices}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 border border-border rounded-2xl bg-input outline-none focus:ring-2 focus:ring-primary font-bold text-text"
              />
              
              {searchQuery && (
                <div className="absolute z-10 w-full mt-3 bg-card border border-border rounded-2xl shadow-soft max-h-72 overflow-y-auto overflow-hidden">
                  {filteredServices.length > 0 ? (
                    filteredServices.map(s => (
                      <button
                        key={s.name}
                        onClick={() => handleAddService(s.name)}
                        className="w-full text-left px-6 py-4 hover:bg-primary/5 flex justify-between items-center group transition-colors border-b border-border last:border-none"
                      >
                        <div>
                          <p className="text-sm font-black text-text group-hover:text-primary transition-colors">{s.name}</p>
                          <p className="text-[0.625rem] text-text/40 font-black uppercase tracking-widest">{s.category}</p>
                        </div>
                        <Plus className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  ) : (
                    <div className="px-6 py-4 text-sm font-bold text-text/40">No services found</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {Object.entries(SERVICE_CATEGORIES).map(([category, services]) => (
                <div key={category} className="space-y-2">
                  <p className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{category}</p>
                  <select 
                    className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary text-text appearance-none"
                    onChange={(e) => { if(e.target.value) handleAddService(e.target.value); e.target.value = ""; }}
                  >
                    <option value="">Select Service</option>
                    {services.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {selectedServices.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.selectedServices}</h4>
                <div className="space-y-4">
                  {selectedServices.map(s => (
                    <div key={s.name} className="flex items-center gap-6 p-5 bg-input rounded-2xl border border-border group hover:border-primary/30 transition-all">
                      <div className="flex-1">
                        <p className="text-sm font-black text-text">{s.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-text/40">₹</span>
                        <input
                          type="number"
                          placeholder={t.price}
                          value={s.price || ''}
                          onChange={e => handlePriceChange(s.name, Number(e.target.value))}
                          className="w-28 px-4 py-2 bg-input border border-border rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary text-text"
                        />
                        <button 
                          onClick={() => handleRemoveService(s.name)}
                          className="p-3 text-text/30 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Calculation & QR */}
        <div className="space-y-8">
          <section className="bg-card p-8 rounded-2xl shadow-soft border border-border overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <div className="bg-primary/10 px-5 py-2 rounded-xl inline-block mb-8 border border-primary/20 relative z-10">
              <h3 className="text-[0.625rem] font-black text-primary uppercase tracking-widest">Calculation</h3>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-text/50">Subtotal</span>
                <span className="text-lg font-black text-text">₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-text/50">{t.gstPercent}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={gstPercent}
                    onChange={e => setGstPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 bg-input border border-border rounded-xl px-3 py-2 text-right text-sm font-black outline-none focus:border-primary transition-all text-text"
                  />
                  <span className="text-sm font-bold text-text/30">%</span>
                </div>
              </div>

              <div className="border-t border-border pt-6 flex justify-between items-center">
                <span className="text-xl font-black text-text">{t.total}</span>
                <span className="text-3xl font-black text-primary">₹{total.toFixed(2)}</span>
              </div>

              <div className="space-y-3 pt-4">
                <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.amountPaid}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text/30 font-black">₹</span>
                  <input
                    type="number"
                    value={amountPaid}
                    placeholder="Enter amount received"
                    onChange={e => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full bg-input border ${errors.amountPaid ? 'border-red-500' : 'border-border'} rounded-2xl pl-10 pr-5 py-4 text-2xl font-black outline-none focus:ring-2 focus:ring-primary transition-all text-text hover:border-primary/50`}
                  />
                </div>
                {errors.amountPaid && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight">{errors.amountPaid}</p>}
              </div>

              {errors.total && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight mt-4 text-center">{errors.total}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 mt-10 relative z-10">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-5 ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:opacity-90'} text-white font-black rounded-2xl transition-all shadow-soft active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-2`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    SAVING...
                  </>
                ) : t.save}
              </button>
            </div>
          </section>

        </div>
      </div>
    </Layout>
  );
}

// --- Page 4: History ---
function HistoryPage({ lang, setLang, theme, setTheme }: { 
  lang: Language, 
  setLang: (l: Language) => void,
  theme: ThemeId,
  setTheme: (t: ThemeId) => void
}) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];
  const [history, setHistory] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnpaid, setFilterUnpaid] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState<number | ''>('');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        const [p, h] = await Promise.all([
          getUserProfile(user.uid),
          getUserHistory(user.uid)
        ]);
        if (!p) {
          navigate('/setup');
        } else {
          setProfile(p);
          setHistory(h);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthTx = history.filter(tx => {
      const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt || Date.now());
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalTransactions = thisMonthTx.length;
    const totalRevenue = thisMonthTx
      .filter(tx => tx.paymentStatus === 'Paid')
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalPending = thisMonthTx.reduce((sum, tx) => sum + (tx.dueAmount || 0), 0);
    const totalCollected = thisMonthTx.reduce((sum, tx) => sum + (tx.amountPaid || 0), 0);

    return { totalTransactions, totalRevenue, totalPending, totalCollected };
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(tx => {
      const matchesSearch = 
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.customerMobile || '').includes(searchQuery) ||
        (tx.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterUnpaid ? tx.paymentStatus === 'Unpaid' : true;
      
      return matchesSearch && matchesFilter;
    });
  }, [history, searchQuery, filterUnpaid]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
      navigate('/');
    }
  };

  const handleClearAll = () => {
    setIsClearAllModalOpen(true);
    setIsSettingsOpen(false);
  };

  const performClearAll = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsDeletingAll(true);
    setDeleteError('');

    try {
      await clearUserHistory(user.uid);
      setHistory([]);
      setIsClearAllModalOpen(false);
      alert("All transactions deleted successfully.");
    } catch (error) {
      console.error("Failed to clear history:", error);
      setDeleteError("Failed to delete transactions. Please try again.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDownloadAll = async () => {
    if (history.length === 0) {
      alert("No transactions to download.");
      return;
    }
    await generateTransactionsPDF(
      history, 
      profile, 
      'ALL TRANSACTIONS REPORT', 
      `All_Transactions_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
      theme
    );
    setIsSettingsOpen(false);
  };

  const handleDownloadMonthly = async () => {
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(selectedYear, selectedMonth));
    const monthlyHistory = history.filter(tx => {
      const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt || Date.now());
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    if (monthlyHistory.length === 0) {
      alert(t.noTransactionsMonth);
      return;
    }

    await generateTransactionsPDF(
      monthlyHistory, 
      profile, 
      `${monthName.toUpperCase()} ${selectedYear} TRANSACTIONS`, 
      `Transactions_${monthName}_${selectedYear}.pdf`,
      theme
    );
    setIsMonthPickerOpen(false);
    setIsSettingsOpen(false);
  };

  const handleUpdatePayment = async () => {
    const user = auth.currentUser;
    if (!user || !selectedTx) return;

    const amountToAdd = additionalAmount === '' ? 0 : Number(additionalAmount);
    
    if (amountToAdd <= 0) {
      setPaymentError("Additional amount must be greater than 0");
      return;
    }

    setIsUpdatingPayment(true);
    setPaymentError('');

    try {
      const updatedAmountPaid = (selectedTx.amountPaid || 0) + amountToAdd;
      const updatedDueAmount = Math.max(0, selectedTx.totalAmount - updatedAmountPaid);
      const updatedStatus = updatedAmountPaid >= selectedTx.totalAmount ? 'Paid' : 'Unpaid';

      const updates = {
        amountPaid: updatedAmountPaid,
        dueAmount: updatedDueAmount,
        paymentStatus: updatedStatus as 'Paid' | 'Unpaid'
      };

      await updateTransactionStatus(user.uid, selectedTx.id, updates);

      // Update local state
      const updatedHistory = history.map(tx => {
        if (tx.id === selectedTx.id) {
          return { ...tx, ...updates };
        }
        return tx;
      });
      setHistory(updatedHistory);
      setSelectedTx({ ...selectedTx, ...updates });

      setIsAddPaymentOpen(false);
      setAdditionalAmount('');
      alert("Payment updated successfully");
    } catch (error) {
      console.error("Failed to update payment:", error);
      setPaymentError("Failed to update payment. Please try again.");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (selectedTx) {
    return (
      <Layout 
        title={
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedTx(null)} className="p-3 hover:bg-primary/10 rounded-xl transition-all text-white">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="teal-gradient px-5 py-2 rounded-xl shadow-soft border border-white/20">
              <h2 className="text-sm font-black text-white uppercase tracking-widest">{t.transactionDetail}</h2>
            </div>
          </div>
        }
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-card border border-border rounded-[2rem] p-8 md:p-10 shadow-soft overflow-hidden">
            {/* Header: Customer Name & Mobile */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-text tracking-tight uppercase">{selectedTx.customerName || t.customerName}</h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-text/50">{selectedTx.customerMobile}</p>
                  <a 
                    href={`tel:${selectedTx.customerMobile}`}
                    className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                    title={t.callCustomer}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[0.625rem] font-black uppercase tracking-widest border ${
                selectedTx.pendingAmount > 0 
                  ? 'bg-red-50 text-red-600 border-red-100' 
                  : 'bg-green-50 text-green-600 border-green-100'
              }`}>
                {selectedTx.pendingAmount > 0 ? 'Pending' : 'Paid'}
              </div>
            </div>

            {/* Service Paid For Section */}
            <div className="bg-background/50 rounded-2xl p-6 border border-border mb-8">
              <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-4">Service Paid For</p>
              <div className="space-y-4">
                {selectedTx.services.map((s, i) => (
                  <div key={i} className="flex justify-between items-start gap-4">
                    <span className="text-sm font-medium text-text leading-relaxed break-words flex-1">{s.name}</span>
                    <span className="text-sm font-black text-text whitespace-nowrap">₹{s.price.toFixed(2)}</span>
                  </div>
                ))}
                {selectedTx.gstPercent && (
                  <div className="flex justify-between items-center pt-4 border-t border-border/50 text-text/40 text-xs font-bold">
                    <span>GST ({selectedTx.gstPercent}%)</span>
                    <span>₹{(selectedTx.totalAmount - selectedTx.services.reduce((a, b) => a + b.price, 0)).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
              <div>
                <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-1">{t.date}</p>
                <p className="text-sm font-bold text-text">
                  {selectedTx.createdAt?.toDate ? selectedTx.createdAt.toDate().toLocaleDateString() : new Date(selectedTx.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-1">Status</p>
                <p className={`text-sm font-black ${selectedTx.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedTx.paymentStatus.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-1">{t.amountPaid}</p>
                <p className="text-sm font-black text-primary">₹{(selectedTx.amountPaid || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-1">Due Amount</p>
                <p className={`text-sm font-black ${selectedTx.dueAmount > 0 ? 'text-red-600' : 'text-text/30'}`}>₹{(selectedTx.dueAmount || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-1">{t.total}</p>
              <p className="text-3xl font-black text-text tracking-tighter">₹{selectedTx.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={async () => await generateReceiptPDF(selectedTx, profile, theme)}
              className="flex items-center justify-center gap-3 py-4 bg-[#1b5e20] text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-soft uppercase tracking-widest text-[0.7rem]"
            >
              <Upload className="w-4 h-4 rotate-180" /> {t.printReceipt}
            </button>
            {selectedTx.paymentStatus === 'Unpaid' && selectedTx.dueAmount > 0 && (
              <button 
                onClick={() => setIsAddPaymentOpen(true)}
                className="flex items-center justify-center gap-3 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-soft uppercase tracking-widest text-[0.7rem]"
              >
                <Plus className="w-4 h-4" /> ADD PAYMENT
              </button>
            )}
          </div>

          {/* Add Payment Modal */}
          <AnimatePresence>
            {isAddPaymentOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-text tracking-tight uppercase">Add Payment</h3>
                      <button onClick={() => setIsAddPaymentOpen(false)} className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-text/40" />
                      </button>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center p-4 bg-background rounded-2xl border border-border">
                        <span className="text-xs font-bold text-text/40 uppercase tracking-widest">Final Amount</span>
                        <span className="text-lg font-black text-text">₹{selectedTx.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-background rounded-2xl border border-border">
                        <span className="text-xs font-bold text-text/40 uppercase tracking-widest">Already Paid</span>
                        <span className="text-lg font-black text-primary">₹{(selectedTx.amountPaid || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border border-primary/20">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Remaining Due</span>
                        <span className="text-lg font-black text-red-500">₹{(selectedTx.dueAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-8">
                      <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest ml-1">Enter Additional Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text/30 font-black">₹</span>
                        <input
                          type="number"
                          value={additionalAmount}
                          onChange={e => setAdditionalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0.00"
                          className={`w-full bg-input border ${paymentError ? 'border-red-500' : 'border-border'} rounded-2xl pl-10 pr-5 py-4 text-2xl font-black outline-none focus:ring-2 focus:ring-primary transition-all text-text`}
                        />
                      </div>
                      {paymentError && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight ml-1">{paymentError}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setIsAddPaymentOpen(false)}
                        className="py-4 bg-background border border-border text-text/60 font-black rounded-2xl hover:bg-border transition-all uppercase tracking-widest text-xs"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleUpdatePayment}
                        disabled={isUpdatingPayment}
                        className={`py-4 ${isUpdatingPayment ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:opacity-90'} text-white font-black rounded-2xl transition-all shadow-soft uppercase tracking-widest text-xs flex items-center justify-center gap-2`}
                      >
                        {isUpdatingPayment ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title={
        <div className="flex items-center gap-4">
          <ProfileDropdown 
            profile={profile} 
            onLogout={handleLogout} 
            lang={lang} 
            setLang={setLang}
            currentTheme={theme}
            setTheme={setTheme}
          />
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white tracking-tighter">{profile?.businessName || 'DS-REGISTER'}</h1>
          </div>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-6 bg-primary/5 px-5 py-3 rounded-2xl border border-primary/10 shadow-soft">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/billing')} className="p-2 bg-card border border-border rounded-lg hover:bg-primary/5 transition-all text-primary shadow-soft">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-text tracking-tighter uppercase">{t.historyTitle}</h2>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 bg-card border border-border rounded-lg hover:bg-primary/5 transition-all text-text/40 shadow-soft"
            >
              <Settings className="w-5 h-5" />
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 mt-4 w-[calc(100vw-2rem)] sm:w-64 bg-card border border-border rounded-2xl shadow-2xl py-3 z-50 overflow-hidden origin-top-right">
                <button 
                  onClick={handleDownloadAll}
                  className="w-full text-left px-6 py-4 text-sm font-black text-text hover:bg-primary/5 flex items-center gap-4 transition-colors border-b border-border"
                >
                  <Upload className="w-5 h-5 text-primary" /> {t.downloadAllPDF}
                </button>
                <button 
                  onClick={() => { setIsMonthPickerOpen(true); setIsSettingsOpen(false); }}
                  className="w-full text-left px-6 py-4 text-sm font-black text-text hover:bg-primary/5 flex items-center gap-4 transition-colors border-b border-border"
                >
                  <Calendar className="w-5 h-5 text-primary" /> {t.downloadMonthWise}
                </button>
                <button 
                  onClick={handleClearAll}
                  className="w-full text-left px-6 py-4 text-sm font-black text-red-600 hover:bg-red-50 flex items-center gap-4 transition-colors"
                >
                  <Trash2 className="w-5 h-5" /> {t.clearAll}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Summary Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-2xl border border-border shadow-soft">
            <p className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest mb-1">Total Transactions</p>
            <p className="text-2xl font-black text-text">{monthlyStats.totalTransactions}</p>
            <p className="text-[0.625rem] font-bold text-text/30 uppercase mt-1">This Month</p>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-border shadow-soft">
            <p className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-green-600">₹{monthlyStats.totalRevenue.toLocaleString()}</p>
            <p className="text-[0.625rem] font-bold text-text/30 uppercase mt-1">Fully Paid Only</p>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-border shadow-soft">
            <p className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest mb-1">Total Collected</p>
            <p className="text-2xl font-black text-primary">₹{monthlyStats.totalCollected.toLocaleString()}</p>
            <p className="text-[0.625rem] font-bold text-text/30 uppercase mt-1">Sum of Paid</p>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-border shadow-soft">
            <p className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest mb-1">Total Pending</p>
            <p className="text-2xl font-black text-red-600">₹{monthlyStats.totalPending.toLocaleString()}</p>
            <p className="text-[0.625rem] font-bold text-text/30 uppercase mt-1">Due Amount</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" />
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold text-text shadow-soft"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setFilterUnpaid(!filterUnpaid)}
              className={`px-6 py-3 rounded-xl font-black text-xs transition-all border shadow-soft uppercase tracking-widest ${
                filterUnpaid 
                ? 'teal-gradient text-white border-transparent' 
                : 'bg-card text-text/40 border-border hover:bg-background'
              }`}
            >
              {filterUnpaid ? t.unpaidFilter : t.allFilter}
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-[2rem] border-2 border-dashed border-border flex flex-col items-center justify-center shadow-soft">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6">
              <History className="w-10 h-10 text-text/20" />
            </div>
            <p className="text-xl font-black text-text/30 uppercase tracking-widest">{t.noTransactions}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((tx) => (
              <div 
                key={tx.id} 
                onClick={() => setSelectedTx(tx)}
                className="group bg-card border border-border rounded-xl p-5 shadow-soft hover:shadow-md hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-black text-text text-base group-hover:text-primary transition-colors tracking-tight">
                        {tx.customerName || tx.customerMobile}
                      </h3>
                      <a 
                        href={`tel:${tx.customerMobile}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        title={t.callCustomer}
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-text/50 font-bold">{tx.customerMobile}</p>
                    {tx.vehicleNumber && (
                      <div className="mt-2 inline-block px-2 py-0.5 bg-background rounded-md border border-border mr-2">
                        <p className="text-[0.55rem] font-black text-text/40 uppercase tracking-widest">{tx.vehicleNumber}</p>
                      </div>
                    )}
                    {tx.remarks && (
                      <div className="mt-2 inline-block px-2 py-0.5 bg-background rounded-md border border-border">
                        <p className="text-[0.55rem] font-black text-text/40 uppercase tracking-widest italic">{tx.remarks}</p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-[0.55rem] font-black text-text/30 uppercase tracking-widest">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('en-IN') : new Date(tx.createdAt).toLocaleDateString('en-IN')}</span>
                      <span className="w-0.5 h-0.5 bg-text/20 rounded-full"></span>
                      <Clock className="w-2.5 h-2.5" />
                      <span>{tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-text tracking-tighter">₹{tx.totalAmount.toFixed(2)}</p>
                    <div className={`mt-1.5 inline-block px-3 py-0.5 rounded-full text-[0.55rem] font-black uppercase tracking-widest ${tx.paymentStatus === 'Unpaid' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                      {tx.paymentStatus}
                      {tx.paymentStatus === 'Unpaid' && tx.dueAmount > 0 && ` (Due: ₹${tx.dueAmount.toFixed(2)})`}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4 flex flex-wrap gap-2">
                  {tx.services.map((s, i) => (
                    <span key={i} className="px-2 py-1 bg-background text-text/60 text-[0.55rem] font-black rounded-md uppercase tracking-widest border border-border group-hover:border-primary/20 transition-colors">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {isMonthPickerOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-[2rem] p-8 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-xl font-black text-text mb-6 uppercase tracking-tight">{t.downloadMonthWise}</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest mb-2 block">{t.selectMonth}</label>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary text-text appearance-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, i))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest mb-2 block">{t.selectYear}</label>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary text-text appearance-none"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button 
                      onClick={() => setIsMonthPickerOpen(false)}
                      className="py-4 bg-background border border-border text-text/60 font-black rounded-2xl hover:bg-primary/5 transition-all uppercase tracking-widest text-xs"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      onClick={handleDownloadMonthly}
                      className="py-4 teal-gradient text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-soft uppercase tracking-widest text-xs"
                    >
                      {t.download}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Clear All Transactions Modal */}
        <AnimatePresence>
          {isClearAllModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-red-600 tracking-tight uppercase">Delete All Transactions</h3>
                      <button onClick={() => setIsClearAllModalOpen(false)} className="p-2 hover:bg-red-50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-red-600/40" />
                      </button>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-sm font-bold text-red-600 leading-relaxed">
                          All transactions will be permanently deleted.
                          <br />
                          This action cannot be undone.
                          <br />
                          <span className="font-black">Please make sure you downloaded a backup before continuing.</span>
                        </p>
                      </div>
                    </div>

                    {deleteError && <p className="text-red-500 text-[0.625rem] font-bold uppercase tracking-tight mb-4 ml-1">{deleteError}</p>}

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setIsClearAllModalOpen(false)}
                        className="py-4 bg-background border border-border text-text/60 font-black rounded-2xl hover:bg-border transition-all uppercase tracking-widest text-xs"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={performClearAll}
                        disabled={isDeletingAll}
                        className={`py-4 ${isDeletingAll ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white font-black rounded-2xl transition-all shadow-soft uppercase tracking-widest text-xs flex items-center justify-center gap-2`}
                      >
                        {isDeletingAll ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Delete All'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
      </div>
    </Layout>
  );
}

// --- Page 5: Success ---
function SuccessPage({ lang, setLang, theme, setTheme }: { 
  lang: Language, 
  setLang: (l: Language) => void,
  theme: ThemeId,
  setTheme: (t: ThemeId) => void
}) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] text-center">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-soft border border-green-200">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-4xl font-black text-text tracking-tighter uppercase mb-4">{t.successTitle}</h2>
        <p className="text-text/50 font-bold max-w-sm mb-12 leading-relaxed">
          Your transaction has been saved successfully. You can view it in the history.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={() => navigate('/billing')}
            className="flex-1 py-5 teal-gradient text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-soft uppercase tracking-widest text-sm"
          >
            New Billing
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex-1 py-5 bg-text text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-soft uppercase tracking-widest text-sm"
          >
            {t.historyTitle}
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('ds_register_lang') as Language) || 'en');
  const [theme, setTheme] = useState<ThemeId>(() => (localStorage.getItem('ds_register_theme') as ThemeId) || 'purple-brand');

  useEffect(() => {
    localStorage.setItem('ds_register_lang', lang);
  }, [lang]);

  useEffect(() => {
    // Clear old test data from local storage to ensure a clean reset
    const keysToClear = ['ds_register_profile', 'ds_register_history'];
    keysToClear.forEach(key => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    localStorage.setItem('ds_register_theme', theme);
    const selectedTheme = THEMES.find(t => t.id === theme) || THEMES[0];
    const root = document.documentElement;
    
    Object.entries(selectedTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    // Set primary-dark automatically if not provided, or just use a darker version
    if (selectedTheme.colors.primary) {
      root.style.setProperty('--primary-dark', `${selectedTheme.colors.primary}dd`);
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />} />
        <Route path="/setup" element={
          <ProtectedRoute>
            <SetupPage lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
          </ProtectedRoute>
        } />
        <Route path="/billing" element={
          <ProtectedRoute>
            <BillingPage lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <HistoryPage lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
          </ProtectedRoute>
        } />
        <Route path="/success" element={
          <ProtectedRoute>
            <SuccessPage lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
