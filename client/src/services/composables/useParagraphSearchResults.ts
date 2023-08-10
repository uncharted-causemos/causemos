import { Ref, computed, ref, watch } from 'vue';
import { getDocument, getHighlights, searchParagraphs } from '../paragraphs-service';
import { DojoParagraphHighlights, Snippet } from '@/types/IndexDocuments';
import dateFormatter from '@/formatters/date-formatter';
const DATE_FORMATTER = (value: any) => dateFormatter(value, 'MMMM DD, YYYY');

const NO_TITLE = 'Title not available';
const NO_AUTHOR = 'Author not available';
const NO_SOURCE = 'Source not available';
const NO_TEXT = 'Text not available';
const NO_CREATION_DATE = '';

export default function useParagraphSearchResults(query: Ref<string>, resultCount = 40) {
  // `null` means snippets are loading
  const results = ref<Snippet[] | null>(null);
  const highlights = ref<DojoParagraphHighlights | null>(null);
  const isLoading = computed(() => results.value === null);
  watch(
    [query],
    async () => {
      // Clear any previously-fetched paragraphs
      results.value = null;
      highlights.value = null;

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

      highlights.value = await getHighlights({
        query: query.value,
        matches: queryResults.results.map((item) => item.text),
      });

      // Form list of snippets by pulling out relevant fields from query results and document data.
      results.value = queryResults.results.map((result, i) => {
        const metadata = metadataResults[i];
        return {
          documentId: result.document_id,
          fragmentParagraphLocation: parseInt(result.id.split('-')[1]),
          text: highlights.value
            ? highlights.value.highlights[i].reduce(
                (paragraph, item) =>
                  item.highlight
                    ? `${paragraph}<span class="dojo-mark">${item.text}</span>`
                    : `${paragraph}${item.text}`,
                ''
              )
            : result.text
            ? result.text
            : NO_TEXT,
          documentTitle: metadata.title ?? NO_TITLE,
          documentAuthor: metadata.author ?? NO_AUTHOR,
          documentSource: metadata.producer ?? NO_SOURCE,
          documentCreationDate: metadata.creation_date
            ? DATE_FORMATTER(metadata.creation_date)
            : NO_CREATION_DATE,
        };
      });
    },
    { immediate: true }
  );

  return { results, isLoading, highlights };
}
