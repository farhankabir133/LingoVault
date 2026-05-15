import { Word, ContextSentence } from './types';

export const SAMPLE_WORDS: Word[] = [
  {
    id: '1',
    word: 'Mitigate',
    pronunciation: '/ˈmɪtɪɡeɪt/',
    part_of_speech: 'verb',
    bn_meaning: 'প্রশমন করা / তীব্রতা কমানো',
    root_word: 'mitis (mild)',
    etymology: 'Latin myth- "to soften"',
    bcs_bank_tags: ['43rd BCS', 'Bank Math 2022'],
    definitions: {
      local: 'বন্যার প্রকোপ বা ঋণের ঝুঁকি কমানোর ক্ষেত্রে সরকারি নথিপত্রে বহুল ব্যবহৃত।',
      global: 'Essential for IELTS Writing Task 2 when discussing environmental or social solutions.'
    }
  },
  {
    id: '2',
    word: 'Pragmatic',
    pronunciation: '/praɡˈmatɪk/',
    part_of_speech: 'adjective',
    bn_meaning: 'ব্যাবহারিক / বাস্তবসম্মত',
    root_word: 'pragma (deed)',
    etymology: 'Greek pragma "action"',
    bcs_bank_tags: ['Bank PO 2021', 'Literary Terms'],
    definitions: {
      local: 'অফিসিয়াল পলিসি বা ডিশিশন মেকিং কনটেক্সটে প্রায়ই আসে।',
      global: 'Common in GRE Verbal for describing logical characters or philosophical approaches.'
    }
  }
];

export const SAMPLE_SENTENCES: Record<string, ContextSentence[]> = {
  '1': [
    {
      id: 's1',
      wordId: '1',
      flavor: 'bank',
      sentence: 'The central bank introduced new policies to mitigate the risks of inflation.',
      explanation: 'In banking, "mitigate" is the standard term for risk reduction.'
    },
    {
      id: 's2',
      wordId: '1',
      flavor: 'academic',
      sentence: 'International cooperation is vital to mitigate the effects of global warming.',
      explanation: 'Academic essays use "mitigate" to show sophisticated problem-solving vocabulary.'
    }
  ],
  '2': [
    {
      id: 's3',
      wordId: '2',
      flavor: 'bank',
      sentence: 'The manager took a pragmatic approach to solve the budget deficit.',
      explanation: 'Focusing on practical results rather than theories.'
    }
  ]
};
