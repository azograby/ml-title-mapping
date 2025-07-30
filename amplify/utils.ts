import { v4 as uuidv4 } from 'uuid';

interface VectorConfig {
  minScore: number;
  weight: number;
}

interface BoostConfig {
  boost: number;
  weight: number;
}

export class CommonUtils {
    static generateUUID() {
        return uuidv4();
    }
    
    static tryGetErrorFromBackend(error: any): string | undefined {
        try {
            const errorObj = JSON.parse(error._response.body);
            return `${errorObj.error}${errorObj.errorDetails ? ': ' + errorObj.errorDetails.substring(0, 100) : ''}`;
        } catch (e) {
            return undefined;
        }
    }

    static getUniqueResourceNameForEnv(name: string): string {
        return `${name}-${process.env.AWS_BRANCH}`;
    }
    
    static generateOpenSearchQuery(
        vectorFields: string[],
        boostFields: string[],
        vectorConfigs: { [key: string]: VectorConfig },
        boostConfigs: { [key: string]: BoostConfig },
        maxResults: number
    ) {
        const mustQueries = vectorFields.map(field => ({
            function_score: {
                query: {
                    knn: {
                        [`${field}-embedding`]: {
                            vector: `${field}_embedding`,
                            min_score: vectorConfigs[field].minScore.toString()
                        }
                    }
                },
                weight: vectorConfigs[field].weight
            }
        }));
        
        const shouldQueries = boostFields.map(field => ({
            function_score: {
                query: {
                    match: { [field]: field }
                },
                boost: boostConfigs[field].boost,
                weight: boostConfigs[field].weight
            }
        }));
        
        return {
            size: maxResults,
            query: {
                bool: {
                    must: mustQueries,
                    should: shouldQueries
                }
            }
        };
    }
}