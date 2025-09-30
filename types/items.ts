export interface IItem {
    id: string;
    createdAt: string;
}

export interface IRelatedItem {
    _score: number;
    _source: IItem
}

export interface IFindRelatedItemsRequest extends IItem {
    opensearchQuery: any;
}

export interface IFindRelatedItemsResponse {
    totalResults: number;
    maxScore: number;
    items: IRelatedItem[]
}