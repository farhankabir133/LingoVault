import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Sparkles, Brain, BookOpen, ChevronRight, CheckCircle2, RotateCcw, HelpCircle, Quote, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/Skeleton';

interface Word {
  id: string;
  word: string;
  bn_meaning: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Breakdown {
  etymology: string;
  nuance: string;
  mnemonic: string;
  sentences: string[];
}

export const StudyAI: React.FC = () => {
  const [learnedWords, setLearnedWords] = useState<Word[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<'quiz' | 'explanation' | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [breakdowns, setBreakdowns] = useState<(Breakdown & { word: string })[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (isLoginLoading) return;
    setIsLoginLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  useEffect(() => {
    const fetchWords = async () => {
      if (!user) {
        setLoading(false);
        setLearnedWords([]);
        return;
      }
      
      setLoading(true);
      try {
        const userId = user.uid;
        const q = query(collection(db, `users/${userId}/progress`), limit(10));
        const snapshot = await getDocs(q);
        
        const wordIds = snapshot.docs.map(doc => doc.id);
        if (wordIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch original word data
        const words: Word[] = [];
        for (const id of wordIds) {
          const wordDoc = await getDocs(query(collection(db, 'words'), limit(20))); // Simplified fetch
          // In a real app we'd fetch specific IDs. For now, matching from local or just getting first few
          const found = wordDoc.docs.find(d => d.id === id);
          if (found) {
            words.push({ id, ...found.data() } as Word);
          }
        }
        setLearnedWords(words);
      } catch (err) {
        console.error("Error fetching words for study:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWords();
  }, [user]);

  const handleToggleWord = (id: string) => {
    setSelectedWords(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (type: 'quiz' | 'explanation') => {
    if (selectedWords.length === 0) return;
    
    setGeneratingType(type);
    setGenerating(true);
    setQuiz(null);
    setBreakdowns(null);
    setQuizFinished(false);
    setCurrentQuizIndex(0);
    setQuizScore(0);

    try {
      const wordsToStudy = learnedWords
        .filter(w => selectedWords.includes(w.id))
        .map(w => w.word);

      const response = await fetch('/api/ai/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsToStudy, type })
      });

      const data = await response.json();
      if (type === 'quiz') setQuiz(data);
      else setBreakdowns(data);
    } catch (err) {
      console.error("Study generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (selectedOption !== null || !quiz) return;
    setSelectedOption(index);
    if (index === quiz[currentQuizIndex].correctIndex) {
      setQuizScore(prev => prev + 1);
    }

    setTimeout(() => {
      setSelectedOption(null);
      if (currentQuizIndex < quiz.length - 1) {
        setCurrentQuizIndex(prev => prev + 1);
      } else {
        setQuizFinished(true);
      }
    }, 1500);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
        <div className="p-4 bg-dark-card border border-dark-border rounded-3xl mb-6 w-full">
          <Sparkles className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Neural Link Required</h3>
          <p className="text-text-dim text-sm leading-relaxed italic">
            Sign in to allow the AI to analyze your vocabulary progress and generate custom study modules.
          </p>
        </div>
        <button 
          onClick={handleLogin}
          className="bg-gold text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gold/90 transition-all flex items-center gap-2"
        >
          Initialize Link <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Word Selection */}
      {!quiz && !breakdowns && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card border border-dark-border rounded-3xl p-8"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-gold/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="text-white font-bold tracking-tight">AI Study Architect</h3>
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em]">Neural Customization</p>
            </div>
          </div>

          <p className="text-sm text-text-dim mb-6 italic">Select words from your vault to build a custom training session.</p>
          
          <div className="grid grid-cols-2 gap-3 mb-10">
            {learnedWords.map(word => (
              <button
                key={word.id}
                onClick={() => handleToggleWord(word.id)}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all",
                  selectedWords.includes(word.id) 
                    ? "border-gold bg-gold/5 text-gold shadow-lg shadow-gold/5" 
                    : "border-dark-border bg-dark-bg text-text-dim hover:border-text-dim/30"
                )}
              >
                <p className="font-serif font-bold text-sm tracking-tight">{word.word}</p>
                <p className="text-[10px] opacity-60 truncate">{word.bn_meaning}</p>
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleGenerate('quiz')}
              disabled={selectedWords.length === 0 || generating}
              className="flex-1 bg-dark-bg border border-dark-border text-white py-4 rounded-2xl flex items-center justify-center gap-3 hover:border-gold transition-all disabled:opacity-50 group"
            >
              <Brain className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Neural Quiz</span>
            </button>
            <button
              onClick={() => handleGenerate('explanation')}
              disabled={selectedWords.length === 0 || generating}
              className="flex-1 bg-gold text-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gold/90 transition-all disabled:opacity-50 group"
            >
              <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Linguistic Scan</span>
            </button>
          </div>

          {generating && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-center gap-3 text-gold text-xs font-bold animate-pulse mb-2">
                <div className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                {generatingType === 'quiz' ? 'FORMULATING ASSESSMENT...' : 'ARCHITECTING BREAKDOWN...'}
              </div>
              
              {generatingType === 'quiz' ? (
                <div className="space-y-4 bg-dark-bg/30 p-6 rounded-3xl border border-dark-border/20">
                  <div className="space-y-2 mb-8">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full rounded-2xl opacity-80" />
                    <Skeleton className="h-14 w-full rounded-2xl opacity-60" />
                    <Skeleton className="h-14 w-full rounded-2xl opacity-40" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-dark-bg/30 p-6 rounded-3xl border border-dark-border/20 space-y-4">
                      <Skeleton className="h-6 w-1/3 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full rounded-full" />
                        <Skeleton className="h-3 w-5/6 rounded-full" />
                      </div>
                      <Skeleton className="h-20 w-full rounded-2xl opacity-50" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Quiz Interface */}
      {quiz && !quizFinished && (
        <motion.div
          key="quiz-active"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-dark-card border border-dark-border rounded-3xl p-8"
        >
          <div className="flex justify-between items-center mb-8">
            <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em]">Question {currentQuizIndex + 1}/{quiz.length}</span>
            <span className="text-gold font-bold text-sm">{quizScore} Correct</span>
          </div>

          <h3 className="text-xl font-serif font-bold text-white mb-8 leading-relaxed italic">
            "{quiz[currentQuizIndex].question}"
          </h3>

          <div className="space-y-3">
            {quiz[currentQuizIndex].options.map((option, i) => {
              const isCorrect = i === quiz[currentQuizIndex].correctIndex;
              const isSelected = selectedOption === i;
              
              let buttonStyle = "border-dark-border bg-dark-bg hover:border-gold/50";
              if (selectedOption !== null) {
                if (isCorrect) buttonStyle = "border-green-500 bg-green-500/10 text-green-400";
                else if (isSelected) buttonStyle = "border-red-500 bg-red-500/10 text-red-400";
              }

              return (
                <button
                  key={i}
                  disabled={selectedOption !== null}
                  onClick={() => handleAnswer(i)}
                  className={cn(
                    "w-full p-5 rounded-2xl border text-left flex items-center justify-between transition-all group",
                    buttonStyle
                  )}
                >
                  <span className="text-sm font-medium">{option}</span>
                  {selectedOption !== null && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Quiz Finished */}
      {quizFinished && (
        <motion.div
          key="quiz-finished"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card border border-dark-border rounded-3xl p-10 text-center"
        >
          <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-gold" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-white mb-2">Training Complete</h3>
          <p className="text-text-dim text-sm mb-10">You identified {quizScore} of {quiz?.length} neural patterns correctly.</p>
          
          <button
            onClick={() => { setQuiz(null); setQuizFinished(false); }}
            className="w-full bg-gold text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gold/90 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Analysis
          </button>
        </motion.div>
      )}

      {/* Linguistic Breakdown */}
      {breakdowns && (
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif font-bold text-gold">Linguistic Reconstruction</h3>
            <button 
              onClick={() => setBreakdowns(null)}
              className="text-[9px] font-black text-text-dim uppercase tracking-widest hover:text-white"
            >
              Reset Session
            </button>
          </div>

          {breakdowns.map((data, i) => {
            return (
              <motion.div
                key={data.word}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-dark-card border border-dark-border rounded-3xl p-8"
              >
                <h4 className="text-2xl font-serif font-bold text-white mb-6 border-b border-dark-border pb-4">{data.word}</h4>
                
                <div className="space-y-6">
                  <div>
                    <span className="text-[8px] font-black text-gold uppercase tracking-[0.3em] block mb-2">Etymological Root</span>
                    <p className="text-sm text-text-main leading-relaxed font-serif italic">"{data.etymology}"</p>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-gold uppercase tracking-[0.3em] block mb-2">Usage Nuance</span>
                    <p className="text-sm text-text-dim leading-relaxed">{data.nuance}</p>
                  </div>

                  <div className="bg-gold/5 p-4 rounded-2xl border border-gold/10">
                     <div className="flex items-center gap-2 mb-2">
                       <HelpCircle className="w-3 h-3 text-gold/60" />
                       <span className="text-[8px] font-black text-text-dim uppercase tracking-[0.3em]">Neural Mnemonic</span>
                     </div>
                     <p className="text-xs text-gold/90 font-bold italic">"{data.mnemonic}"</p>
                  </div>

                  {data.sentences && data.sentences.length > 0 && (
                    <div className="pt-4 border-t border-dark-border">
                      <span className="text-[8px] font-black text-gold uppercase tracking-[0.3em] block mb-4">Architectural Context</span>
                      <div className="space-y-4">
                        {data.sentences.map((s, idx) => (
                          <div key={idx} className="flex gap-3 items-start">
                            <Quote className="w-3 h-3 text-gold/40 mt-1 flex-shrink-0" />
                            <p className="text-xs text-text-dim italic font-serif leading-relaxed line-clamp-3">
                              "{s}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
