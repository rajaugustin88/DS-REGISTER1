import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs, deleteDoc, serverTimestamp, addDoc, runTransaction } from 'firebase/firestore';
import { BusinessProfile, Transaction } from '../types';

export const getUserProfile = async (uid: string): Promise<BusinessProfile | null> => {
  const docRef = doc(db, 'users', uid, 'business', 'profile');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as BusinessProfile;
  }
  return null;
};

export const saveUserProfile = async (uid: string, profile: BusinessProfile) => {
  const docRef = doc(db, 'users', uid, 'business', 'profile');
  await setDoc(docRef, {
    ...profile,
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

export const saveTransaction = async (uid: string, transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
  const profileRef = doc(db, 'users', uid, 'business', 'profile');
  const transactionsColRef = collection(db, 'users', uid, 'transactions');

  await runTransaction(db, async (transaction_db) => {
    const profileSnap = await transaction_db.get(profileRef);
    let lastReceiptNumber = 0;
    if (profileSnap.exists()) {
      lastReceiptNumber = profileSnap.data().lastReceiptNumber || 0;
    }
    
    const nextReceiptNumber = lastReceiptNumber + 1;
    const receiptNumberStr = nextReceiptNumber.toString().padStart(5, '0');
    
    // Update profile with new lastReceiptNumber
    transaction_db.update(profileRef, { lastReceiptNumber: nextReceiptNumber });
    
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

export const clearUserHistory = async (uid: string) => {
  const colRef = collection(db, 'users', uid, 'transactions');
  const querySnap = await getDocs(colRef);
  const deletePromises = querySnap.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
};
