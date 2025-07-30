import { uploadData } from 'aws-amplify/storage';
import { vars } from '../amplify/global-variables';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../services/auth';

export interface UploadResult {
    file: File;
    status: 'success' | 'failed';
    response?: any;
    error?: any;
    key?: string;
}

export class AssetsService {    
    /**
     * Upload files directly to S3 instead of going through API
     * This is more efficient for large files
     */
    async uploadFiles(files: File[]): Promise<UploadResult[]> {
        // Map each file to a promise that resolves with an UploadResult
        const uploadPromises = files.map(async (file): Promise<UploadResult> => {
            try {
                // Generate a unique key for the file
                const fileExtension = file.name.split('.').pop();
                const key = `assets/${await this.getUploadPath()}/${uuidv4()}.${fileExtension}`;
                
                const uploadResult = await uploadData({
                    path: ({identityId}) => `assets/${identityId}/${uuidv4()}.${fileExtension}`,
                    data: file,
                    options: {
                        contentType: file.type ? file.type : fileExtension,
                    }
                }).result;
                
                console.log(`S3 upload succeeded for ${file.name}:`, uploadResult);
                
                return {
                    file,
                    status: 'success',
                    response: uploadResult,
                    key
                };
            } catch (error) {
                console.log(`Upload failed for ${file.name}:`, error);
                return {
                    file,
                    status: 'failed',
                    error
                };
            }
        });
    
        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises);
    
        // Log summary of uploads
        const successful = results.filter(r => r.status === 'success');
        const failed = results.filter(r => r.status === 'failed');
    
        console.log(`Upload Summary:
            Total: ${results.length}
            Successful: ${successful.length}
            Failed: ${failed.length}
        `);
    
        if (failed.length > 0) {
            console.error('Failed uploads:', failed.map(f => f.file.name));
            // We don't throw here to allow partial success
            // TODO: handle errors and failures and test
        }
    
        return results;
    }
    
    /**
     * Get the upload path for the current user
     */
    private async getUploadPath(): Promise<string> {
        try {
            const { userId } = await AuthService.getCurrentUser();
            return userId;
        } catch (error) {
            console.error('Error getting upload path:', error);
            return 'anonymous';
        }
    }
}