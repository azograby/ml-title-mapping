import {configureStore} from '@reduxjs/toolkit';
import { authReducer } from './auth';
import { searchConfigReducer } from './search-config';

const store = configureStore({
    reducer: {
        authReducer,
        searchConfigReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['auth/setUser'],
                ignoredPaths: ['authReducer.user'],
            },
        }),
});

export default store;