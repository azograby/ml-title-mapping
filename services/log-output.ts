import { ILogMessage, ILogMessageQueryOptions } from '../types/log-output';
import { LogOutputQueries } from '../amplify/data/queries/log-output';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../amplify/data/resource';

const dataClient = generateClient<Schema>();

export class LogOutputService {
  static async getRecentLogMessages (options: ILogMessageQueryOptions): Promise<ILogMessage[]> {
    try {
      const request = {
        filter: {
          userId: { eq: options.userId },
        },
        limit: options.limit || 50,
      };

      const messages = await dataClient.graphql({
        query: LogOutputQueries.listLogOutputBySessionIdAndCreatedAt,
        variables: {
          filter: request.filter,
          limit: request.limit,
          userId: options.userId,
          sessionId: options.sessionId,
          sortDirection: 'ASC'
        }
      });

      //@ts-ignore
      if(!messages.data || !messages.data.listLogMessagesBySessionIdAndCreatedAt || !messages.data.listLogMessagesBySessionIdAndCreatedAt.items) {
        throw new Error(`Error getting recent log messages: ${messages}`);
      } else {
        //@ts-ignore
        return messages?.data?.listLogMessagesBySessionIdAndCreatedAt?.items as ILogMessage[];
      }
    } catch (error) {
      console.error('Error getting recent log messages:', error);
      throw error;
    }
  };
}