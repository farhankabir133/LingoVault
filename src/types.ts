export type ExamFlavor = 'bank' | 'science' | 'academic';

export interface Word {
  id: string;
  word: string;
  pronunciation?: string;
  part_of_speech?: string;
  bn_meaning: string;
  root_word?: string;
  etymology?: string;
  bcs_bank_tags: string[];
  definitions: {
    local: string;
    global: string;
  };
}

export interface ContextSentence {
  id: string;
  wordId: string;
  flavor: ExamFlavor;
  sentence: string;
  explanation?: string;
}

export interface UserProgress {
  wordId: string;
  srs_stage: number;
  next_review_due: Date;
  accuracy_score: number;
  last_reviewed?: Date;
}
