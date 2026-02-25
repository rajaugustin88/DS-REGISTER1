export type Language = 'en' | 'ta' | 'hi' | 'ml';

export interface BusinessProfile {
  businessName: string;
  mobileNumber: string;
  email: string;
  address: string;
  gstNumber?: string;
  logo?: string;
  qrCodes: string[];
}

export interface Transaction {
  id: string;
  date: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerIdNo?: string;
  services: {
    name: string;
    price: number;
  }[];
  gstPercent?: number;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  pendingAmount: number;
}

export type ThemeId = 'dark-purple' | 'black-green' | 'dark-blue' | 'purple-brand' | 'red-black' | 'light-minimal';

export interface Theme {
  id: ThemeId;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    card: string;
    border: string;
    input: string;
    ring: string;
    accent: string;
  };
}

export interface Translations {
  setupTitle: string;
  businessName: string;
  mobileNumber: string;
  email: string;
  address: string;
  gstNumber: string;
  optional: string;
  logoUpload: string;
  qrCodesTitle: string;
  qrMandatory: string;
  submit: string;
  language: string;
  // Billing Page
  customerDetails: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  idNo: string;
  serviceNeeds: string;
  searchServices: string;
  selectedServices: string;
  price: string;
  gstPercent: string;
  total: string;
  amountPaid: string;
  balance: string;
  pending: string;
  save: string;
  // Dropdown
  editProfile: string;
  history: string;
  logout: string;
  theme: string;
  // History
  historyTitle: string;
  noTransactions: string;
  date: string;
  searchPlaceholder: string;
  unpaidFilter: string;
  allFilter: string;
  downloadAll: string;
  clearAll: string;
  transactionDetail: string;
  printReceipt: string;
  markAsPaid: string;
  callCustomer: string;
  confirmClear: string;
  confirmPaid: string;
  themeSelection: string;
  selectTheme: string;
  successTitle: string;
  downloadMonthWise: string;
  downloadAllPDF: string;
  selectMonth: string;
  selectYear: string;
  download: string;
  cancel: string;
  noTransactionsMonth: string;
}
