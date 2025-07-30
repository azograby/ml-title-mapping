import {configureStore} from '@reduxjs/toolkit';
import { authReducer } from './auth';
import { logMessagesReducer } from './log-output';
import { searchConfigReducer } from './search-config';

const store = configureStore({
    reducer: {
        authReducer,
        logMessagesReducer,
        searchConfigReducer,
    }
});

export default store;