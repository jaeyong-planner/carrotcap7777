export enum ErrorType {
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  DOCUMENT_PROCESSING_FAILED = 'DOCUMENT_PROCESSING_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  logError(error: Error, type: ErrorType = ErrorType.UNKNOWN_ERROR, details?: any): ErrorInfo {
    const errorInfo: ErrorInfo = {
      type,
      message: error.message,
      details,
      timestamp: new Date(),
      retryable: this.isRetryableError(type),
    };

    this.errorLog.push(errorInfo);
    
    // 로그 크기 제한
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // 콘솔에 에러 로깅
    if (import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true') {
      console.error(`[${type}] ${error.message}`, details);
    }

    return errorInfo;
  }

  private isRetryableError(type: ErrorType): boolean {
    return type === ErrorType.NETWORK_ERROR || type === ErrorType.API_REQUEST_FAILED;
  }

  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errorLog.slice(-limit);
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getErrorCount(): number {
    return this.errorLog.length;
  }

  hasErrors(): boolean {
    return this.errorLog.length > 0;
  }
}

export const errorHandler = ErrorHandler.getInstance();
