import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  limit,
  serverTimestamp,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Word, UserProgress } from '../types';

export const dbService = {
  async getDailyBatch(userId: string): Promise<Word[]> {
    try {
      const now = new Date();
      // 1. Fetch words due for review
      const qDue = query(
        collection(db, `users/${userId}/progress`),
        where('next_review_due', '<=', Timestamp.fromDate(now)),
        limit(10)
      );
      
      const dueSnapshot = await getDocs(qDue);
      const dueWordIds = dueSnapshot.docs.map(d => (d.data() as UserProgress).wordId);
      
      let words: Word[] = [];
      
      if (dueWordIds.length > 0) {
        // Fetch full word details
        // Note: Firestore 'in' query limited to 10 items
        const qWords = query(collection(db, 'words'), where('__name__', 'in', dueWordIds));
        const wordsSnapshot = await getDocs(qWords);
        words = wordsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Word));
      }

      // 2. If short on words, add some "new" or sample ones
      if (words.length < 5) {
        // In a real app, you'd fetch from a global 'words' collection that current user hasn't seen
        // For this demo, we'll supplement with global words
        const qGlobal = query(collection(db, 'words'), limit(5));
        const globalSnapshot = await getDocs(qGlobal);
        const globalWords = globalSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Word));
        
        // Combine and dedup
        const existingIds = new Set(words.map(w => w.id));
        globalWords.forEach(w => {
          if (!existingIds.has(w.id)) words.push(w);
        });
      }

      return words;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/progress`);
      return [];
    }
  },

  async syncUserProfile(user: any) {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      // Often fails if rules are propagating, so we just log
      console.warn("Profile sync delay:", error);
    }
  }
};
