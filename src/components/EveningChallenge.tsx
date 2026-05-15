import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Brain, RefreshCw, Send, Lightbulb } from 'lucide-react';
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Word, ContextSentence } from '../types';
import { cn } from '../lib/utils';

interface EveningChallengeProps {
  word: Word;
  sentence: ContextSentence;
  onSuccess: () => void;
  onFailure: () => void;
}

export const EveningChallenge: React.FC<EveningChallengeProps> = ({ word, sentence, onSuccess, onFailure }) => {
  const [userInput, setUserInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [attempts, setAttempts] = useState(0);

  // Parse sentence to create "blank"
  const parts = sentence.sentence.split(new RegExp(`(${word.word})`, 'gi'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;

    if (userInput.toLowerCase().trim() === word.word.toLowerCase()) {
      setStatus('correct');
      
      // Update SRS progress in real-time
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;
        const progressPath = `users/${userId}/progress/${word.id}`;
        const nextDueInHours = Math.pow(2, attempts + 1) * 24; // Simple exponential expansion
        const nextDue = new Date();
        nextDue.setHours(nextDue.getHours() + nextDueInHours);

        try {
          await setDoc(doc(db, `users/${userId}/progress`, word.id), {
            wordId: word.id,
            srs_stage: increment(1),
            next_review_due: nextDue,
            accuracy_score: attempts === 0 ? 1.0 : 0.5,
            last_reviewed: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, progressPath);
        }
      }

      setTimeout(onSuccess, 1500);
    } else {
      setStatus('incorrect');
      setAttempts(prev => prev + 1);
      setTimeout(() => {
        setStatus('idle');
        if (attempts >= 2) onFailure();
      }, 1500);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-dark-card rounded-3xl p-8 border border-dark-border shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-gold/10 rounded-xl">
            <Brain className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="text-white font-bold tracking-tight">Active Recall</h3>
            <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em]">{sentence.flavor} CONTEXT</p>
          </div>
        </div>

        <div className="mb-10 min-h-[100px] flex items-center">
          <p className="text-xl text-text-main leading-relaxed font-serif italic">
            {parts.map((part, i) => (
              part.toLowerCase() === word.word.toLowerCase() ? (
                <span key={i} className="inline-block min-w-[80px] border-b-2 border-gold mx-1 align-baseline text-gold font-bold not-italic">
                  {status === 'correct' ? part : ""}
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            ))}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type the missing word..."
              disabled={status !== 'idle'}
              className={cn(
                "w-full bg-dark-bg border-2 rounded-2xl px-6 py-4 text-white placeholder:text-text-dim outline-none transition-all font-serif",
                status === 'idle' ? "border-dark-border focus:border-gold" : "",
                status === 'correct' ? "border-green-500 bg-green-500/5 text-green-400" : "",
                status === 'incorrect' ? "border-red-500 bg-red-500/5 animate-shake text-red-400" : ""
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <AnimatePresence mode="wait">
                {status === 'correct' ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </motion.div>
                ) : status === 'incorrect' ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <XCircle className="w-6 h-6 text-red-500" />
                  </motion.div>
                ) : (
                  <button type="submit" className="p-2 bg-gold rounded-xl hover:bg-gold/90 transition-colors">
                    <Send className="w-5 h-5 text-black" />
                  </button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-[10px] font-bold text-text-dim text-center flex items-center justify-center gap-2 uppercase tracking-widest">
            <RefreshCw className={cn("w-3 h-3", status === 'idle' ? "" : "animate-spin")} />
            {attempts >= 1 ? `Attempt ${attempts + 1} of 3` : "First attempt"}
          </p>
        </form>
      </div>

      {sentence.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-5 bg-gold/5 border border-gold/10 rounded-2xl"
        >
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 text-gold/60 shrink-0" />
            <p className="text-sm text-text-dim italic font-serif">
              {sentence.explanation}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
