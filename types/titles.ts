// export interface ITitleProcessingQueueItem {
//     mamUUID: string;
//     title: string;
//     createdAt: string;
// }

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