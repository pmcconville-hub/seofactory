// utils/__tests__/sentenceTokenizer.test.ts
import { describe, it, expect } from 'vitest';
import { splitSentences } from '../sentenceTokenizer';

describe('splitSentences', () => {
  describe('basic sentence splitting', () => {
    it('should split simple sentences ending with periods', () => {
      const result = splitSentences('Hello. World.');
      expect(result).toEqual(['Hello.', 'World.']);
    });

    it('should split sentences with question marks', () => {
      const result = splitSentences('How are you? I am fine.');
      expect(result).toEqual(['How are you?', 'I am fine.']);
    });

    it('should split sentences with exclamation points', () => {
      const result = splitSentences('Wow! That is amazing.');
      expect(result).toEqual(['Wow!', 'That is amazing.']);
    });

    it('should handle mixed punctuation', () => {
      const result = splitSentences('Hello! How are you? I am fine.');
      expect(result).toEqual(['Hello!', 'How are you?', 'I am fine.']);
    });
  });

  describe('abbreviation handling', () => {
    it('should not split on Dr. abbreviation', () => {
      const result = splitSentences('Dr. Smith is here. He is nice.');
      expect(result).toEqual(['Dr. Smith is here.', 'He is nice.']);
    });

    it('should not split on Mr. abbreviation', () => {
      const result = splitSentences('Mr. Jones arrived. He was late.');
      expect(result).toEqual(['Mr. Jones arrived.', 'He was late.']);
    });

    it('should not split on Mrs. abbreviation', () => {
      const result = splitSentences('Mrs. Brown is cooking. The food smells great.');
      expect(result).toEqual(['Mrs. Brown is cooking.', 'The food smells great.']);
    });

    it('should not split on Ms. abbreviation', () => {
      const result = splitSentences('Ms. Davis is here. She brought gifts.');
      expect(result).toEqual(['Ms. Davis is here.', 'She brought gifts.']);
    });

    it('should not split on Prof. abbreviation', () => {
      const result = splitSentences('Prof. Wilson teaches math. He is excellent.');
      expect(result).toEqual(['Prof. Wilson teaches math.', 'He is excellent.']);
    });

    it('should handle multiple abbreviations in one sentence', () => {
      const result = splitSentences('Mr. and Mrs. Jones visited. They left.');
      expect(result).toEqual(['Mr. and Mrs. Jones visited.', 'They left.']);
    });

    it('should not split on Inc. abbreviation', () => {
      const result = splitSentences('Apple Inc. is a company. It makes phones.');
      expect(result).toEqual(['Apple Inc. is a company.', 'It makes phones.']);
    });

    it('should not split on Ltd. abbreviation', () => {
      const result = splitSentences('Acme Ltd. produces goods. They are quality.');
      expect(result).toEqual(['Acme Ltd. produces goods.', 'They are quality.']);
    });

    it('should not split on Corp. abbreviation', () => {
      const result = splitSentences('Tech Corp. announced profits. Stocks rose.');
      expect(result).toEqual(['Tech Corp. announced profits.', 'Stocks rose.']);
    });

    it('should not split on Jr. abbreviation', () => {
      const result = splitSentences('John Smith Jr. is here. He is young.');
      expect(result).toEqual(['John Smith Jr. is here.', 'He is young.']);
    });

    it('should not split on Sr. abbreviation', () => {
      const result = splitSentences('Robert Brown Sr. retired. He enjoys golf.');
      expect(result).toEqual(['Robert Brown Sr. retired.', 'He enjoys golf.']);
    });

    it('should not split on vs. abbreviation', () => {
      const result = splitSentences('It is quality vs. quantity. Choose wisely.');
      expect(result).toEqual(['It is quality vs. quantity.', 'Choose wisely.']);
    });

    it('should not split on e.g. abbreviation', () => {
      const result = splitSentences('Use fruits e.g. apples. They are healthy.');
      expect(result).toEqual(['Use fruits e.g. apples.', 'They are healthy.']);
    });

    it('should not split on i.e. abbreviation', () => {
      const result = splitSentences('The CEO i.e. the boss spoke. Everyone listened.');
      expect(result).toEqual(['The CEO i.e. the boss spoke.', 'Everyone listened.']);
    });

    it('should not split on etc. abbreviation', () => {
      const result = splitSentences('Bring food, drinks, etc. We need supplies.');
      expect(result).toEqual(['Bring food, drinks, etc.', 'We need supplies.']);
    });

    it('should not split on U.S. abbreviation', () => {
      const result = splitSentences('The U.S. economy grew. Markets celebrated.');
      expect(result).toEqual(['The U.S. economy grew.', 'Markets celebrated.']);
    });

    it('should not split on U.K. abbreviation', () => {
      const result = splitSentences('The U.K. voted today. Results are pending.');
      expect(result).toEqual(['The U.K. voted today.', 'Results are pending.']);
    });

    it('should not split on Ph.D. abbreviation', () => {
      const result = splitSentences('She has a Ph.D. in physics. She is brilliant.');
      expect(result).toEqual(['She has a Ph.D. in physics.', 'She is brilliant.']);
    });

    it('should not split on M.D. abbreviation', () => {
      const result = splitSentences('John Doe M.D. is a doctor. He saves lives.');
      expect(result).toEqual(['John Doe M.D. is a doctor.', 'He saves lives.']);
    });
  });

  describe('decimal number handling', () => {
    it('should not split on decimal numbers', () => {
      const result = splitSentences('The value is 3.14. That is pi.');
      expect(result).toEqual(['The value is 3.14.', 'That is pi.']);
    });

    it('should handle multiple decimal numbers', () => {
      const result = splitSentences('Pi is 3.14 and e is 2.72. Both are important.');
      expect(result).toEqual(['Pi is 3.14 and e is 2.72.', 'Both are important.']);
    });

    it('should handle prices with decimals', () => {
      const result = splitSentences('The price is $19.99. That is affordable.');
      expect(result).toEqual(['The price is $19.99.', 'That is affordable.']);
    });
  });

  describe('initials handling', () => {
    it('should not split on initials', () => {
      const result = splitSentences('J.K. Rowling wrote Harry Potter. The books are popular.');
      expect(result).toEqual(['J.K. Rowling wrote Harry Potter.', 'The books are popular.']);
    });

    it('should handle multiple initials', () => {
      const result = splitSentences('J.R.R. Tolkien is famous. He created Middle-earth.');
      expect(result).toEqual(['J.R.R. Tolkien is famous.', 'He created Middle-earth.']);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty string', () => {
      const result = splitSentences('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace only', () => {
      const result = splitSentences('   ');
      expect(result).toEqual([]);
    });

    it('should handle single sentence without terminal punctuation', () => {
      const result = splitSentences('Hello world');
      expect(result).toEqual(['Hello world']);
    });

    it('should handle single sentence with terminal punctuation', () => {
      const result = splitSentences('Hello world.');
      expect(result).toEqual(['Hello world.']);
    });

    it('should handle abbreviation at end of sentence', () => {
      const result = splitSentences('He works for Apple Inc. The company is great.');
      expect(result).toEqual(['He works for Apple Inc.', 'The company is great.']);
    });

    it('should handle sentence ending with abbreviation as last content', () => {
      const result = splitSentences('He has a Ph.D.');
      expect(result).toEqual(['He has a Ph.D.']);
    });

    it('should handle multiple spaces between sentences', () => {
      const result = splitSentences('Hello.  World.');
      expect(result).toEqual(['Hello.', 'World.']);
    });

    it('should handle newlines between sentences', () => {
      const result = splitSentences('Hello.\nWorld.');
      expect(result).toEqual(['Hello.', 'World.']);
    });

    it('should trim whitespace from individual sentences', () => {
      const result = splitSentences('  Hello.   World.  ');
      expect(result).toEqual(['Hello.', 'World.']);
    });

    it('should handle sentence with lowercase after period (likely abbreviation continuation)', () => {
      const result = splitSentences('The U.S. is large. It has states.');
      expect(result).toEqual(['The U.S. is large.', 'It has states.']);
    });

    it('should handle ellipsis', () => {
      const result = splitSentences('Wait... I see it. There it is.');
      expect(result).toEqual(['Wait...', 'I see it.', 'There it is.']);
    });
  });

  describe('complex sentences', () => {
    it('should handle a complex paragraph', () => {
      const input = 'Dr. Smith and Mrs. Jones work at Apple Inc. They develop software. The company earned $3.14 billion. That is impressive!';
      const result = splitSentences(input);
      expect(result).toEqual([
        'Dr. Smith and Mrs. Jones work at Apple Inc.',
        'They develop software.',
        'The company earned $3.14 billion.',
        'That is impressive!'
      ]);
    });

    it('should handle academic text with citations style', () => {
      const input = 'According to Smith et al. the results are significant. Johnson Ph.D. confirmed this. The p-value was 0.05.';
      const result = splitSentences(input);
      expect(result).toEqual([
        'According to Smith et al. the results are significant.',
        'Johnson Ph.D. confirmed this.',
        'The p-value was 0.05.'
      ]);
    });
  });
});
