import { v4 as uuidv4 } from 'uuid';

interface VectorConfig {
  minScore: number;
  weight: number;
}

interface ExactConfig {
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
        exactFields: string[],
        vectorConfigs: { [key: string]: VectorConfig },
        exactConfigs: { [key: string]: ExactConfig },
        maxResults: number,
        minimumShouldMatch: string = "0",
        explain: boolean = false
    ) {
        const mustQueries = vectorFields.map(field => ({
            function_score: {
                query: {
                    knn: {
                        [`${field}Embedding`]: {
                            vector: `${field}Embedding`,
                            min_score: vectorConfigs[field].minScore.toString()
                        }
                    }
                },
                weight: vectorConfigs[field].weight
            }
        }));
        
        const shouldQueries = exactFields.map(field => ({
            function_score: {
                query: {
                    term: { [field]: field }
                },
                weight: exactConfigs[field].weight
            }
        }));
        
        return {
            size: maxResults,
            explain: explain,
            query: {
                bool: {
                    minimum_should_match: minimumShouldMatch,
                    must: mustQueries,
                    should: shouldQueries
                }
            }
        };
    }
}