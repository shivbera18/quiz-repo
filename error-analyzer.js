// Comprehensive Error Analysis and Logging Utility
// This script helps analyze and categorize different types of errors during quiz creation

class ErrorAnalyzer {
  constructor() {
    this.errorCategories = {
      VALIDATION_ERROR: "Input validation failed",
      AUTH_ERROR: "Authentication/authorization failed", 
      DATABASE_ERROR: "Database operation failed",
      AI_ERROR: "AI service error",
      NETWORK_ERROR: "Network/connection error",
      FORMAT_ERROR: "Data format error",
      RESOURCE_ERROR: "Resource not found error",
      BUSINESS_LOGIC_ERROR: "Business rule violation"
    }
    
    this.errorLog = []
  }

  analyzeError(error, context = '') {
    const analysis = {
      timestamp: new Date().toISOString(),
      context: context,
      errorType: this.categorizeError(error),
      message: error.message || error.error || 'Unknown error',
      statusCode: error.status || 500,
      field: error.field || null,
      details: error.details || null,
      actionable: this.isActionable(error),
      userFriendly: this.getUserFriendlyMessage(error),
      technicalDetails: error
    }
    
    this.errorLog.push(analysis)
    return analysis
  }

  categorizeError(error) {
    const message = (error.message || error.error || '').toLowerCase()
    const errorType = error.errorType || ''
    
    // Authentication/Authorization errors
    if (errorType.includes('AUTH') || message.includes('unauthorized') || message.includes('authentication')) {
      return 'AUTH_ERROR'
    }
    
    // Validation errors
    if (errorType.includes('VALIDATION') || message.includes('required') || message.includes('invalid')) {
      return 'VALIDATION_ERROR'
    }
    
    // Database errors
    if (errorType.includes('DATABASE') || errorType.includes('FOREIGN_KEY') || 
        message.includes('database') || message.includes('prisma') || message.includes('constraint')) {
      return 'DATABASE_ERROR'
    }
    
    // AI service errors
    if (errorType.includes('AI_') || message.includes('ai') || message.includes('gemini') || 
        message.includes('quota') || message.includes('api key')) {
      return 'AI_ERROR'
    }
    
    // Network errors
    if (errorType.includes('NETWORK') || errorType.includes('CONNECTION') || 
        message.includes('network') || message.includes('connect') || message.includes('timeout')) {
      return 'NETWORK_ERROR'
    }
    
    // Format errors
    if (errorType.includes('FORMAT') || errorType.includes('JSON') || 
        message.includes('json') || message.includes('parse')) {
      return 'FORMAT_ERROR'
    }
    
    // Resource not found
    if (errorType.includes('NOT_FOUND') || message.includes('not found') || error.status === 404) {
      return 'RESOURCE_ERROR'
    }
    
    return 'UNKNOWN_ERROR'
  }

  isActionable(error) {
    const category = this.categorizeError(error)
    
    // These errors can typically be fixed by the user
    const actionableCategories = [
      'VALIDATION_ERROR',
      'AUTH_ERROR', 
      'RESOURCE_ERROR'
    ]
    
    return actionableCategories.includes(category)
  }

  getUserFriendlyMessage(error) {
    const category = this.categorizeError(error)
    const field = error.field || 'field'
    
    switch (category) {
      case 'VALIDATION_ERROR':
        if (error.field) {
          return `Please check the ${field} field: ${error.message || 'Invalid value provided'}`
        }
        return `Please check your input: ${error.message || 'Some required information is missing or invalid'}`
        
      case 'AUTH_ERROR':
        return 'Please log in again. Your session may have expired.'
        
      case 'DATABASE_ERROR':
        if (error.message && error.message.includes('already exists')) {
          return 'A quiz with this information already exists. Please use a different title or modify your input.'
        }
        if (error.message && error.message.includes('chapter')) {
          return 'The selected chapter is not valid. Please select a different chapter.'
        }
        return 'There was an issue saving your quiz. Please try again.'
        
      case 'AI_ERROR':
        if (error.message && error.message.includes('quota')) {
          return 'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.'
        }
        if (error.message && error.message.includes('key')) {
          return 'AI service is not properly configured. Please contact support.'
        }
        return 'Unable to generate AI quiz at the moment. Please try creating a manual quiz instead.'
        
      case 'NETWORK_ERROR':
        return 'Network connection issue. Please check your internet connection and try again.'
        
      case 'FORMAT_ERROR':
        return 'Invalid data format. Please refresh the page and try again.'
        
      case 'RESOURCE_ERROR':
        return 'The selected item was not found. Please refresh and select again.'
        
      default:
        return 'Something went wrong. Please try again or contact support if the problem persists.'
    }
  }

  generateErrorReport() {
    const report = {
      totalErrors: this.errorLog.length,
      errorsByCategory: {},
      actionableErrors: 0,
      criticalErrors: 0,
      recentErrors: [],
      recommendations: []
    }

    // Categorize errors
    this.errorLog.forEach(error => {
      const category = error.errorType
      report.errorsByCategory[category] = (report.errorsByCategory[category] || 0) + 1
      
      if (error.actionable) report.actionableErrors++
      if (error.statusCode >= 500) report.criticalErrors++
    })

    // Get recent errors (last 10)
    report.recentErrors = this.errorLog.slice(-10)

    // Generate recommendations
    if (report.errorsByCategory.VALIDATION_ERROR > 0) {
      report.recommendations.push("Consider adding client-side validation to prevent validation errors")
    }
    
    if (report.errorsByCategory.DATABASE_ERROR > 0) {
      report.recommendations.push("Review database constraints and foreign key relationships")
    }
    
    if (report.errorsByCategory.AI_ERROR > 0) {
      report.recommendations.push("Monitor AI service quotas and implement retry logic")
    }
    
    if (report.criticalErrors > 0) {
      report.recommendations.push("Investigate critical server errors that may affect user experience")
    }

    return report
  }

  clearLog() {
    this.errorLog = []
  }
}

// Create global instance
const errorAnalyzer = new ErrorAnalyzer()

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorAnalyzer, errorAnalyzer }
}

// Test the error analyzer with sample errors
function testErrorAnalyzer() {
  console.log('🧪 Testing Error Analyzer...\n')
  
  const testErrors = [
    {
      message: "Quiz title is required",
      errorType: "VALIDATION_ERROR",
      field: "title",
      status: 400
    },
    {
      message: "Invalid chapter ID provided", 
      errorType: "FOREIGN_KEY_ERROR",
      status: 400
    },
    {
      error: "API key not configured",
      errorType: "AI_AUTH_ERROR", 
      status: 401
    },
    {
      message: "Network connection failed",
      errorType: "NETWORK_ERROR",
      status: 503
    },
    {
      error: "Quiz with this title already exists",
      errorType: "DUPLICATE_ERROR",
      status: 400
    }
  ]
  
  testErrors.forEach((error, index) => {
    console.log(`📝 Test ${index + 1}: ${error.message || error.error}`)
    const analysis = errorAnalyzer.analyzeError(error, `Test case ${index + 1}`)
    console.log(`   Category: ${analysis.errorType}`)
    console.log(`   Actionable: ${analysis.actionable}`)
    console.log(`   User Message: "${analysis.userFriendly}"`)
    console.log()
  })
  
  const report = errorAnalyzer.generateErrorReport()
  console.log('📊 Error Analysis Report:')
  console.log(JSON.stringify(report, null, 2))
}

// Run test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testErrorAnalyzer()
}
