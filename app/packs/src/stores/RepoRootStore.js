import React from 'react';
import { types } from 'mobx-state-tree';
import { FundingStore } from 'src/stores/FundingStore';

export const RepoRootStore = types
  .model({
    fundingStore: types.optional(FundingStore, {}),
  })
  .views(self => ({
    get funding() {
      return self.fundingStore;
    },
  }));

export const RepoStoreContext = React.createContext(RepoRootStore.create({}));
