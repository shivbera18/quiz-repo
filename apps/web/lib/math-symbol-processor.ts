/**
 * Utility functions for processing mathematical symbols in quiz data
 */

export interface MathSymbolMapping {
  input: string | RegExp;
  output: string | ((match: string, ...args: any[]) => string);
  description: string;
}

function getSuperscript(num: string): string {
  const superscriptMap: { [key: string]: string } = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  return superscriptMap[num] || num;
}

// Common mathematical symbol mappings for JSON upload processing
export const MATH_SYMBOL_MAPPINGS: MathSymbolMapping[] = [
  // Powers/Exponents
  { input: /\^2/g, output: '²', description: 'Square' },
  { input: /\^3/g, output: '³', description: 'Cube' },
  { input: /\^(\d)/g, output: (match, num) => getSuperscript(num), description: 'General power' },
  
  // Roots
  { input: /sqrt\(/g, output: '√(', description: 'Square root' },
  { input: /cbrt\(/g, output: '∛(', description: 'Cube root' },
  
  // Fractions
  { input: /1\/2/g, output: '½', description: 'One half' },
  { input: /1\/3/g, output: '⅓', description: 'One third' },
  { input: /2\/3/g, output: '⅔', description: 'Two thirds' },
  { input: /1\/4/g, output: '¼', description: 'One quarter' },
  { input: /3\/4/g, output: '¾', description: 'Three quarters' },
  
  // Operators
  { input: /\*/g, output: '×', description: 'Multiplication' },
  { input: /\bdiv\b/g, output: '÷', description: 'Division' },
  { input: /\+\-/g, output: '±', description: 'Plus-minus' },
  { input: /!=/g, output: '≠', description: 'Not equal' },
  { input: /<=/g, output: '≤', description: 'Less than or equal' },
  { input: />=/g, output: '≥', description: 'Greater than or equal' },
  
  // Greek letters
  { input: /\balpha\b/g, output: 'α', description: 'Alpha' },
  { input: /\bbeta\b/g, output: 'β', description: 'Beta' },
  { input: /\bgamma\b/g, output: 'γ', description: 'Gamma' },
  { input: /\bdelta\b/g, output: 'δ', description: 'Delta' },
  { input: /\bpi\b/g, output: 'π', description: 'Pi' },
  { input: /\btheta\b/g, output: 'θ', description: 'Theta' },
  
  // Special symbols
  { input: /\binfinity\b/g, output: '∞', description: 'Infinity' },
  { input: /\bdegree\b/g, output: '°', description: 'Degree' },
];

/**
 * Process text to replace mathematical symbols
 */
export function processMathSymbols(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  let processed = text;
  
  for (const mapping of MATH_SYMBOL_MAPPINGS) {
    if (typeof mapping.output === 'function') {
      processed = processed.replace(mapping.input as RegExp, mapping.output as any);
    } else {
      processed = processed.replace(mapping.input as RegExp, mapping.output as string);
    }
  }
  
  return processed;
}

/**
 * Process quiz question object to handle mathematical symbols
 */
export function processQuizQuestion(question: any): any {
  if (!question) return question;
  
  const processed = { ...question };
  
  // Process question text
  if (processed.question) {
    processed.question = processMathSymbols(processed.question);
  }
  
  // Process options
  if (processed.options && Array.isArray(processed.options)) {
    processed.options = processed.options.map((option: any) => {
      if (typeof option === 'string') {
        return processMathSymbols(option);
      } else if (option && typeof option === 'object' && option.text) {
        return {
          ...option,
          text: processMathSymbols(option.text)
        };
      }
      return option;
    });
  }
  
  // Process explanation
  if (processed.explanation) {
    processed.explanation = processMathSymbols(processed.explanation);
  }
  
  // Process any other text fields
  if (processed.correctAnswer && typeof processed.correctAnswer === 'string') {
    processed.correctAnswer = processMathSymbols(processed.correctAnswer);
  }
  
  return processed;
}

/**
 * Process bulk uploaded quiz data
 */
export function processBulkQuizData(quizData: any[]): any[] {
  if (!Array.isArray(quizData)) return quizData;
  
  return quizData.map(processQuizQuestion);
}

/**
 * Validate and clean mathematical text input
 */
export function validateMathText(text: string): { isValid: boolean; cleaned: string; warnings: string[] } {
  const warnings: string[] = [];
  let cleaned = text;
  
  // Check for common issues
  if (text.includes('^') && !text.match(/\^\d/)) {
    warnings.push('Power notation (^) found but may not be properly formatted. Use ^2, ^3, etc.');
  }
  
  if (text.includes('sqrt') && !text.includes('sqrt(')) {
    warnings.push('Square root found but may be missing parentheses. Use sqrt(x) format.');
  }
  
  // Process the symbols
  cleaned = processMathSymbols(text);
  
  return {
    isValid: warnings.length === 0,
    cleaned,
    warnings
  };
}

/**
 * Preview mathematical symbol transformations
 */
export function previewMathSymbols(text: string): { original: string; processed: string; changes: string[] } {
  const changes: string[] = [];
  let processed = text;

  for (const mapping of MATH_SYMBOL_MAPPINGS) {
    const matches = text.match(mapping.input as RegExp);
    if (matches) {
      changes.push(`${mapping.description}: ${matches.length} replacement(s)`);
      if (typeof mapping.output === 'function') {
        processed = processed.replace(mapping.input as RegExp, mapping.output as any);
      } else {
        processed = processed.replace(mapping.input as RegExp, mapping.output as string);
      }
    }
  }

  return {
    original: text,
    processed,
    changes
  };
}
