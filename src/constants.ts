import { Language, Translations, Theme } from './types';

export const SLOGANS = [
  "Speed thrills but kills.",
  "Don't use mobile phone while driving.",
  "Wear a helmet, save your life.",
  "Better late than never.",
  "Safety starts with you.",
  "Say no to corruption, commit to the nation.",
  "Corruption is a cancer that eats away at a citizen's faith in democracy.",
  "Be honest, be bold, be the change.",
  "Integrity is doing the right thing, even when no one is watching.",
  "Your honesty is your strength.",
  "Drive safe, stay safe.",
  "Honesty pays, corruption stays.",
  "Follow traffic rules, avoid accidents.",
  "Vigilance is the price of liberty."
];

export const SERVICE_CATEGORIES = {
  "LICENCE RELATED": [
    "MCWG", "MCWOG", "LMV", "TRAINING ONLY", "BADGE", "HTV", "CONDUCTOR LICENCE",
    "RENEWAL OF DL/CL", "REVALUATION", "CHANGE OF ADDRESS", "CHANGE OF NAME",
    "DUPLICATE DL", "IDPL", "CLUBBING", "EDIT PARTICULARS", "OTHERS (DL)"
  ],
  "VEHICLE RELATED": [
    "NEW REGISTRATION", "TEMP REGISTRATION", "RE-REGISTRATION", "TRANSFER OF OWNERSHIP",
    "HYPOTHECATION TERMINATION", "HYPOTHECATION ADDITION", "HYPOTHECATION CONTINUATION",
    "DUPLICATE RC", "CHANGE OF ADDRESS IN RC", "CONVECTION", "ALTERATIONS",
    "FITNESS CERTIFICATE", "NOC", "MODIFY", "RENEWAL OF REGISTRATION", "OTHERS (RC)"
  ],
  "PERMIT RELATED": [
    "FRESH PERMIT", "RENEWAL OF PERMIT", "SURRENDER OF PERMIT",
    "CHANGE OF ADDRESS IN PERMIT", "TEMP PERMIT", "TRANSFER OF PERMIT", "OTHERS (PERMIT)"
  ],
  "TAX / CHALLAN": [
    "MV TAX", "GREEN TAX", "CHALLAN", "BALANCE TAX", "LIFE TAX", "BLOCKLISTED", "OTHER (TAX)"
  ]
};

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    setupTitle: "BUSINESS PROFILE SETUP",
    businessName: "BUSINESS NAME",
    mobileNumber: "BUSINESS MOBILE NUMBER",
    email: "BUSINESS MAIL",
    address: "BUSINESS ADDRESS",
    gstNumber: "GST NUMBER",
    optional: "(Optional)",
    submit: "SUBMIT",
    language: "Language",
    customerDetails: "CUSTOMER DETAILS",
    customerName: "CUSTOMER NAME",
    customerMobile: "MOBILE NUMBER",
    vehicleNumber: "R.NO / DL.NO / ID NO (optional)",
    remarks: "REMARKS",
    serviceNeeds: "SERVICE NEEDS",
    searchServices: "Search services...",
    selectedServices: "SELECTED SERVICES",
    price: "Price",
    gstPercent: "GST %",
    total: "Total",
    amountPaid: "Amount Paid",
    balance: "Balance Amount",
    pending: "Pending Amount",
    save: "SAVE",
    editProfile: "Edit Profile",
    history: "History",
    logout: "Logout",
    theme: "Theme",
    historyTitle: "TRANSACTION HISTORY",
    noTransactions: "No transactions available.",
    date: "Date",
    searchPlaceholder: "Search name, mobile, vehicle...",
    unpaidFilter: "Unpaid Only",
    allFilter: "All Transactions",
    downloadAll: "Download All (JSON)",
    clearAll: "Clear All History",
    transactionDetail: "TRANSACTION DETAIL",
    printReceipt: "Print Receipt",
    markAsPaid: "Mark as Fully Paid",
    callCustomer: "Call Customer",
    confirmClear: "This will permanently delete all transaction history. Are you sure?",
    confirmPaid: "Are you sure you want to mark this transaction as fully paid?",
    themeSelection: "Theme Selection",
    selectTheme: "Select Theme",
    successTitle: "TRANSACTION SUCCESSFUL",
    downloadMonthWise: "Download Month-wise (PDF)",
    downloadAllPDF: "Download All (PDF)",
    selectMonth: "Select Month",
    selectYear: "Select Year",
    download: "Download",
    cancel: "Cancel",
    delete: "Delete",
    deleteTransaction: "Delete Transaction",
    noTransactionsMonth: "No transactions found for selected month."
  },
  ta: {
    setupTitle: "வணிக சுயவிவர அமைப்பு",
    businessName: "வணிகப் பெயர்",
    mobileNumber: "வணிக மொபைல் எண்",
    email: "வணிக மின்னஞ்சல்",
    address: "வணிக முகவரி",
    gstNumber: "ஜிஎஸ்டி எண்",
    optional: "(விருப்பமானது)",
    submit: "சமர்ப்பி",
    language: "மொழி",
    customerDetails: "வாடிக்கையாளர் விவரங்கள்",
    customerName: "வாடிக்கையாளர் பெயர்",
    customerMobile: "மொபைல் எண்",
    vehicleNumber: "R.NO / DL.NO / ID NO (விருப்பமானது)",
    remarks: "குறிப்புகள்",
    serviceNeeds: "சேவை தேவைகள்",
    searchServices: "சேவைகளைத் தேடு...",
    selectedServices: "தேர்ந்தெடுக்கப்பட்ட சேவைகள்",
    price: "விலை",
    gstPercent: "ஜிஎஸ்டி %",
    total: "மொத்தம்",
    amountPaid: "செலுத்தப்பட்ட தொகை",
    balance: "மீதமுள்ள தொகை",
    pending: "நிலுவையில் உள்ள தொகை",
    save: "சேமி",
    editProfile: "சுயவிவரத்தைத் திருத்து",
    history: "வரலாறு",
    logout: "வெளியேறு",
    theme: "தீம்",
    historyTitle: "பரிவர்த்தனை வரலாறு",
    noTransactions: "பரிவர்த்தனைகள் எதுவும் இல்லை.",
    date: "தேதி",
    searchPlaceholder: "பெயர், மொபைல், வாகனம் தேடு...",
    unpaidFilter: "செலுத்தப்படாதவை மட்டும்",
    allFilter: "அனைத்து பரிவர்த்தனைகள்",
    downloadAll: "அனைத்தையும் பதிவிறக்கு (JSON)",
    clearAll: "வரலாற்றை அழி",
    transactionDetail: "பரிவர்த்தனை விவரம்",
    printReceipt: "ரசீது அச்சிடு",
    markAsPaid: "முழுமையாக செலுத்தப்பட்டதாகக் குறிக்கவும்",
    callCustomer: "வாடிக்கையாளரை அழைக்கவும்",
    confirmClear: "இது அனைத்து பரிவர்த்தனை வரலாற்றையும் நிரந்தரமாக அழித்துவிடும். நிச்சயமாக அழிக்க வேண்டுமா?",
    confirmPaid: "இந்த பரிவர்த்தனை முழுமையாக செலுத்தப்பட்டதாகக் குறிக்க நிச்சயமாக வேண்டுமா?",
    themeSelection: "தீம் தேர்வு",
    selectTheme: "தீம் தேர்ந்தெடுக்கவும்",
    successTitle: "பரிவர்த்தனை வெற்றி",
    downloadMonthWise: "மாதாந்திர பதிவிறக்கம் (PDF)",
    downloadAllPDF: "அனைத்தையும் பதிவிறக்கு (PDF)",
    selectMonth: "மாதத்தைத் தேர்ந்தெடுக்கவும்",
    selectYear: "ஆண்டைத் தேர்ந்தெடுக்கவும்",
    download: "பதிவிறக்கு",
    cancel: "ரத்துசெய்",
    delete: "அழி",
    deleteTransaction: "பரிவர்த்தனையை அழி",
    noTransactionsMonth: "தேர்ந்தெடுக்கப்பட்ட மாதத்தில் பரிவர்த்தனைகள் எதுவும் இல்லை."
  },
  hi: {
    setupTitle: "व्यवसाय प्रोफ़ाइल सेटअप",
    businessName: "व्यवसाय का नाम",
    mobileNumber: "व्यवसाय मोबाइल नंबर",
    email: "व्यवसाय मेल",
    address: "व्यवसाय का पता",
    gstNumber: "जीएसटी नंबर",
    optional: "(वैकल्पिक)",
    submit: "जमा करें",
    language: "भाषा",
    customerDetails: "ग्राहक विवरण",
    customerName: "ग्राहक का नाम",
    customerMobile: "मोबाइल नंबर",
    vehicleNumber: "R.NO / DL.NO / ID NO (वैकल्पिक)",
    remarks: "टिप्पणियाँ",
    serviceNeeds: "सेवा आवश्यकताएं",
    searchServices: "सेवाएं खोजें...",
    selectedServices: "चयनित सेवाएं",
    price: "कीमत",
    gstPercent: "जीएसटी %",
    total: "कुल",
    amountPaid: "भुगतान की गई राशि",
    balance: "शेष राशि",
    pending: "लंबित राशि",
    save: "सहेजें",
    editProfile: "प्रोफ़ाइल संपादित करें",
    history: "इतिहास",
    logout: "लॉगआउट",
    theme: "थीम",
    historyTitle: "लेन-देन इतिहास",
    noTransactions: "कोई लेन-देन उपलब्ध नहीं है।",
    date: "तारीख",
    searchPlaceholder: "नाम, मोबाइल, वाहन खोजें...",
    unpaidFilter: "केवल बकाया",
    allFilter: "सभी लेन-देन",
    downloadAll: "सभी डाउनलोड करें (JSON)",
    clearAll: "इतिहास साफ़ करें",
    transactionDetail: "लेन-देन विवरण",
    printReceipt: "रसीद प्रिंट करें",
    markAsPaid: "पूर्ण भुगतान के रूप में चिह्नित करें",
    callCustomer: "ग्राहक को कॉल करें",
    confirmClear: "यह सभी लेन-देन इतिहास को स्थायी रूप से हटा देगा। क्या आप सुनिश्चित हैं?",
    confirmPaid: "क्या आप वाकई इस लेन-देन को पूर्ण भुगतान के रूप में चिह्नित करना चाहते हैं?",
    themeSelection: "थीम चयन",
    selectTheme: "थीम चुनें",
    successTitle: "लेन-देन सफल",
    downloadMonthWise: "मासिक डाउनलोड (PDF)",
    downloadAllPDF: "सभी डाउनलोड करें (PDF)",
    selectMonth: "महीना चुनें",
    selectYear: "वर्ष चुनें",
    download: "डाउनलोड",
    cancel: "रद्द करें",
    delete: "हटाएं",
    deleteTransaction: "लेन-देन हटाएं",
    noTransactionsMonth: "चयनित महीने के लिए कोई लेन-देन नहीं मिला।"
  },
  ml: {
    setupTitle: "ബിസിനസ് പ്രൊഫൈൽ സജ്ജീകരണം",
    businessName: "ബിസിനസ്സ് പേര്",
    mobileNumber: "ബിസിനസ്സ് മൊബൈൽ നമ്പർ",
    email: "ബിസിനസ്സ് മെയിൽ",
    address: "ബിസിനസ്സ് വിലാസം",
    gstNumber: "ജിഎസ്ടി നമ്പർ",
    optional: "(ഓപ്ഷണൽ)",
    submit: "സമർപ്പിക്കുക",
    language: "ഭാഷ",
    customerDetails: "ഉപഭോക്തൃ വിശദാംശങ്ങൾ",
    customerName: "ഉപഭോക്താവിന്റെ പേര്",
    customerMobile: "മൊബൈൽ നമ്പർ",
    vehicleNumber: "R.NO / DL.NO / ID NO (ഓപ്ഷണൽ)",
    remarks: "കുറിപ്പുകൾ",
    serviceNeeds: "സേവന ആവശ്യങ്ങൾ",
    searchServices: "സേവനങ്ങൾ തിരയുക...",
    selectedServices: "തിരഞ്ഞെടുത്ത സേവനങ്ങൾ",
    price: "വില",
    gstPercent: "ജിഎസ്ടി %",
    total: "ആകെ",
    amountPaid: "അടച്ച തുക",
    balance: "ബാക്കി തുക",
    pending: "കുടിശ്ശിക തുക",
    save: "സേവ് ചെയ്യുക",
    editProfile: "പ്രൊഫൈൽ എഡിറ്റ് ചെയ്യുക",
    history: "ചരിത്രം",
    logout: "ലോഗൗട്ട്",
    theme: "തീം",
    historyTitle: "ഇടപാട് ചരിത്രം",
    noTransactions: "ഇടപാടുകളൊന്നും ലഭ്യമല്ല.",
    date: "തിയതി",
    searchPlaceholder: "പേര്, മൊബൈൽ, വാഹനം തിരയുക...",
    unpaidFilter: "കുടിശ്ശിക മാത്രം",
    allFilter: "എല്ലാ ഇടപാടുകളും",
    downloadAll: "എല്ലാം ഡൗൺലോഡ് ചെയ്യുക (JSON)",
    clearAll: "ചരിത്രം മായ്ക്കുക",
    transactionDetail: "ഇടപാട് വിവരം",
    printReceipt: "രസീത് പ്രിന്റ് ചെയ്യുക",
    markAsPaid: "പൂർണ്ണമായി അടച്ചതായി അടയാളപ്പെടുത്തുക",
    callCustomer: "ഉപഭോക്താവിനെ വിളിക്കുക",
    confirmClear: "ഇത് എല്ലാ ഇടപാട് ചരിത്രവും ശാശ്വതമായി ഇല്ലാതാക്കും. നിങ്ങൾക്ക് ഉറപ്പാണോ?",
    confirmPaid: "ഈ ഇടപാട് പൂർണ്ണമായി അടച്ചതായി അടയാളപ്പെടുത്താൻ നിങ്ങൾക്ക് ഉറപ്പാണോ?",
    themeSelection: "തീം തിരഞ്ഞെടുക്കൽ",
    selectTheme: "തീം തിരഞ്ഞെടുക്കുക",
    successTitle: "ഇടപാട് വിജയിച്ചു",
    downloadMonthWise: "മാസാടിസ്ഥാനത്തിൽ ഡൗൺലോഡ് ചെയ്യുക (PDF)",
    downloadAllPDF: "എല്ലാം ഡൗൺലോഡ് ചെയ്യുക (PDF)",
    selectMonth: "മാസം തിരഞ്ഞെടുക്കുക",
    selectYear: "വർഷം തിരഞ്ഞെടുക്കുക",
    download: "ഡൗൺലോഡ്",
    cancel: "റദ്ദാക്കുക",
    delete: "നീക്കം ചെയ്യുക",
    deleteTransaction: "ഇടപാട് നീക്കം ചെയ്യുക",
    noTransactionsMonth: "തിരഞ്ഞെടുത്ത മാസത്തിൽ ഇടപാടുകളൊന്നും കണ്ടെത്തിയില്ല."
  }
};

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ml', name: 'Malayalam' }
] as const;

export const THEMES: Theme[] = [
  {
    id: 'modern',
    name: 'Compact Modern SaaS',
    colors: {
      primary: '#2563eb',
      secondary: '#f1f5f9',
      background: '#f8fafc',
      foreground: '#0f172a',
      card: '#ffffff',
      border: '#e2e8f0',
      input: '#f1f5f9',
      ring: '#2563eb',
      accent: '#4f46e5',
    }
  },
  {
    id: 'dark-finance',
    name: 'Dark Finance',
    colors: {
      primary: '#10b981',
      secondary: '#1e293b',
      background: '#0f172a',
      foreground: '#f8fafc',
      card: '#1e293b',
      border: '#334155',
      input: '#334155',
      ring: '#10b981',
      accent: '#10b981',
    }
  },
  {
    id: 'minimal',
    name: 'Minimal Soft UI',
    colors: {
      primary: '#6366f1',
      secondary: '#f3f4f6',
      background: '#fafafa',
      foreground: '#1f2937',
      card: '#ffffff',
      border: '#f3f4f6',
      input: '#f9fafb',
      ring: '#6366f1',
      accent: '#6366f1',
    }
  },
  {
    id: 'red-pro',
    name: 'Red Pro',
    colors: {
      primary: '#8B0000',
      secondary: '#FFE4E1',
      background: '#FFF5F5',
      foreground: '#1A1A1A',
      card: '#ffffff',
      border: '#FFDADA',
      input: '#FFF5F5',
      ring: '#8B0000',
      accent: '#B22222',
    }
  },
  {
    id: 'black-white',
    name: 'Black & White',
    colors: {
      primary: '#000000',
      secondary: '#f1f5f9',
      background: '#ffffff',
      foreground: '#000000',
      card: '#ffffff',
      border: '#000000',
      input: '#ffffff',
      ring: '#000000',
      accent: '#333333',
    }
  }
];

export const TERMS_AND_CONDITIONS = `
# Terms & Conditions

Welcome to DS-REGISTER. By using our application, you agree to the following terms:

## 1. Acceptance of Terms
By accessing or using DS-REGISTER, you agree to be bound by these Terms and Conditions and our Privacy Policy.

## 2. Free Trial
New users are eligible for a 14-day free trial period starting from the date of account creation.
During the trial period, users may access premium features without payment.
After the 14-day trial expires, continued access to premium features requires an active paid subscription.
The trial period is granted once per user account and cannot be reset by deleting data or creating duplicate accounts.

## 3. User Responsibilities
You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.

## 4. Data Accuracy
Users are responsible for the accuracy of the data entered into the system, including business details and transaction records.

## 5. Limitation of Liability
DS-REGISTER shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.

## 6. Modifications to Service
We reserve the right to modify or discontinue the service at any time without notice.
`;

export const PRIVACY_POLICY = `
# Privacy Policy

Your privacy is important to us. This policy explains how we handle your data:

## 1. Data Collection
We collect information you provide directly to us, such as business name, contact details, and transaction data.

## 2. Data Usage
We use the collected data to provide, maintain, and improve our services, and to process your transactions.

## 3. Data Security
We implement reasonable security measures to protect your information from unauthorized access or disclosure.

## 4. Third-Party Services
We may use third-party services like Firebase for data storage and Razorpay for payment processing. These services have their own privacy policies.

## 5. User Rights
You have the right to access, update, or delete your personal information at any time through the application settings. You can contact us at support@dsregister.in for any assistance.
`;
