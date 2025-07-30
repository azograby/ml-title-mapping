export interface ILogMessage extends ILogMessageRequest {
  createdAt: string;
  ttl: number;
  type?: 'info' | 'error' | 'warning';
}

export interface ILogMessageRequest {
  sessionId: string;
  userId: string;
  message: string;
}

export interface ILogMessageQueryOptions {
  userId: string;
  sessionId: string;
  limit?: number;
}