-- LingoVault Database Schema (PostgreSQL/Supabase)
-- Optimized for high-performance daily queries and SRS logic

-- Word entities table
CREATE TABLE words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(100) NOT NULL UNIQUE,
    pronunciation VARCHAR(100),
    part_of_speech VARCHAR(50),
    bn_meaning TEXT NOT NULL,
    root_word VARCHAR(100),
    etymology TEXT,
    bcs_bank_tags TEXT[] DEFAULT '{}',
    definitions JSONB NOT NULL, -- { "local": "...", "global": "..." }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contextual sentences for different flavors
CREATE TYPE exam_flavor AS ENUM ('bank', 'science', 'academic');

CREATE TABLE context_sentences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    flavor exam_flavor NOT NULL,
    sentence TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress and Spaced Repetition System (SRS) tracking
CREATE TABLE user_progress (
    user_id UUID NOT NULL, -- Federated with Auth.users
    word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    srs_stage INT DEFAULT 0, -- 0 (Fresh) to 5 (Mastered)
    next_review_due TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accuracy_score FLOAT DEFAULT 0.0,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, word_id)
);

-- Indexes for performance
CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_context_word_id ON context_sentences(word_id);
CREATE INDEX idx_user_progress_next_due ON user_progress(next_review_due) WHERE srs_stage < 5;
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
