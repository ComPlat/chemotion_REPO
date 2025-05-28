/* eslint-disable import/prefer-default-export */
/* eslint-disable no-param-reassign */
// In MobX-State-Tree (MST), assigning to properties of the self parameter is
// the standard and intended usage pattern.
import { types, flow } from 'mobx-state-tree';
import CrossRefFunderFetcher from 'src/fetchers/CrossRefFunderFetcher';

const Funding = types.model({
  fundingId: types.identifierNumber,
  funderName: types.string,
  funderIdentifier: types.maybeNull(types.string),
  funderIdentifierType: types.maybeNull(types.string),
  awardNumber: types.maybeNull(types.string),
  awardTitle: types.maybeNull(types.string),
  awardUri: types.maybeNull(types.string),
});

export const FundingStore = types
  .model({
    // Store fundings per element as a map: key = `${elementType}_${elementId}`
    fundings: types.optional(types.map(types.array(Funding)), {}),
    loading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    refreshFlag: types.optional(types.number, 0),
  })
  .actions(self => ({
    setError(error) {
      self.error = error;
    },
    clearError() {
      self.error = null;
    },
    loadFundings: flow(function* loadFundings(
      elementType,
      elementId,
      aggregate = false
    ) {
      self.loading = true;
      self.clearError();
      try {
        const response = yield CrossRefFunderFetcher.getFunderForElement(
          elementType,
          elementId,
          aggregate
        );
        const fundingEntities = response || [];
        const key = `${elementType}_${elementId}`;
        self.fundings.set(
          key,
          fundingEntities.map(entity => ({
            fundingId: entity.id,
            funderName: entity.metadata.funderName,
            funderIdentifier: entity.metadata.funderIdentifier || null,
            funderIdentifierType: entity.metadata.funderIdentifierType || null,
            awardNumber: entity.metadata.awardNumber || null,
            awardTitle: entity.metadata.awardTitle || null,
            awardUri: entity.metadata.awardUri || null,
          })) || []
        );
        self.loading = false;
      } catch (error) {
        self.setError(
          `Failed to load funding references: ${
            error && error.message ? error.message : error
          }`
        );
        self.loading = false;
      }
    }),
    addFunding: flow(function* addFunding(elementType, elementId, fundingData) {
      self.loading = true;
      self.clearError();
      try {
        const response = yield CrossRefFunderFetcher.storeFunderForElement(
          elementType,
          elementId,
          fundingData
        );
        // Assume response contains the new funding entity (with id and metadata)
        let newFunding = null;
        if (response && response.id && response.metadata) {
          newFunding = {
            fundingId: response.id,
            funderName: response.metadata.funderName,
            funderIdentifier: response.metadata.funderIdentifier || null,
            funderIdentifierType:
              response.metadata.funderIdentifierType || null,
            awardNumber: response.metadata.awardNumber || null,
            awardTitle: response.metadata.awardTitle || null,
            awardUri: response.metadata.awardUri || null,
          };
          const key = `${elementType}_${elementId}`;
          if (!self.fundings.has(key)) {
            self.fundings.set(key, []);
          }
          self.fundings.get(key).push(newFunding);
          self.loading = false;
        }
      } catch (error) {
        self.setError('Failed to add funding reference');
        self.loading = false;
      }
    }),
    removeFunding: flow(
      function* removeFunding(elementType, elementId, fundingId) {
        self.loading = true;
        self.clearError();
        try {
          yield CrossRefFunderFetcher.removeFunderForElement(fundingId);
          // Remove from fundings array for the correct element
          const key = `${elementType}_${elementId}`;
          if (self.fundings.has(key)) {
            const arr = self.fundings.get(key);
            const idx = arr.findIndex(f => f.fundingId === fundingId);
            if (idx > -1) {
              arr.splice(idx, 1);
            }
          }
          self.loading = false;
        } catch (error) {
          self.setError('Failed to remove funding reference');
          self.loading = false;
        }
      }
    ),
    triggerRefresh() {
      self.refreshFlag = Date.now();
    },
  }));
