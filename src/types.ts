export type Language = 'en' | 'ta' | 'hi' | 'ml';

export interface BusinessProfile {
  businessName: string;
  mobileNumber: string;
  email: string;
  address: string;
  gstNumber?: string;
  lastReceiptNumber?: number;
}

export interface Transaction {
  id: string;
  createdAt: any;
  receiptNumber?: string;
  customerName: string;
  customerMobile?: string;
  vehicleNumber?: string;
  remarks?: string;
  services: {
    name: string;
    price: number;
  }[];
  subtotal: number;
  tax?: number;
  totalAmount: number;
  amountPaid: number;
  dueAmount: number;
  paymentStatus: 'Paid' | 'Unpaid';
}

export type ThemeId = 'light' | 'dark';

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
  submit: string;
  language: string;
  // Billing Page
  customerDetails: string;
  customerName: string;
  customerMobile: string;
  vehicleNumber: string;
  remarks: string;
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
