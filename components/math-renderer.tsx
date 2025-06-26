import React from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = "" }) => {
  // Convert common mathematical symbols to proper display
  const renderMathText = (input: string): string => {
    let rendered = input;
    
    // Power notation: x^2 -> x²
    rendered = rendered.replace(/\^2/g, '²');
    rendered = rendered.replace(/\^3/g, '³');
    rendered = rendered.replace(/\^4/g, '⁴');
    rendered = rendered.replace(/\^5/g, '⁵');
    rendered = rendered.replace(/\^6/g, '⁶');
    rendered = rendered.replace(/\^7/g, '⁷');
    rendered = rendered.replace(/\^8/g, '⁸');
    rendered = rendered.replace(/\^9/g, '⁹');
    rendered = rendered.replace(/\^0/g, '⁰');
    rendered = rendered.replace(/\^1/g, '¹');
    
    // General power notation: x^n -> xⁿ (for other numbers)
    rendered = rendered.replace(/\^(\d+)/g, (match, num) => {
      const superscriptMap: { [key: string]: string } = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
      };
      return num.split('').map((digit: string) => superscriptMap[digit] || digit).join('');
    });
    
    // Square root: sqrt() or √
    rendered = rendered.replace(/sqrt\(([^)]+)\)/g, '√($1)');
    rendered = rendered.replace(/√\(([^)]+)\)/g, '√$1');
    
    // Cube root
    rendered = rendered.replace(/cbrt\(([^)]+)\)/g, '∛($1)');
    rendered = rendered.replace(/∛\(([^)]+)\)/g, '∛$1');
    
    // Fractions: 1/2 -> ½
    rendered = rendered.replace(/1\/2/g, '½');
    rendered = rendered.replace(/1\/3/g, '⅓');
    rendered = rendered.replace(/2\/3/g, '⅔');
    rendered = rendered.replace(/1\/4/g, '¼');
    rendered = rendered.replace(/3\/4/g, '¾');
    rendered = rendered.replace(/1\/5/g, '⅕');
    rendered = rendered.replace(/2\/5/g, '⅖');
    rendered = rendered.replace(/3\/5/g, '⅗');
    rendered = rendered.replace(/4\/5/g, '⅘');
    rendered = rendered.replace(/1\/6/g, '⅙');
    rendered = rendered.replace(/5\/6/g, '⅚');
    rendered = rendered.replace(/1\/8/g, '⅛');
    rendered = rendered.replace(/3\/8/g, '⅜');
    rendered = rendered.replace(/5\/8/g, '⅝');
    rendered = rendered.replace(/7\/8/g, '⅞');
    
    // Mathematical operators
    rendered = rendered.replace(/\+\-/g, '±');
    rendered = rendered.replace(/\-\+/g, '∓');
    rendered = rendered.replace(/\*/g, '×');
    rendered = rendered.replace(/\bdiv\b/g, '÷');
    rendered = rendered.replace(/!=/g, '≠');
    rendered = rendered.replace(/<=/g, '≤');
    rendered = rendered.replace(/>=/g, '≥');
    
    // Greek letters (common in math)
    rendered = rendered.replace(/\balpha\b/g, 'α');
    rendered = rendered.replace(/\bbeta\b/g, 'β');
    rendered = rendered.replace(/\bgamma\b/g, 'γ');
    rendered = rendered.replace(/\bdelta\b/g, 'δ');
    rendered = rendered.replace(/\bepsilon\b/g, 'ε');
    rendered = rendered.replace(/\btheta\b/g, 'θ');
    rendered = rendered.replace(/\bpi\b/g, 'π');
    rendered = rendered.replace(/\bsigma\b/g, 'σ');
    rendered = rendered.replace(/\bomega\b/g, 'ω');
    
    // Infinity
    rendered = rendered.replace(/\binfinity\b/g, '∞');
    rendered = rendered.replace(/\binf\b/g, '∞');
    
    // Degree symbol
    rendered = rendered.replace(/\bdegree\b/g, '°');
    
    return rendered;
  };

  return (
    <span 
      className={`math-text ${className}`}
      style={{ 
        fontFamily: 'Cambria, "Times New Roman", serif',
        fontSize: '1.1em',
        lineHeight: '1.4'
      }}
      dangerouslySetInnerHTML={{ __html: renderMathText(text) }}
    />
  );
};

export default MathRenderer;
