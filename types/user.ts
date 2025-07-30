export interface IUser {
    id: string;
    name: string;
    loginId: string;
    identityId: string;
}

export class User implements IUser {
    constructor(
        public id: string,
        public name: string,
        public loginId: string,
        public identityId: string,
    ) {}
}