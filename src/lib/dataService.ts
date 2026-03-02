import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs, deleteDoc, serverTimestamp, addDoc, runTransaction, increment, onSnapshot } from 'firebase/firestore';
import { BusinessProfile, Transaction } from '../types';

export const getUserProfile = async (uid: string): Promise<BusinessProfile | null> => {
  const docRef = doc(db, 'users', uid, 'business', 'profile');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as BusinessProfile;
  }
  return null;
};

export const subscribeToUserProfile = (uid: string, callback: (profile: BusinessProfile | null) => void) => {
  const docRef = doc(db, 'users', uid, 'business', 'profile');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as BusinessProfile);
    } else {
      callback(null);
    }
  });
};

export const saveUserProfile = async (uid: string, profile: BusinessProfile) => {
  const docRef = doc(db, 'users', uid, 'business', 'profile');
  const docSnap = await getDoc(docRef);
  
  const now = new Date();
  const trialEndDate = new Date();
  trialEndDate.setDate(now.getDate() + 14);

  const defaults = {
    plan: 'free',
    subscriptionType: null,
    subscriptionStatus: 'trial',
    trialStartDate: now.toISOString(),
    trialEndDate: trialEndDate.toISOString()
  };

  const data = docSnap.exists() ? { ...docSnap.data(), ...profile } : { ...defaults, ...profile };

  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const getUserHistory = async (uid: string): Promise<Transaction[]> => {
  const colRef = collection(db, 'users', uid, 'transactions');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const querySnap = await getDocs(q);
  const history: Transaction[] = [];
  querySnap.forEach((doc) => {
    history.push({ id: doc.id, ...doc.data() } as Transaction);
  });
  return history;
};

export const subscribeToUserHistory = (uid: string, callback: (history: Transaction[]) => void) => {
  const colRef = collection(db, 'users', uid, 'transactions');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnap) => {
    const history: Transaction[] = [];
    querySnap.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    callback(history);
  });
};

export const checkTermsAccepted = async (uid: string): Promise<boolean> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().termsAccepted === true;
  }
  return false;
};

export const acceptTerms = async (uid: string) => {
  const docRef = doc(db, 'users', uid);
  await setDoc(docRef, {
    termsAccepted: true,
    termsAcceptedAt: serverTimestamp()
  }, { merge: true });
};

export const saveTransaction = async (uid: string, transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
  const profileRef = doc(db, 'users', uid, 'business', 'profile');
  const transactionsColRef = collection(db, 'users', uid, 'transactions');

  await runTransaction(db, async (transaction_db) => {
    const profileSnap = await transaction_db.get(profileRef);
    let lastReceiptNumber = 0;
    let transactionCount = 0;
    
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      lastReceiptNumber = data.lastReceiptNumber || 0;
    }
    
    const nextReceiptNumber = lastReceiptNumber + 1;
    const receiptNumberStr = nextReceiptNumber.toString().padStart(5, '0');
    
    // Update profile with new lastReceiptNumber
    transaction_db.update(profileRef, { 
      lastReceiptNumber: nextReceiptNumber
    });
    
    // Add transaction document
    const newTxRef = doc(transactionsColRef);
    transaction_db.set(newTxRef, {
      ...transaction,
      receiptNumber: receiptNumberStr,
      createdAt: serverTimestamp()
    });
  });
};

export const updateTransactionStatus = async (uid: string, transactionId: string, updates: Partial<Transaction>) => {
  const docRef = doc(db, 'users', uid, 'transactions', transactionId);
  await updateDoc(docRef, updates);
};

export const cancelTransaction = async (uid: string, transactionId: string) => {
  // Fixed cancel transaction Firestore update function.
  const docRef = doc(db, 'users', uid, 'transactions', transactionId);
  await updateDoc(docRef, {
    status: 'cancelled',
    cancelledAt: serverTimestamp()
  });
};

export const clearUserHistory = async (uid: string) => {
  const colRef = collection(db, 'users', uid, 'transactions');
  const querySnap = await getDocs(colRef);
  const deletePromises = querySnap.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
};

export const deleteUserAccount = async (uid: string) => {
  // 1. Delete all transactions
  await clearUserHistory(uid);
  
  // 2. Delete business profile
  const profileRef = doc(db, 'users', uid, 'business', 'profile');
  await deleteDoc(profileRef);
  
  // 3. Delete user root document (where termsAccepted is stored)
  const userRef = doc(db, 'users', uid);
  await deleteDoc(userRef);
};
