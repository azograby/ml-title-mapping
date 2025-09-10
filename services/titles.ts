import { vars } from '../amplify/global-variables';
import { post } from 'aws-amplify/api';
import outputs from "../amplify_outputs.json";
import { CommonUtils } from '@/amplify/utils';
import { IFindRelatedTitlesRequest, IFindRelatedTitlesResponse } from '@/types/titles';

export class TitleService {    
    static async findRelatedTitles(request: IFindRelatedTitlesRequest): Promise<IFindRelatedTitlesResponse> {
    try {
      const {body} = await post({
        apiName: outputs.custom.apiName,
        path: vars.API_PATHS.FIND_RELATED_TITLES,
        options: {
          //@ts-ignore
          body: request
        }
      }).response;

      const response = await body.json();
      const result: IFindRelatedTitlesResponse = {
        //@ts-ignore
        titles: response._titles,
        //@ts-ignore
        totalResults: response._totalResults,
        //@ts-ignore
        maxScore: response._maxScore
      };

      console.log(response);
      return result;
    } catch (error) {
      // Make sure lambda functions return "error" object in case of failure
      //@ts-ignore
      const message = CommonUtils.tryGetErrorFromBackend(error);
      if(message) {
        console.error(message);
        throw new Error(message);
      } else {
        console.log(error);
        throw new Error('Response failed: ' + error);
      }
    }
  }
}