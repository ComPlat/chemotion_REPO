// Carries a one-shot search seed across the Aviator route change from the
// welcome page to the publications page. PublicationSearchPage consumes it
// once on mount, so navigating away and back does not re-apply stale params.
let seed = null;

export const setPublicationSearchSeed = (next) => {
  seed = next || null;
};

export const consumePublicationSearchSeed = () => {
  const current = seed;
  seed = null;
  return current;
};
