import { uploadData } from 'aws-amplify/storage';
import { vars } from '../amplify/global-variables';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './auth';
import { post, get } from 'aws-amplify/api';
import outputs from '../amplify_outputs.json';

export class IndexService {
    async createIndex(indexData: any, identityId: string): Promise<void> {
        try {
            const response = await post({
                apiName: outputs.custom.apiName,
                path: vars.API_PATHS.CREATE_INDEX,
                options: {
                    body: {
                        fieldConfiguration: indexData.fieldConfiguration,
                        fileName: indexData.fileName,
                        userId: identityId
                    }
                }
            }).response;
            
            const result = await response.body.json();
            console.log('Index creation response:', result);
            
        } catch (error) {
            console.error('Error creating index:', error);
            throw error;
        }
    }

    async getAllIndexes(identityId: string): Promise<string[]> {
        try {
            const response = await post({
                apiName: outputs.custom.apiName,
                path: vars.API_PATHS.GET_ALL_INDEXES,
                options: {
                    body: {
                        userId: identityId
                    }
                }
            }).response;
            
            const result = await response.body.json() as { indexes?: string[] };
            return result.indexes || [];
            
        } catch (error) {
            console.error('Error getting indexes:', error);
            throw error;
        }
    }
}