import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  Timestamp,
  writeBatch,
  doc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ReceiptAnalysis } from './aiService';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

export interface Bill {
  id?: string;
  userId: string;
  billDate: string;
  vendorName: string;
  imageUrl: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  recordedBy: string;
  referenceNo?: string;
  createdAt: any;
}

export interface BillItem {
  id?: string;
  userId: string;
  billId: string;
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  total: number;
  date: string;
}

export async function saveScannedBill(analysis: ReceiptAnalysis, imageUrl: string) {
  if (!auth.currentUser) throw new Error("User not authenticated");

  const userId = auth.currentUser.uid;
  const userName = auth.currentUser.displayName || auth.currentUser.email || "Unknown";

  const batch = writeBatch(db);

  // 1. Create the Bill document reference
  const billRef = doc(collection(db, 'bills'));
  
  // Generate reference number based on bill date
  const cleanDate = analysis.date.replace(/\D/g, ''); // Extract only digits
  const shortUid = Math.random().toString(36).substring(2, 6).toUpperCase();
  const referenceNo = cleanDate ? `REF-${cleanDate}-${shortUid}` : `REF-${Date.now()}`;

  const billData: Omit<Bill, 'id'> = {
    userId,
    billDate: analysis.date,
    vendorName: analysis.merchantName,
    imageUrl: imageUrl,
    totalAmount: analysis.totalAmount,
    taxAmount: 0, 
    discountAmount: 0,
    recordedBy: userName,
    referenceNo: referenceNo,
    createdAt: serverTimestamp()
  };

  batch.set(billRef, billData);

  // 2. Create the BillItems
  analysis.items.forEach((item) => {
    const itemRef = doc(collection(db, 'bill_items'));
    const itemData: Omit<BillItem, 'id'> = {
      userId,
      billId: billRef.id,
      description: item.description,
      quantity: item.quantity,
      unit: '', 
      pricePerUnit: item.unitPrice,
      total: item.amount,
      date: analysis.date
    };
    batch.set(itemRef, itemData);
  });

  try {
    await batch.commit();
    return billRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'bills/bill_items batch');
  }
}

export async function getHistoricalItemDescriptions(): Promise<string[]> {
  if (!auth.currentUser) return [];
  const path = 'bill_items';
  try {
    const q = query(
      collection(db, path),
      orderBy('description'),
      limit(200) // Don't fetch too many to avoid hitting prompt limits
    );
    const snapshot = await getDocs(q);
    const descriptions = snapshot.docs.map(doc => doc.data().description as string);
    // Unique list
    return Array.from(new Set(descriptions)).filter(d => !!d);
  } catch (err) {
    console.error("Error fetching historical descriptions:", err);
    return [];
  }
}

export async function getBills() {
  if (!auth.currentUser) return [];
  const path = 'bills';
  try {
    const q = query(
      collection(db, path), 
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function getBillItems(billId: string) {
  if (!auth.currentUser) return [];
  const path = 'bill_items';
  try {
    const q = query(
      collection(db, path), 
      where('billId', '==', billId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BillItem));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}
