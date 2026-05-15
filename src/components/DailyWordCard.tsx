import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Globe, Languages, Lightbulb, ChevronRight, Tags } from 'lucide-react';
import { Word } from '../types';
import { cn } from '../lib/utils';

interface DailyWordCardProps {
  word: Word;
  onNext: () => void;
  onPrevious: () => void;
}

export const DailyWordCard: React.FC<DailyWordCardProps> = ({ word, onNext, onPrevious }) => {
  const [lens, setLens] = useState<'local' | 'global'>('local');

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/4] perspective-1000">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100) onNext();
          if (info.offset.x > 100) onPrevious();
        }}
        className="w-full h-full"
      >
        <div className="w-full h-full rounded-3xl bg-dark-card border border-dark-border shadow-2xl p-8 flex flex-col relative overflow-hidden backdrop-blur-xl">
          {/* Background Accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/3 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-text-dim mb-1 block">
                {word.part_of_speech}
              </span>
              <h2 className="text-5xl font-serif font-bold text-gold tracking-tight leading-none">
                {word.word}
              </h2>
              {word.pronunciation && (
                <p className="text-text-dim italic font-serif text-sm mt-1">{word.pronunciation}</p>
              )}
            </div>
            <div className="flex gap-2">
              {word.bcs_bank_tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="text-[8px] px-2 py-1 rounded bg-gold/10 text-gold border border-gold/20 uppercase font-black tracking-widest">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bengali Meaning */}
          <div className="bg-gold/10 rounded-2xl p-5 border-l-4 border-gold mb-6 group transition-all hover:bg-gold/15">
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-gold opacity-70" />
              <span className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]">Bengali Context</span>
            </div>
            <p className="text-2xl font-serif font-medium text-white leading-relaxed">
              {word.bn_meaning}
            </p>
          </div>

          {/* Lens Toggle */}
          <div className="flex p-1 bg-dark-bg rounded-xl mb-6 relative z-10 border border-dark-border">
            <button
              onClick={() => setLens('local')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black transition-all rounded-lg uppercase tracking-widest",
                lens === 'local' ? "bg-dark-border text-gold shadow-lg" : "text-text-dim hover:text-text-main"
              )}
            >
              Local Exam Lens
            </button>
            <button
              onClick={() => setLens('global')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black transition-all rounded-lg uppercase tracking-widest",
                lens === 'global' ? "bg-dark-border text-gold shadow-lg" : "text-text-dim hover:text-text-main"
              )}
            >
              Global Exam Lens
            </button>
          </div>

          {/* Lens Content */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={lens}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-gold/60" />
                    <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em]">Usage Application</span>
                  </div>
                  <p className="text-sm text-text-main leading-relaxed italic font-serif">
                    {lens === 'local' ? word.definitions.local : word.definitions.global}
                  </p>
                </div>

                {word.root_word && (
                  <div className="pt-4 border-t border-dark-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-gold/60" />
                      <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em]">Etymology</span>
                    </div>
                    <p className="text-xs text-text-dim font-serif">
                      <span className="font-bold text-gold">{word.root_word}:</span> {word.etymology || "Historical linguistic trajectory and usage evolution."}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation Hints */}
          <div className="mt-6 flex justify-between items-center text-[9px] font-bold text-text-dim uppercase tracking-[0.3em]">
            <span>Swipe for next</span>
            <ChevronRight className="w-3 h-3 text-gold" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
