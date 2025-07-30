import { generateClient } from "aws-amplify/data";
import { type Schema } from "../resource";
import { ITitle } from "../../../types/titles";

const client = generateClient<Schema>();

export const listTitles = async (limit: number): Promise<ITitle[]> => {
  try {
    const result = await client.models.FilmTitlesProcessingQueue.list({
      limit: limit
    });

    if(result.errors) {
      throw result.errors[0];
    } 

    return <ITitle[]>result.data;
  } catch (error) {
    console.error('Error listing titles:', error);
    throw error;
  }
};
