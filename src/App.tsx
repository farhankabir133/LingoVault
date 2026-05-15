import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Database, Upload, Settings, Brain, BookOpen, Sparkles } from 'lucide-react';
import { DailyWordCard } from './components/DailyWordCard';
import { EveningChallenge } from './components/EveningChallenge';
import { VaultView } from './components/VaultView';
import { StudyAI } from './components/StudyAI';
import { SAMPLE_SENTENCES } from './constants';
import { Word } from './types';
import { cn } from './lib/utils';
import { dbService } from './lib/db';
import { auth } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

import { Skeleton } from './components/ui/Skeleton';

type AppMode = 'morning' | 'evening' | 'upload' | 'stats' | 'study';

export default function App() {
  const [mode, setMode] = useState<AppMode>('morning');
  const [dailyWords, setDailyWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSignOutLoading, setIsSignOutLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        dbService.syncUserProfile(u);
      } else {
        setDailyWords([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadBatch = async () => {
      if (!user) return;
      setIsLoadingWords(true);
      try {
        const words = await dbService.getDailyBatch(user.uid);
        setDailyWords(words);
      } catch (err) {
        console.error("Failed to load daily batch:", err);
      } finally {
        setIsLoadingWords(false);
      }
    };
    loadBatch();
  }, [user]);

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

  const handleLogout = async () => {
    setIsSignOutLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsSignOutLoading(false);
    }
  };

  const currentWord = dailyWords[currentWordIndex];
  const currentSentence = currentWord ? SAMPLE_SENTENCES[currentWord.id]?.[0] : null;

  const handleNext = () => {
    if (currentWordIndex < dailyWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(prev => prev - 1);
    }
  };

  const NavItem = ({ m, icon: Icon, label }: { m: AppMode; icon: any; label: string }) => (
    <button
      onClick={() => setMode(m)}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        mode === m ? "text-gold scale-110" : "text-text-dim hover:text-text-main"
      )}
    >
      <Icon className={cn("w-5 h-5", mode === m ? "stroke-[2.5]" : "stroke-[1.5]")} />
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-dark-bg text-text-main font-sans overflow-hidden flex flex-col">
      {/* Top Header */}
      <header className="px-8 py-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2 font-serif text-gold">
            LINGO<span className="text-text-main">VAULT</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em]">
              AI VOCAB ARCHITECTURE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
             <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest text-right">Daily Streak</p>
             <p className="text-lg font-bold text-gold">14 Days</p>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLogout}
                disabled={isSignOutLoading}
                className="text-[9px] font-black text-text-dim uppercase tracking-widest hover:text-gold transition-colors"
              >
                {isSignOutLoading ? '...' : 'Sign Out'}
              </button>
              <img src={user.photoURL || ''} alt="User" className="w-10 h-10 rounded-full border-2 border-dark-border border-t-gold p-0.5" />
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-10 h-10 rounded-full border-2 border-dark-border border-t-gold flex items-center justify-center text-[10px] text-gold hover:bg-gold/10 transition-colors"
            >
              IN
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <AnimatePresence mode="wait">
          {mode === 'morning' && (
            <motion.div
              key="morning"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Morning Mix</h2>
                <p className="text-text-dim text-sm italic">Curated high-yield batch for today</p>
              </div>

              {isLoadingWords ? (
                <div className="space-y-4">
                  <div className="bg-dark-card border border-dark-border rounded-[2.5rem] p-12 h-96 flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <Skeleton className="h-4 w-24 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-xl" />
                      </div>
                      <Skeleton className="h-16 w-3/4 rounded-2xl" />
                      <Skeleton className="h-4 w-1/2 rounded-full" />
                      <div className="space-y-3 pt-6">
                         <Skeleton className="h-4 w-full rounded-full" />
                         <Skeleton className="h-4 w-5/6 rounded-full" />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Skeleton className="h-12 flex-1 rounded-2xl" />
                      <Skeleton className="h-12 flex-1 rounded-2xl" />
                    </div>
                  </div>
                  <div className="flex justify-center gap-2 mt-12">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="w-1.5 h-1.5 rounded-full" />
                    ))}
                  </div>
                </div>
              ) : dailyWords.length > 0 ? (
                <>
                  <DailyWordCard
                    word={currentWord}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                  />
                  <div className="mt-12 flex justify-center gap-2">
                    {dailyWords.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all duration-300",
                          currentWordIndex === i ? "w-8 bg-gold" : "bg-dark-border"
                        )}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-dark-card border border-dark-border rounded-3xl p-12 text-center max-w-md mx-auto">
                   <Database className="w-12 h-12 text-text-dim mx-auto mb-6 opacity-20" />
                   <h3 className="text-xl font-bold text-white mb-2">Vault Empty</h3>
                   <p className="text-text-dim text-sm italic leading-relaxed">
                     No words in your current review cycle. Import a syllabus or add words to start your journey.
                   </p>
                </div>
              )}
            </motion.div>
          )}

          {mode === 'evening' && (
            <motion.div
              key="evening"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-serif font-bold tracking-tight mb-2 text-gold">Evening Challenge</h2>
                <p className="text-text-dim text-sm italic">Active recall verification</p>
              </div>
              {currentSentence ? (
                <EveningChallenge
                  word={currentWord}
                  sentence={currentSentence}
                  onSuccess={() => {
                    console.log("Correct!");
                    handleNext();
                  }}
                  onFailure={() => {
                    console.log("Failed. SRS logic triggered.");
                  }}
                />
              ) : (
                <div className="text-center p-12 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
                   <Brain className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                   <p className="text-slate-500">No challenges left for today.</p>
                </div>
              )}
            </motion.div>
          )}

          {mode === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-gold" />
                </div>
                <h2 className="text-2xl font-serif font-bold tracking-tight text-white">Syllabus Ingestion</h2>
                <p className="text-text-dim text-sm mt-2">AI-powered word extraction from images.</p>
              </div>

              <div className="border-2 border-dashed border-dark-border rounded-2xl p-12 text-center hover:border-gold transition-colors cursor-pointer group">
                <p className="text-text-dim group-hover:text-gold">Scan documents or screenshots</p>
                <div className="mt-4 text-[10px] font-bold text-text-dim bg-dark-bg inline-block px-3 py-1 rounded border border-dark-border">
                  JPG / PNG / PDF
                </div>
              </div>

              <button className="w-full mt-8 py-4 bg-gold text-black font-black rounded-2xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/10 uppercase tracking-widest text-xs">
                PROCEED TO ARCHIVE
              </button>
            </motion.div>
          )}

          {mode === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full overflow-y-auto custom-scrollbar"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-serif font-bold tracking-tight mb-2 text-gold">Lingo Vault</h2>
                <p className="text-text-dim text-sm italic">Your architectural record of linguistic growth</p>
              </div>
              <VaultView />
            </motion.div>
          )}

          {mode === 'study' && (
            <motion.div
              key="study"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full h-full overflow-y-auto custom-scrollbar"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-serif font-bold tracking-tight mb-2 text-gold">Neural Study</h2>
                <p className="text-text-dim text-sm italic">GenAI-driven cognitive reinforcement</p>
              </div>
              <StudyAI />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-dark-card border-t border-dark-border px-6 pt-4 pb-10 flex justify-between items-center z-50">
        <NavItem m="morning" icon={BookOpen} label="Learn" />
        <NavItem m="evening" icon={Brain} label="Review" />
        <NavItem m="study" icon={Sparkles} label="Study AI" />
        <NavItem m="upload" icon={Upload} label="Scan AI" />
        <NavItem m="stats" icon={Database} label="Vault" />
      </nav>
    </div>
  );
}
