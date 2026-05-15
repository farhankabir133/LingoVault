import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, where, doc, getDocs } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Word, UserProgress, ContextSentence } from '../types';
import { Database, Filter, Calendar, Award, Clock, Lock, ArrowRight, BookOpen, Quote, ChevronDown, ChevronUp, Search, SortAsc, SortDesc, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/Skeleton';

interface WordWithProgress extends Word {
  progress?: UserProgress;
}

const toDate = (ts: any): Date => {
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  return new Date();
};

const getMasteryColor = (stage?: number) => {
  if (stage === undefined) return { 
    text: "text-text-dim", 
    bg: "bg-dark-bg", 
    border: "border-dark-border",
    dot: "bg-dark-border",
    label: "Unseen"
  };
  if (stage >= 4) return { 
    text: "text-green-400", 
    bg: "bg-green-500/10", 
    border: "border-green-500/20",
    dot: "bg-green-500",
    label: "Mastered"
  };
  return { 
    text: "text-gold", 
    bg: "bg-gold/10", 
    border: "border-gold/20",
    dot: "bg-gold",
    label: "Learning"
  };
};

export const VaultView: React.FC = () => {
  const [words, setWords] = useState<WordWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sentences, setSentences] = useState<Record<string, ContextSentence[]>>({});
  const [loadingSentences, setLoadingSentences] = useState<string | null>(null);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [masteryFilter, setMasteryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'review' | 'mastery'>('review');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchSentences = async (wordId: string) => {
    if (sentences[wordId] || loadingSentences === wordId) return;
    
    setLoadingSentences(wordId);
    try {
      const q = query(collection(db, `words/${wordId}/context_sentences`));
      const querySnapshot = await getDocs(q);
      const senList: ContextSentence[] = [];
      querySnapshot.forEach((doc) => {
        senList.push({ ...doc.data(), id: doc.id } as ContextSentence);
      });
      setSentences(prev => ({ ...prev, [wordId]: senList }));
    } catch (err) {
      console.error("Error fetching sentences:", err);
    } finally {
      setLoadingSentences(null);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchSentences(id);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
      }
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setWords([]);
      return;
    }

    setLoading(true);
    const userId = user.uid;
    const progressPath = `users/${userId}/progress`;
    const wordsPath = `words`;

    // 1. Listen to user progress
    const unsubscribeProgress = onSnapshot(
      collection(db, progressPath),
      (snapshot) => {
        const progressMap: Record<string, UserProgress> = {};
        snapshot.forEach((doc) => {
          progressMap[doc.id] = doc.data() as UserProgress;
        });

        // 2. Fetch all words
        const unsubscribeWords = onSnapshot(
          collection(db, wordsPath),
          (wordSnapshot) => {
            const wordList: WordWithProgress[] = [];
            wordSnapshot.forEach((wordDoc) => {
              const wordData = wordDoc.data() as Word;
              wordList.push({
                ...wordData,
                id: wordDoc.id,
                progress: progressMap[wordDoc.id]
              });
            });
            
            setWords(wordList);
            setLoading(false);
          },
          (err) => {
            if (err.message.includes('permission')) return;
            handleFirestoreError(err, OperationType.LIST, wordsPath);
          }
        );

        return () => unsubscribeWords();
      },
      (err) => {
        if (err.message.includes('permission')) return;
        handleFirestoreError(err, OperationType.LIST, progressPath);
      }
    );

    return () => unsubscribeProgress();
  }, [user]);

  const filteredWords = useMemo(() => {
    return words
      .filter(w => {
        const matchesSearch = w.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             w.bn_meaning.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPos = posFilter === 'all' || w.part_of_speech?.toLowerCase() === posFilter.toLowerCase();
        
        let matchesMastery = true;
        if (masteryFilter === 'mastered') matchesMastery = (w.progress?.srs_stage || 0) >= 4;
        else if (masteryFilter === 'learning') matchesMastery = (w.progress?.srs_stage || 0) > 0 && (w.progress?.srs_stage || 0) < 4;
        else if (masteryFilter === 'unseen') matchesMastery = !w.progress;

        return matchesSearch && matchesPos && matchesMastery;
      })
      .sort((a, b) => {
        if (sortBy === 'alphabetical') return a.word.localeCompare(b.word);
        if (sortBy === 'mastery') return (b.progress?.srs_stage || 0) - (a.progress?.srs_stage || 0);
        if (sortBy === 'review') {
          if (a.progress && b.progress) {
            return toDate(a.progress.next_review_due).getTime() - toDate(b.progress.next_review_due).getTime();
          }
          return a.progress ? -1 : 1;
        }
        return 0;
      });
  }, [words, searchTerm, posFilter, masteryFilter, sortBy]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
        <div className="w-20 h-20 bg-gold/10 rounded-3xl flex items-center justify-center mb-6 relative">
          <Database className="w-10 h-10 text-gold" />
          <div className="absolute -top-2 -right-2 bg-dark-bg p-1 rounded-lg border border-dark-border">
            <Lock className="w-4 h-4 text-gold" />
          </div>
        </div>
        
        <h3 className="text-2xl font-serif font-bold text-white mb-3">Personal Vault Locked</h3>
        <p className="text-text-dim text-sm leading-relaxed mb-10">
          Your linguistic growth deserves a secure architectural record. Sign in to synchronize your SRS progress and word mastery across all devices.
        </p>

        <button 
          onClick={handleLogin}
          className="w-full bg-gold text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 uppercase tracking-widest text-xs group"
        >
          Unlock your records
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
        
        <p className="mt-6 text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]">
          Secure Authentication via Google
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <div className="space-y-4 mb-8">
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const learnedCount = words.filter(w => w.progress).length;
  const masteredCount = words.filter(w => (w.progress?.srs_stage || 0) >= 4).length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Stats Header */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-dark-card border border-dark-border p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-gold" />
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest text-right">Learned</span>
          </div>
          <div className="text-3xl font-serif font-black text-white">{learnedCount}</div>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-gold" />
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest text-right">Mastered</span>
          </div>
          <div className="text-3xl font-serif font-black text-white">{masteredCount}</div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
            <input 
              type="text" 
              placeholder="Search words or meanings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-xl pl-12 pr-4 py-3 text-sm focus:border-gold outline-none transition-all placeholder:text-text-dim/50"
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "p-3 rounded-xl border border-dark-border transition-all",
              isFilterOpen ? "bg-gold text-black border-gold" : "bg-dark-card text-text-dim hover:text-white"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-dark-card border border-dark-border p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] block mb-3 text-gold/60">Category</span>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'verb', 'noun', 'adjective'].map(pos => (
                      <button 
                        key={pos}
                        onClick={() => setPosFilter(pos)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all tracking-widest",
                          posFilter === pos ? "bg-gold/20 text-gold border border-gold/30 shadow-lg shadow-gold/5" : "bg-dark-bg text-text-dim border border-dark-border hover:text-text-main"
                        )}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] block mb-3 text-gold/60">Proficiency</span>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'unseen', 'learning', 'mastered'].map(m => {
                      const isActive = masteryFilter === m;
                      let activeClass = "bg-gold/20 text-gold border-gold/30";
                      if (m === 'unseen') activeClass = "bg-dark-border text-text-dim border-dark-border";
                      if (m === 'mastered') activeClass = "bg-green-500/20 text-green-400 border-green-500/30";
                      if (m === 'learning') activeClass = "bg-gold/20 text-gold border-gold/30";

                      return (
                        <button 
                          key={m}
                          onClick={() => setMasteryFilter(m)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all tracking-widest border",
                            isActive ? activeClass : "bg-dark-bg text-text-dim border-dark-border hover:text-text-main"
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] block mb-3 text-gold/60">Sort Hierarchy</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'alphabetical', label: 'A-Z' },
                      { id: 'review', label: 'Due' },
                      { id: 'mastery', label: 'Rank' }
                    ].map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSortBy(s.id as any)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all tracking-widest",
                          sortBy === s.id ? "bg-gold/20 text-gold border border-gold/30 shadow-lg shadow-gold/5" : "bg-dark-bg text-text-dim border border-dark-border hover:text-text-main"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Word List */}
      <div className="space-y-3">
        {filteredWords.length === 0 ? (
          <div className="text-center py-12 px-6 bg-dark-card border border-dark-border rounded-3xl border-dashed">
            <Search className="w-8 h-8 text-slate-800 mx-auto mb-3" />
            <p className="text-text-dim text-sm italic">No lexical matches found in the current architectural query.</p>
          </div>
        ) : (
          filteredWords.map((word) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={word.id}
              className={cn(
                "bg-dark-card border border-dark-border rounded-2xl overflow-hidden transition-all",
                expandedId === word.id ? "border-gold/50 shadow-lg shadow-gold/5" : "hover:border-gold/30"
              )}
            >
              <button
                onClick={() => toggleExpand(word.id!)}
                className="w-full p-5 flex items-center justify-between text-left"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-serif font-bold text-white group-hover:text-gold transition-colors">
                      {word.word}
                    </h4>
                    <span className="text-[9px] text-text-dim bg-dark-bg px-2 py-0.5 rounded border border-dark-border font-bold uppercase tracking-widest">
                      {word.part_of_speech}
                    </span>
                  </div>
                  <p className="text-sm text-text-dim italic mt-1">{word.bn_meaning}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    {word.progress ? (
                      <>
                        <div className="flex gap-1 mb-1 justify-end">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const colors = getMasteryColor(word.progress?.srs_stage);
                            return (
                              <div
                                key={s}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  s <= word.progress!.srs_stage ? colors.dot : "bg-dark-border"
                                )}
                              />
                            );
                          })}
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 justify-end text-[9px] font-bold uppercase tracking-widest",
                          getMasteryColor(word.progress.srs_stage).text
                        )}>
                          <Clock className="w-2.5 h-2.5" />
                          {toDate(word.progress.next_review_due).toLocaleDateString()}
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-dark-border" />
                        Unseen
                      </span>
                    )}
                  </div>
                  {expandedId === word.id ? (
                    <ChevronUp className="w-5 h-5 text-gold" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-text-dim" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expandedId === word.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-dark-border bg-dark-bg/50 px-5 pb-5"
                  >
                    <div className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <span className="text-[8px] font-black text-text-dim uppercase tracking-[0.3em] block mb-1">Pronunciation</span>
                            <p className="text-sm font-serif text-white">{word.pronunciation || "N/A"}</p>
                         </div>
                         <div>
                            <span className="text-[8px] font-black text-text-dim uppercase tracking-[0.3em] block mb-1">Root</span>
                            <p className="text-sm font-serif text-white">{word.root_word || "N/A"}</p>
                         </div>
                      </div>

                      <div>
                        <span className="text-[8px] font-black text-text-dim uppercase tracking-[0.3em] block mb-2">Contextual Examples</span>
                        {loadingSentences === word.id ? (
                          <div className="space-y-2">
                            <Skeleton className="h-16 w-full rounded-xl" />
                            <Skeleton className="h-16 w-full rounded-xl" />
                          </div>
                        ) : sentences[word.id!]?.length > 0 ? (
                          <div className="space-y-3">
                            {sentences[word.id!]?.map((s) => (
                              <div key={s.id} className="p-3 bg-dark-card border border-dark-border rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                  <Quote className="w-3 h-3 text-gold opacity-50" />
                                  <span className="text-[8px] font-black text-gold uppercase tracking-widest">{s.flavor}</span>
                                </div>
                                <p className="text-xs text-text-main italic font-serif leading-relaxed">
                                  "{s.sentence}"
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-text-dim italic">No recorded context shards for this entity.</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

