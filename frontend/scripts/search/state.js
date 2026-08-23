/** Shared mutable search UI state (single source of truth across modules). */
export const searchState = {
  promoIntentRequestId: 0,
  searchAttachment: null,
  lastShareContext: {
    query: '',
    answer: '',
    answerEmpty: false,
    usedWebSearch: false,
    sources: [],
    images: [],
    videos: [],
    timings: null
  },
  feedbackLocked: false,
  currentResultsCategory: 'general',
  resultsQuery: '',
  pageInitialized: false
};
