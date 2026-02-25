import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LanguageSelector } from './components/LanguageSelector';
import { SLOGANS, TRANSLATIONS, SERVICE_CATEGORIES, LANGUAGES } from './constants';
import { Language, BusinessProfile, Transaction } from './types';
import { LogIn, Upload, Plus, Trash2, CheckCircle2, User, History, LogOut, Search, X, ChevronLeft, ChevronRight, Settings, Phone, Globe, Calendar, Clock, ChevronDown, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { THEMES } from './constants';
import { ThemeId } from './types';

// --- Helpers ---

const generateReceiptPDF = (tx: Transaction, profile: BusinessProfile | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(26, 188, 156); // Primary color
  doc.text(profile?.businessName || 'DS-REGISTER', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(profile?.address || '', pageWidth / 2, 28, { align: 'center' });
  doc.text(`Mobile: ${profile?.mobileNumber || ''} | Email: ${profile?.email || ''}`, pageWidth / 2, 34, { align: 'center' });
  if (profile?.gstNumber) {
    doc.text(`GST: ${profile.gstNumber}`, pageWidth / 2, 40, { align: 'center' });
  }

  doc.setDrawColor(200);
  doc.line(15, 45, pageWidth - 15, 45);

  // Receipt Info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('RECEIPT', 15, 55);
  doc.setFontSize(10);
  doc.text(`Receipt ID: ${tx.id}`, 15, 62);
  doc.text(`Date: ${new Date(tx.date).toLocaleString()}`, 15, 68);

  // Customer Info
  doc.setFontSize(11);
  doc.text('CUSTOMER DETAILS', 15, 80);
  doc.setFontSize(10);
  doc.text(`Name: ${tx.customerName}`, 15, 87);
  doc.text(`Mobile: ${tx.customerMobile}`, 15, 93);
  if (tx.customerIdNo) {
    doc.text(`ID/Vehicle No: ${tx.customerIdNo}`, 15, 99);
  }

  // Services Table
  autoTable(doc, {
    startY: 110,
    head: [['Service Name', 'Price (INR)']],
    body: tx.services.map(s => [s.name, s.price.toFixed(2)]),
    theme: 'striped',
    headStyles: { fillColor: [26, 188, 156] },
    margin: { left: 15, right: 15 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  doc.setFontSize(10);
  doc.text(`Subtotal:`, pageWidth - 70, finalY);
  doc.text(`INR ${tx.services.reduce((a, b) => a + b.price, 0).toFixed(2)}`, pageWidth - 15, finalY, { align: 'right' });

  if (tx.gstPercent) {
    doc.text(`GST (${tx.gstPercent}%):`, pageWidth - 70, finalY + 6);
    doc.text(`INR ${(tx.totalAmount - tx.services.reduce((a, b) => a + b.price, 0)).toFixed(2)}`, pageWidth - 15, finalY + 6, { align: 'right' });
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL AMOUNT:`, pageWidth - 70, finalY + 15);
  doc.text(`INR ${tx.totalAmount.toFixed(2)}`, pageWidth - 15, finalY + 15, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Amount Paid:`, pageWidth - 70, finalY + 22);
  doc.text(`INR ${tx.amountPaid.toFixed(2)}`, pageWidth - 15, finalY + 22, { align: 'right' });

  if (tx.pendingAmount > 0) {
    doc.setTextColor(255, 0, 0);
  } else {
    doc.setTextColor(0, 128, 0);
  }
  doc.text(`Pending Amount:`, pageWidth - 70, finalY + 28);
  doc.text(`INR ${tx.pendingAmount.toFixed(2)}`, pageWidth - 15, finalY + 28, { align: 'right' });

  doc.setTextColor(0);
  doc.text(`Payment Status: ${tx.pendingAmount > 0 ? 'PENDING' : 'FULLY PAID'}`, 15, finalY + 40);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

  doc.save(`Receipt_${tx.customerName.replace(/\s+/g, '_')}_${new Date(tx.date).toLocaleDateString().replace(/\//g, '-')}.pdf`);
};

const generateTransactionsPDF = (history: Transaction[], profile: BusinessProfile | null, title: string, filename: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(18);
  doc.setTextColor(26, 188, 156);
  doc.text(profile?.businessName || 'DS-REGISTER', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(title, pageWidth / 2, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 32, { align: 'center' });

  const tableData = history.map((tx, index) => [
    index + 1,
    `${tx.customerName}\n${tx.customerMobile}`,
    tx.services.map(s => s.name).join(', '),
    `₹${tx.totalAmount.toFixed(2)}`,
    `₹${tx.amountPaid.toFixed(2)}`,
    `₹${tx.pendingAmount.toFixed(2)}`,
    tx.pendingAmount > 0 ? 'PENDING' : 'PAID',
    new Date(tx.date).toLocaleDateString('en-IN')
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Customer', 'Services', 'Total', 'Paid', 'Pending', 'Status', 'Date']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [26, 188, 156], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 30 },
      2: { cellWidth: 50 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 }
    }
  });

  doc.save(filename);
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
        className="flex items-center gap-2 p-1 rounded-full hover:bg-white/20 transition-all border border-white/30 bg-white/10"
      >
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-soft overflow-hidden">
          {profile?.logo ? (
            <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
        </div>
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

function QRSlider({ qrCodes }: { qrCodes: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  if (!qrCodes || qrCodes.length === 0) return null;

  const handleNext = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === qrCodes.length - 1 ? 0 : prev + 1));
      setIsFading(false);
    }, 200);
  };

  const handlePrev = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === 0 ? qrCodes.length - 1 : prev - 1));
      setIsFading(false);
    }, 200);
  };

  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-soft">
      <div className="flex justify-center mb-6">
        <div className="teal-gradient px-5 py-2 rounded-xl shadow-soft">
          <p className="text-xs font-black text-white uppercase tracking-widest text-center">Scan to Pay</p>
        </div>
      </div>
      
      <div className="relative group aspect-square max-w-60 mx-auto flex items-center justify-center">
        <div className={`w-full h-full transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
          <img 
            src={qrCodes[currentIndex]} 
            alt={`QR ${currentIndex + 1}`} 
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
        
        {qrCodes.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-11 h-11 bg-white border border-border rounded-full shadow-soft flex items-center justify-center hover:bg-background transition-all active:scale-90 z-10"
            >
              <ChevronLeft className="w-6 h-6 text-primary" />
            </button>
            <button 
              onClick={handleNext}
              className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-11 h-11 bg-white border border-border rounded-full shadow-soft flex items-center justify-center hover:bg-background transition-all active:scale-90 z-10"
            >
              <ChevronRight className="w-6 h-6 text-primary" />
            </button>
          </>
        )}
      </div>

      {qrCodes.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {qrCodes.map((_, i) => (
            <button 
              key={i} 
              onClick={() => {
                setIsFading(true);
                setTimeout(() => {
                  setCurrentIndex(i);
                  setIsFading(false);
                }, 200);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-primary w-6' : 'bg-border'}`}
            />
          ))}
        </div>
      )}
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const profile = localStorage.getItem('ds_register_profile');
        if (profile) {
          navigate('/billing');
        } else {
          navigate('/setup');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        // User session is handled by Firebase onAuthStateChanged
        // We can store additional info if needed, but Firebase handles the token
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      alert("Login failed: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <div className="w-full max-w-md p-10 bg-card border border-border rounded-2xl shadow-soft">
          <div className="teal-gradient px-8 py-4 rounded-2xl mb-10 w-full text-center shadow-soft">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Welcome</h2>
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-4 px-8 py-4 bg-white border border-border rounded-2xl hover:bg-background transition-all shadow-soft active:scale-[0.98] group ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
            <span className="font-bold text-text group-hover:text-primary transition-colors">
              {loading ? 'Connecting...' : 'Login with Google'}
            </span>
          </button>
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

  const [formData, setFormData] = useState<Partial<BusinessProfile>>(() => {
    const saved = localStorage.getItem('ds_register_profile');
    return saved ? JSON.parse(saved) : {
      businessName: '',
      mobileNumber: '',
      email: '',
      address: '',
      gstNumber: '',
      qrCodes: []
    };
  });

  const [logo, setLogo] = useState<string | null>(formData.logo || null);
  const [qrPreviews, setQrPreviews] = useState<(string | null)[]>(() => {
    const qrs = formData.qrCodes || [];
    return [qrs[0] || null, qrs[1] || null, qrs[2] || null];
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'qr', index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'logo') {
        setLogo(base64);
      } else if (typeof index === 'number') {
        const newPreviews = [...qrPreviews];
        newPreviews[index] = base64;
        setQrPreviews(newPreviews);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filledQrs = qrPreviews.filter(q => q !== null);
    if (filledQrs.length === 0) {
      alert(t.qrMandatory);
      return;
    }

    const finalData: BusinessProfile = {
      businessName: formData.businessName!,
      mobileNumber: formData.mobileNumber!,
      email: formData.email!,
      address: formData.address!,
      gstNumber: formData.gstNumber,
      logo: logo || undefined,
      qrCodes: filledQrs as string[]
    };

    localStorage.setItem('ds_register_profile', JSON.stringify(finalData));
    navigate('/billing');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="teal-gradient px-8 py-4 rounded-2xl inline-block mb-10 shadow-soft">
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{t.setupTitle}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-card p-8 rounded-2xl border border-border shadow-soft space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-text/50 uppercase tracking-widest">{t.businessName}</label>
                <input
                  required
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-black"
                  placeholder="Enter business name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-text/50 uppercase tracking-widest">{t.mobileNumber}</label>
                <input
                  required
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-black"
                  placeholder="Enter mobile number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text/50 uppercase tracking-widest">{t.email}</label>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-5 py-4 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-black"
                placeholder="Enter business email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text/50 uppercase tracking-widest">{t.address}</label>
              <textarea
                required
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-5 py-4 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none font-bold text-black"
                placeholder="Enter business address"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text/50 uppercase tracking-widest">
                {t.gstNumber} <span className="text-text/30 font-bold lowercase">{t.optional}</span>
              </label>
              <input
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleInputChange}
                className="w-full px-5 py-4 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase font-bold text-black"
                placeholder="Enter GST number"
              />
            </div>
          </div>

          <div className="bg-card p-8 rounded-2xl border border-border shadow-soft space-y-8">
            <div>
              <div className="bg-primary/10 px-5 py-2 rounded-xl inline-block mb-6 border border-primary/20">
                <label className="text-xs font-black text-primary uppercase tracking-widest block">
                  {t.logoUpload} <span className="text-primary/60 font-bold lowercase">{t.optional}</span>
                </label>
              </div>
              <div className="flex items-center gap-6">
                <label className="cursor-pointer group">
                  <div className="w-28 h-28 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center bg-background group-hover:bg-primary/5 group-hover:border-primary transition-all overflow-hidden relative">
                    {logo ? (
                      <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-text/30 group-hover:text-primary mb-2" />
                        <span className="text-[0.625rem] font-black text-text/30 group-hover:text-primary">UPLOAD</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                  </div>
                </label>
                {logo && (
                  <button 
                    type="button"
                    onClick={() => setLogo(null)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-6">
                <div className="bg-primary/10 px-5 py-2 rounded-xl inline-block border border-primary/20">
                  <label className="text-xs font-black text-primary uppercase tracking-widest">{t.qrCodesTitle}</label>
                </div>
                <span className="text-[0.625rem] text-primary font-black uppercase tracking-widest">{t.qrMandatory}</span>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {[0, 1, 2].map((idx) => (
                  <label key={idx} className="cursor-pointer group">
                    <div className="aspect-square border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center bg-background group-hover:bg-primary/5 group-hover:border-primary transition-all overflow-hidden relative">
                      {qrPreviews[idx] ? (
                        <img src={qrPreviews[idx]!} alt={`QR ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Plus className="w-8 h-8 text-text/30 group-hover:text-primary mb-2" />
                          <span className="text-[0.625rem] font-black text-text/30 group-hover:text-primary uppercase">QR {idx + 1}</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'qr', idx)} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-5 bg-[#81c784] text-black font-black rounded-2xl hover:opacity-90 transition-all shadow-soft active:scale-[0.99] mt-10 tracking-widest text-lg uppercase"
          >
            {t.submit}
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

  const [customer, setCustomer] = useState({
    name: '',
    mobile: '',
    email: '',
    idNo: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState<{ name: string, price: number }[]>([]);
  const [gstPercent, setGstPercent] = useState<number | ''>('');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');

  useEffect(() => {
    const saved = localStorage.getItem('ds_register_profile');
    if (!saved) {
      navigate('/setup');
    } else {
      setProfile(JSON.parse(saved));
    }
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
  const balance = amountPaid ? Math.max(0, total - amountPaid) : total;
  const pending = balance;

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

  const handlePrint = () => {
    const currentTx: Transaction = {
      id: 'DRAFT-' + Date.now().toString(),
      date: new Date().toISOString(),
      customerName: customer.name || 'Customer',
      customerMobile: customer.mobile || '',
      customerEmail: customer.email,
      customerIdNo: customer.idNo,
      services: selectedServices,
      gstPercent: gstPercent || undefined,
      totalAmount: total,
      amountPaid: Number(amountPaid) || 0,
      balanceAmount: balance,
      pendingAmount: pending
    };
    generateReceiptPDF(currentTx, profile);
  };

  const handleSave = () => {
    if (!customer.name || !customer.mobile) {
      alert("Customer name and mobile are mandatory");
      return;
    }
    if (selectedServices.length === 0) {
      alert("Please select at least one service");
      return;
    }

    const transaction: Transaction = {
      id: 'TX-' + Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
      date: new Date().toISOString(),
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerEmail: customer.email,
      customerIdNo: customer.idNo,
      services: selectedServices,
      gstPercent: gstPercent || undefined,
      totalAmount: total,
      amountPaid: Number(amountPaid) || 0,
      balanceAmount: balance,
      pendingAmount: pending
    };

    try {
      const savedHistory = JSON.parse(localStorage.getItem('ds_register_history') || '[]');
      localStorage.setItem('ds_register_history', JSON.stringify([transaction, ...savedHistory]));
      
      // Reset form
      setCustomer({ name: '', mobile: '', email: '', idNo: '' });
      setSelectedServices([]);
      setGstPercent('');
      setAmountPaid('');
      setSearchQuery('');
      
      alert("Transaction saved successfully!");
      navigate('/history');
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Failed to save transaction. Please try again.");
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
            {profile?.logo && <img src={profile.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-soft" />}
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
                  className="w-full px-5 py-3 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.customerMobile}</label>
                <input 
                  required
                  type="tel"
                  value={customer.mobile}
                  onChange={e => setCustomer({...customer, mobile: e.target.value})}
                  className="w-full px-5 py-3 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.customerEmail} <span className="text-text/30 font-bold lowercase">{t.optional}</span></label>
                <input 
                  type="email"
                  value={customer.email}
                  onChange={e => setCustomer({...customer, email: e.target.value})}
                  className="w-full px-5 py-3 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-text/40 uppercase tracking-widest">{t.idNo} <span className="text-text/30 font-bold lowercase">{t.optional}</span></label>
                <input 
                  value={customer.idNo}
                  onChange={e => setCustomer({...customer, idNo: e.target.value})}
                  className="w-full px-5 py-3 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-black"
                />
              </div>
            </div>
          </section>

          {/* Services Section */}
          <section className="bg-card p-8 rounded-2xl border border-border shadow-soft">
            <div className="bg-primary/10 px-5 py-2 rounded-xl inline-block mb-8 border border-primary/20">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest">{t.serviceNeeds}</h3>
            </div>
            
            <div className="relative mb-10">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-text/30" />
              </div>
              <input
                type="text"
                placeholder={t.searchServices}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 border border-border rounded-2xl bg-white outline-none focus:ring-2 focus:ring-primary font-bold text-black"
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
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary text-black appearance-none"
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
                    <div key={s.name} className="flex items-center gap-6 p-5 bg-white rounded-2xl border border-border group hover:border-primary/30 transition-all">
                      <div className="flex-1">
                        <p className="text-sm font-black text-black">{s.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-black/40">₹</span>
                        <input
                          type="number"
                          placeholder={t.price}
                          value={s.price || ''}
                          onChange={e => handlePriceChange(s.name, Number(e.target.value))}
                          className="w-28 px-4 py-2 bg-white border border-border rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary text-black"
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
                    className="w-20 bg-white border border-border rounded-xl px-3 py-2 text-right text-sm font-black outline-none focus:border-primary transition-all text-black"
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
                    onChange={e => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-border rounded-2xl pl-10 pr-5 py-4 text-2xl font-black outline-none focus:ring-2 focus:ring-primary transition-all text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-background p-4 rounded-2xl border border-border">
                  <p className="text-[0.5rem] font-black text-text/30 uppercase tracking-widest mb-1">{t.balance}</p>
                  <p className="text-lg font-black text-primary">₹{balance.toFixed(2)}</p>
                </div>
                <div className="bg-background p-4 rounded-2xl border border-border">
                  <p className="text-[0.5rem] font-black text-text/30 uppercase tracking-widest mb-1">{t.pending}</p>
                  <p className="text-lg font-black text-red-500">₹{pending.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-10 relative z-10">
              <button
                onClick={handleSave}
                className="w-full py-5 bg-[#81c784] text-black font-black rounded-2xl hover:opacity-90 transition-all shadow-soft active:scale-[0.98] uppercase tracking-widest"
              >
                {t.save}
              </button>
              <button
                onClick={handlePrint}
                className="w-full py-4 bg-[#1b5e20] text-white font-black rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3 border border-transparent uppercase tracking-widest text-xs"
              >
                <Upload className="w-5 h-5 rotate-180" /> {t.printReceipt}
              </button>
            </div>
          </section>

          {profile?.qrCodes && <QRSlider qrCodes={profile.qrCodes} />}
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

  useEffect(() => {
    const savedProfile = localStorage.getItem('ds_register_profile');
    if (!savedProfile) {
      navigate('/setup');
      return;
    }
    setProfile(JSON.parse(savedProfile));

    const savedHistory = localStorage.getItem('ds_register_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, [navigate]);

  const filteredHistory = useMemo(() => {
    return history.filter(tx => {
      const matchesSearch = 
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.customerMobile.includes(searchQuery) ||
        (tx.customerIdNo?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterUnpaid ? tx.pendingAmount > 0 : true;
      
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
    if (window.confirm(t.confirmClear)) {
      localStorage.removeItem('ds_register_history');
      setHistory([]);
      setIsSettingsOpen(false);
    }
  };

  const handleDownloadAll = () => {
    if (history.length === 0) {
      alert("No transactions to download.");
      return;
    }
    generateTransactionsPDF(
      history, 
      profile, 
      'ALL TRANSACTIONS REPORT', 
      `All_Transactions_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`
    );
    setIsSettingsOpen(false);
  };

  const handleDownloadMonthly = () => {
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(selectedYear, selectedMonth));
    const monthlyHistory = history.filter(tx => {
      const date = new Date(tx.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    if (monthlyHistory.length === 0) {
      alert(t.noTransactionsMonth);
      return;
    }

    generateTransactionsPDF(
      monthlyHistory, 
      profile, 
      `${monthName.toUpperCase()} ${selectedYear} TRANSACTIONS`, 
      `Transactions_${monthName}_${selectedYear}.pdf`
    );
    setIsMonthPickerOpen(false);
    setIsSettingsOpen(false);
  };

  const handleMarkAsPaid = (id: string) => {
    const txToUpdate = history.find(t => t.id === id);
    if (!txToUpdate || txToUpdate.pendingAmount <= 0) return;

    if (window.confirm(t.confirmPaid)) {
      const savedHistory = localStorage.getItem('ds_register_history');
      const currentHistory = savedHistory ? JSON.parse(savedHistory) : history;
      
      const updatedHistory = currentHistory.map((tx: Transaction) => {
        if (tx.id === id) {
          return { 
            ...tx, 
            amountPaid: tx.totalAmount, 
            pendingAmount: 0, 
            balanceAmount: 0,
            status: 'Fully Paid' // Ensure status is updated if used
          };
        }
        return tx;
      });
      
      setHistory(updatedHistory);
      localStorage.setItem('ds_register_history', JSON.stringify(updatedHistory));
      
      if (selectedTx?.id === id) {
        setSelectedTx({ 
          ...selectedTx, 
          amountPaid: selectedTx.totalAmount, 
          pendingAmount: 0, 
          balanceAmount: 0 
        });
      }
    }
  };

  if (selectedTx) {
    return (
      <Layout 
        title={
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedTx(null)} className="p-3 hover:bg-white/10 rounded-xl transition-all text-white">
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2">
              <div>
                <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-1">{t.date}</p>
                <p className="text-sm font-bold text-text">{new Date(selectedTx.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-1">{t.amountPaid}</p>
                <p className="text-sm font-black text-primary">₹{selectedTx.amountPaid.toFixed(2)}</p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-[0.625rem] font-black text-text/30 uppercase tracking-widest mb-1">{t.total}</p>
                <p className="text-xl font-black text-text tracking-tighter">₹{selectedTx.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a 
              href={`tel:${selectedTx.customerMobile}`}
              className="flex items-center justify-center gap-3 py-4 bg-primary/10 text-primary font-black rounded-2xl hover:bg-primary hover:text-white transition-all shadow-soft uppercase tracking-widest text-[0.7rem]"
            >
              <Phone className="w-4 h-4" /> {t.callCustomer}
            </a>
            <button 
              onClick={() => generateReceiptPDF(selectedTx, profile)}
              className="flex items-center justify-center gap-3 py-4 bg-[#1b5e20] text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-soft uppercase tracking-widest text-[0.7rem]"
            >
              <Upload className="w-4 h-4 rotate-180" /> {t.printReceipt}
            </button>
            {selectedTx.pendingAmount > 0 && (
              <button 
                onClick={() => handleMarkAsPaid(selectedTx.id)}
                className="flex items-center justify-center gap-3 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-soft uppercase tracking-widest text-[0.7rem]"
              >
                <CheckCircle2 className="w-4 h-4" /> {t.markAsPaid}
              </button>
            )}
          </div>
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
            {profile?.logo && <img src={profile.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-soft" />}
            <h1 className="text-xl font-black text-white tracking-tighter">{profile?.businessName || 'DS-REGISTER'}</h1>
          </div>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 bg-primary/5 px-5 py-3 rounded-2xl border border-primary/10 shadow-soft">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/billing')} className="p-2 bg-white border border-border rounded-lg hover:bg-primary/5 transition-all text-primary shadow-soft">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-text tracking-tighter uppercase">{t.historyTitle}</h2>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 bg-white border border-border rounded-lg hover:bg-primary/5 transition-all text-text/40 shadow-soft"
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

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" />
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold text-black shadow-soft"
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
                    {tx.customerIdNo && (
                      <div className="mt-2 inline-block px-2 py-0.5 bg-background rounded-md border border-border">
                        <p className="text-[0.55rem] font-black text-text/40 uppercase tracking-widest">{tx.customerIdNo}</p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-[0.55rem] font-black text-text/30 uppercase tracking-widest">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{new Date(tx.date).toLocaleDateString('en-IN')}</span>
                      <span className="w-0.5 h-0.5 bg-text/20 rounded-full"></span>
                      <Clock className="w-2.5 h-2.5" />
                      <span>{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-text tracking-tighter">₹{tx.totalAmount.toFixed(2)}</p>
                    <div className={`mt-1.5 inline-block px-3 py-0.5 rounded-full text-[0.55rem] font-black uppercase tracking-widest ${tx.pendingAmount > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                      {tx.pendingAmount > 0 ? `Pending: ₹${tx.pendingAmount.toFixed(2)}` : 'Fully Paid'}
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
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary text-black appearance-none"
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
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary text-black appearance-none"
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
