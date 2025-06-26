import { processBulkQuizData, validateMathText, MATH_SYMBOL_MAPPINGS, previewMathSymbols } from './math-symbol-processor';

export interface ProcessingResult {
  success: boolean;
  data?: any[];
  errors: string[];
  warnings: string[];
  mathSymbolsProcessed: number;
  preview?: {
    original: string;
    processed: string;
    changes: string[];
  };
}

/**
 * Enhanced JSON processor with mathematical symbol support
 */
export async function processJsonUpload(jsonData: any): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    success: false,
    errors: [],
    warnings: [],
    mathSymbolsProcessed: 0
  };

  try {
    // Validate JSON structure
    if (!Array.isArray(jsonData)) {
      result.errors.push('JSON data must be an array of questions');
      return result;
    }

    if (jsonData.length === 0) {
      result.errors.push('JSON array is empty');
      return result;
    }

    // Process each question
    const processedData = [];
    let mathSymbolCount = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const question = jsonData[i];
      
      try {
        // Validate required fields
        if (!question.question || !question.options) {
          result.errors.push(`Question ${i + 1}: Missing required fields (question, options)`);
          continue;
        }

        // Count math symbols before processing
        const originalText = JSON.stringify(question);
        const mathSymbolsBefore = (originalText.match(/[\^√∛×÷±≠≤≥π]/g) || []).length;

        // Process mathematical symbols
        const processedQuestion = processBulkQuizData([question])[0];

        // Count math symbols after processing
        const processedText = JSON.stringify(processedQuestion);
        const mathSymbolsAfter = (processedText.match(/[²³⁴⁵⁶⁷⁸⁹⁰¹√∛×÷±≠≤≥π]/g) || []).length;

        if (mathSymbolsAfter > mathSymbolsBefore) {
          mathSymbolCount += (mathSymbolsAfter - mathSymbolsBefore);
        }

        // Validate math text in question
        const questionValidation = validateMathText(question.question);
        if (!questionValidation.isValid) {
          result.warnings.push(`Question ${i + 1}: ${questionValidation.warnings.join(', ')}`);
        }

        // Validate math text in options
        if (Array.isArray(question.options)) {
          question.options.forEach((option: any, optIndex: number) => {
            const optionText = typeof option === 'string' ? option : option?.text;
            if (optionText) {
              const optionValidation = validateMathText(optionText);
              if (!optionValidation.isValid) {
                result.warnings.push(`Question ${i + 1}, Option ${optIndex + 1}: ${optionValidation.warnings.join(', ')}`);
              }
            }
          });
        }

        processedData.push(processedQuestion);

      } catch (error) {
        result.errors.push(`Question ${i + 1}: Processing error - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    result.mathSymbolsProcessed = mathSymbolCount;
    result.data = processedData;
    result.success = result.errors.length === 0;

    // Add summary information
    if (mathSymbolCount > 0) {
      result.warnings.push(`Processed ${mathSymbolCount} mathematical symbols`);
    }

    // Add preview for first question with math symbols
    const firstMathQuestion = processedData.find(q => {
      const text = q.question + JSON.stringify(q.options);
      return text.match(/[²³⁴⁵⁶⁷⁸⁹⁰¹√∛×÷±≠≤≥π]/);
    });

    if (firstMathQuestion) {
      result.preview = previewMathSymbols(firstMathQuestion.question);
    }

    return result;

  } catch (error) {
    result.errors.push(`JSON processing failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Validate JSON format for quiz upload
 */
export function validateQuizJsonFormat(data: any): { isValid: boolean; errors: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('Data must be an array of questions');
    suggestions.push('Wrap your questions in square brackets: [{ question: "...", options: [...] }]');
    return { isValid: false, errors, suggestions };
  }

  data.forEach((item, index) => {
    const questionNum = index + 1;

    // Check required fields
    if (!item.question) {
      errors.push(`Question ${questionNum}: Missing 'question' field`);
    }

    if (!item.options) {
      errors.push(`Question ${questionNum}: Missing 'options' field`);
    } else if (!Array.isArray(item.options)) {
      errors.push(`Question ${questionNum}: 'options' must be an array`);
    } else if (item.options.length < 2) {
      errors.push(`Question ${questionNum}: Must have at least 2 options`);
    }

    if (item.correctAnswer === undefined && item.correctAnswerIndex === undefined) {
      errors.push(`Question ${questionNum}: Missing 'correctAnswer' or 'correctAnswerIndex' field`);
    }

    // Check for mathematical symbols that might need processing
    const questionText = item.question || '';
    const optionsText = JSON.stringify(item.options || []);
    
    if (questionText.includes('^') || optionsText.includes('^')) {
      suggestions.push(`Question ${questionNum}: Contains '^' symbol - will be converted to superscript (e.g., x^2 → x²)`);
    }

    if (questionText.includes('sqrt') || optionsText.includes('sqrt')) {
      suggestions.push(`Question ${questionNum}: Contains 'sqrt' - will be converted to √ symbol`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}
