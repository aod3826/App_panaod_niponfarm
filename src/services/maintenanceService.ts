import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

export interface MaintenanceRequest {
  id?: string;
  userId: string;
  title: string;
  description: string;
  location: string;
  locationDetails?: string;
  category: string;
  requiredParts?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reportedBy: string;
  createdAt: number;
  resolvedAt?: number;
}

const COLLECTION_NAME = 'maintenance_requests';

export const createMaintenanceRequest = async (request: Omit<MaintenanceRequest, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...request,
      createdAt: Date.now()
    });
    return { id: docRef.id, ...request };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
};

export const updateMaintenanceStatus = async (id: string, status: MaintenanceRequest['status']) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = { status };
    if (status === 'RESOLVED') {
      updateData.resolvedAt = Date.now();
    }
    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${id}`);
  }
};

export const deleteMaintenanceRequest = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};
