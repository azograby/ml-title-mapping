import { uploadData, downloadData, remove } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import { AuthService } from '../services/auth';

export class ConfigurationService {
  private client = generateClient<Schema>();

  async getIndexConfig(indexName: string): Promise<any> {
    try {
      const { data: indexConfig } = await this.client.models.IndexConfig.get({ indexName });
      
      if (!indexConfig?.searchConfig) {
        throw new Error('Search configuration not found for this index');
      }
      
      console.log(`Raw config for ${indexName}:`, indexConfig.searchConfig);
      return indexConfig.searchConfig;
    } catch (error) {
      console.error('Error loading index configuration:', error);
      throw error;
    }
  }

  async saveIndexConfig(indexName: string, config: any): Promise<void> {
    try {
      await this.client.models.IndexConfig.update({
        indexName,
        searchConfig: JSON.stringify(config)
      });
      
      console.log('Index configuration saved successfully');
    } catch (error) {
      console.error('Error saving index configuration:', error);
      throw error;
    }
  }

  async getFullIndexConfig(indexName: string): Promise<any> {
    try {
      const { data: indexConfig } = await this.client.models.IndexConfig.get({ indexName });
      return indexConfig;
    } catch (error) {
      console.error('Error loading full index configuration:', error);
      throw error;
    }
  }
}