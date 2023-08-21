import { Ref, computed, ref, watch } from 'vue';
import { getDocument, getHighlights, searchParagraphs } from '../services/paragraphs-service';
import { DojoParagraphHighlight, Snippet } from '@/types/IndexDocuments';
import dateFormatter from '@/formatters/date-formatter';
import { HIGHLIGHTED_TEXT_CLASS } from '@/utils/text-viewer-util';
const DATE_FORMATTER = (value: string) => dateFormatter(value, 'MMMM DD, YYYY');

const NO_TITLE = 'Title not available';
const NO_AUTHOR = 'Author not available';
const NO_SOURCE = 'Source not available';
const NO_CREATION_DATE = '';

/**
 * Verify that the highlights are unique and sorted by length, and map them to simple strings.
 */
const prepareHighlightsForDocumentViewer = (highlights: DojoParagraphHighlight[]) => {
  return highlights
    .filter((item) => item.highlight === true)
    .map((highlight) => highlight.text)
    .reduce((accumulator, item) => {
      const index = accumulator.findIndex((existingItem) => {
        return existingItem === item;
      });
      if (index < 0) {
        return [...accumulator, item];
      }
      return accumulator;
    }, [] as string[])
    .sort((a, b) => {
      if (a.length > b.length) {
        return 1;
      } else if (a.length < b.length) {
        return -1;
      } else {
        return 0;
      }
    });
};

export default function useParagraphSearchResults(query: Ref<string>, resultCount = 40) {
  // `null` means snippets are loading
  const results = ref<Snippet[] | null>(null);
  const highlights = ref<string[][]>([]);
  const isLoading = computed(() => results.value === null);
  watch(
    [query],
    async () => {
      // Clear any previously-fetched paragraphs
      results.value = null;
      highlights.value = [];

      if (query.value.length === 0) {
        return;
      }

      // Save a copy of the query to watch for race conditions later
      const fetchingSnippetsFor = query.value;

      const queryResults = await searchParagraphs(query.value, resultCount);
      if (fetchingSnippetsFor !== query.value) {
        // query has changed since the results returned, so throw away the
        //  results to avoid a race condition.
        return;
      }

      // Fetch metadata for each document in parallel (too slow if performed one-by-one).
      const metadataRequests = queryResults.results.map((result) =>
        getDocument(result.document_id)
      );
      const metadataResults = await Promise.all(metadataRequests);

      const highlightsResponse = await getHighlights({
        query: query.value,
        matches: queryResults.results.map((item) => item.text),
      });

      // Form list of snippets by pulling out relevant fields from query results and document data.
      results.value = queryResults.results.map((result, i) => {
        const metadata = metadataResults[i];
        return {
          documentId: result.document_id,
          fragmentParagraphLocation: parseInt(result.id.split('-')[1]),
          text: highlightsResponse.highlights[i].reduce(
            (paragraph, item) =>
              item.highlight
                ? `${paragraph}<span class="${HIGHLIGHTED_TEXT_CLASS}">${item.text}</span>`
                : `${paragraph}${item.text}`,
            ''
          ),
          documentTitle: metadata.title ?? NO_TITLE,
          documentAuthor: metadata.author ?? NO_AUTHOR,
          documentSource: metadata.producer ?? NO_SOURCE,
          documentCreationDate: metadata.creation_date
            ? DATE_FORMATTER(metadata.creation_date)
            : NO_CREATION_DATE,
        };
      });

      highlights.value = highlightsResponse.highlights.map(prepareHighlightsForDocumentViewer);
    },
    { immediate: true }
  );

  return { results, isLoading, highlights };
}
