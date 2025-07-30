import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ISearchConfigState {
  config?: any;
}

export interface ISearchConfigStateReducer {
  searchConfigReducer: ISearchConfigState;
}

const slice = createSlice({
  name: 'searchConfig',
  initialState: <ISearchConfigState>{
    config: undefined,
  },
  reducers: {
    setSearchConfig: (state, action: PayloadAction<any | undefined>) => {
      state.config = action.payload;
    }
  }
});

export const searchConfigReducer = slice.reducer;
export const searchConfigStoreActions = slice.actions;