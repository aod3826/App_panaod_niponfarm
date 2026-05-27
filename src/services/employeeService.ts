import { collection, addDoc, onSnapshot, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SalaryAdvance, EmployeeBaseSalary } from '../types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { OperationType, handleFirestoreError } from '../lib/firestore-error';

const SALARY_ADVANCES_COLLECTION = 'salary_advances';
const SALARIES_COLLECTION = 'employee_salaries';

const getCurrentUserId = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  return userId;
};

export const addAdvance = async (amount: number, date: string) => {
  const userId = getCurrentUserId();
  try {
    const docRef = await addDoc(collection(db, SALARY_ADVANCES_COLLECTION), {
      userId,
      amount,
      date,
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding advance: ", error);
    handleFirestoreError(error, OperationType.CREATE, SALARY_ADVANCES_COLLECTION);
    throw error;
  }
};

export const updateAdvanceStatus = async (advanceId: string, status: 'APPROVED' | 'REJECTED') => {
  try {
    const docRef = doc(db, SALARY_ADVANCES_COLLECTION, advanceId);
    await updateDoc(docRef, {
      status,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error updating advance: ", error);
    handleFirestoreError(error, OperationType.UPDATE, SALARY_ADVANCES_COLLECTION);
    throw error;
  }
}

export const subscribeToMonthlyAdvances = (monthDate: Date, callback: (advances: SalaryAdvance[]) => void) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  const start = startOfMonth(monthDate).toISOString().split('T')[0];
  const end = endOfMonth(monthDate).toISOString().split('T')[0];

  const q = query(
    collection(db, SALARY_ADVANCES_COLLECTION),
    where('date', '>=', start),
    where('date', '<=', end)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryAdvance)));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, SALARY_ADVANCES_COLLECTION);
  });
};

export const subscribeToPendingAdvances = (callback: (advances: SalaryAdvance[]) => void) => {
  const q = query(
    collection(db, SALARY_ADVANCES_COLLECTION),
    where('status', '==', 'PENDING')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryAdvance)));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, SALARY_ADVANCES_COLLECTION);
  });
};

export const saveBaseSalary = async (employeeUserId: string, base_salary: number) => {
  try {
    await setDoc(doc(db, SALARIES_COLLECTION, employeeUserId), {
      userId: employeeUserId,
      base_salary,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error saving base salary: ", error);
    handleFirestoreError(error, OperationType.WRITE, SALARIES_COLLECTION);
    throw error;
  }
};

export const subscribeToBaseSalaries = (callback: (salaries: EmployeeBaseSalary[]) => void) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  const q = query(
    collection(db, SALARIES_COLLECTION)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeBaseSalary)));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, SALARIES_COLLECTION);
  });
};

