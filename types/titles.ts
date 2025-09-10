export interface ITitle {
    mamUUID: string;
    contentType: string;
    status: string;
    region: string;
    partner: string;
    partnerID: string;
    title: string;
    language: string;
    eidr: string;
    imdb: string;
    genre: string;
    subgenre: string;
    category: string;
    subcategory: string;
    releaseDate: string;
    duration: number;
    productionCountry: string;
    productionYear: number;
    productionCompany: string;
    rating: string;
    ratingDescriptors: string;
    producers: string;
    directors: string;
    writers: string;
    actors: string;
    shortDescription: string;
    longDescription: string;
    createdAt: string;
}

export interface IRelatedTitle {
    _score: number;
    _source: ITitle
}

export interface IFindRelatedTitlesRequest extends ITitle {
    opensearchQuery: any;
}

export interface IFindRelatedTitlesResponse {
    totalResults: number;
    maxScore: number;
    titles: IRelatedTitle[]
}