import { uploadData, downloadData, remove } from 'aws-amplify/storage';
import { AuthService } from '../services/auth';

export class ConfigurationService {
  async saveSearchConfig(config): Promise<void> {
    try {
      const configJson = JSON.stringify(config, null, 2);
      const blob = new Blob([configJson], { type: 'application/json' });
      
      await uploadData({
        path: ({ identityId }) => `config/${identityId}/search-config.json`,
        data: blob,
        options: {
          contentType: 'application/json',
        }
      }).result;
      
      console.log('Search configuration saved successfully');
    } catch (error) {
      console.error('Error saving search configuration:', error);
      throw error;
    }
  }
  
  async getDefaultSearchConfig(): Promise<any> {
    try {
      const response = await fetch('/default-search-config.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading default search configuration:', error);
      throw error;
    }
  }
  
  async getCustomSearchConfig(): Promise<any> {
    try {
      const result = await downloadData({
        path: ({ identityId }) => `config/${identityId}/search-config.json`
      }).result;
      
      const configText = await result.body.text();
      return JSON.parse(configText);
    } catch (error) {
      console.error('Error loading custom search configuration:', error);
      throw error;
    }
  }
  
  async deleteCustomSearchConfig(): Promise<void> {
    try {
      await remove({
        path: ({ identityId }) => `config/${identityId}/search-config.json`
      });
      
      console.log('Custom search configuration deleted successfully');
    } catch (error) {
      console.error('Error deleting custom search configuration:', error);
      throw error;
    }
  }
}