import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import { Clause, Filters } from '@/types/Filters';
import _ from 'lodash';
import { countInsights, deleteInsight, InsightFilterFields } from '@/services/insight-service';
import { Bibliography, getBibiographyFromCagIds } from '@/services/bibliography-service';
import { INSIGHTS } from './messages-util';
import useToaster from '@/services/composables/useToaster';
import { computed } from 'vue';
import { AnalyticalQuestion, Insight, FullInsight, QualitativeDataState, DataState, ModelsSpaceDataState, DataSpaceDataState, ReviewPosition, SectionWithInsights } from '@/types/Insight';
import dateFormatter from '@/formatters/date-formatter';
import { Packer, Document, SectionType, Footer, Paragraph, AlignmentType, ImageRun, TextRun, HeadingLevel, ExternalHyperlink, UnderlineType, ISectionOptions, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';
import pptxgen from 'pptxgenjs';
import { DataTransform } from '@/types/Enums';
import { DataAnalysisState } from '@/types/Analysis';

function getSourceUrlForExport(insightURL: string, insightId: string, datacubeId: string | undefined) {
  const separator = '?';
  const insightUrlSeparated = insightURL.split(separator);
  const urlPrefix = _.first(insightUrlSeparated);
  const urlSuffix = insightUrlSeparated.slice(1).join(separator);
  const searchParams = new URLSearchParams(urlSuffix);
  const insightIdKey = 'insight_id';
  if (!_.isUndefined(insightIdKey)) {
    searchParams.set(insightIdKey, insightId);
  }
  const datacubeIdKey = 'datacube_id';
  if (!searchParams.has(datacubeIdKey) && !_.isUndefined(datacubeId)) {
    searchParams.set(datacubeIdKey, datacubeId);
  }
  // remove datacube_id if the passed one is undefined (e.g., within dataComparative)
  if (searchParams.has(datacubeIdKey) && _.isUndefined(datacubeId)) {
    searchParams.delete(datacubeIdKey);
  }
  return urlPrefix + separator + searchParams.toString();
}

function getFormattedFilterString(filters: Filters) {
  const filterString = filters?.clauses?.reduce((a: string, c: Clause) => {
    return a + `${a.length > 0 ? ' AND ' : ''} ` +
      `${FilterKeyFormatter(c.field)} ${c.isNot ? 'is not' : 'is'} ` +
      `${c.values.map(v => FilterValueFormatter(v, null)).join(', ')}`;
  }, '');
  return `${filterString.length > 0 ? filterString : ''}`;
}


export const createDataSpaceDataState = (
  datacubeId: string
): DataSpaceDataState => {
  return {
    activeFeatures: [],
    activeReferenceOptions: [],
    nonDefaultQualifiers: [],
    relativeTo: null,
    searchFilters: { clauses: [] },
    selectedModelId: datacubeId,
    selectedOutputVariables: [],
    selectedPreGenDataId: '',
    selectedQualifierValues: [],
    selectedRegionIds: [],
    selectedRegionIdsAtAllLevels: {
      country: [],
      admin1: [],
      admin2: [],
      admin3: []
    },
    selectedScenarioIds: [],
    selectedTimestamp: null,
    selectedTransform: DataTransform.None,
    selectedYears: []
  };
};

export function isDataSpaceDataState(
  dataState: DataState
): dataState is DataSpaceDataState {
  return (dataState as DataSpaceDataState).selectedModelId !== undefined;
}

export function isQualitativeViewDataState(
  dataState: DataState
): dataState is QualitativeDataState {
  return (dataState as QualitativeDataState).modelName !== undefined;
}

export function isModelsSpaceDataState(
  dataState: QualitativeDataState
): dataState is ModelsSpaceDataState {
  return (dataState as ModelsSpaceDataState).selectedScenarioId !== undefined;
}

export function isDataAnalysisState(
  dataState: DataState
): dataState is DataAnalysisState {
  return (dataState as DataAnalysisState).analysisItems !== undefined;
}

async function removeInsight(id: string, store?: any) {
  const result = await deleteInsight(id);
  const message = result.status === 200 ? INSIGHTS.SUCCESSFUL_REMOVAL : INSIGHTS.ERRONEOUS_REMOVAL;
  const toast = useToaster();
  if (message === INSIGHTS.SUCCESSFUL_REMOVAL) {
    toast(message, 'success', false);

    if (store) {
      const countInsights = computed(() => store.getters['insightPanel/countInsights']);
      const count = countInsights.value - 1;
      store.dispatch('insightPanel/setCountInsights', count);
    }
  } else {
    toast(message, 'error', true);
  }
  // FIXME: delete any reference to this insight from its list of analytical_questions
}

function jumpToInsightContext(insight: Insight, currentURL: string) {
  const savedURL = insight.url;
  const insightId = insight.id ?? '';
  // NOTE: applying an insight should not automatically set a specific datacube_id as a query param
  //  because, for example, the comparative analysis (region-ranking) page does not
  //  need/understand a specific datacube_id,
  //  and setting it regardless may have a negative side effect
  const datacubeId = savedURL.includes('/dataComparative/') ? undefined : _.first(insight.context_id);

  if (savedURL !== currentURL) {
    // FIXME: applying (private) insights that belong to analyses that no longer exist
    // TODO LATER: consider removing (private) insights once their owner (analysis or cag) is removed

    // add 'insight_id' as a URL param so that the target page can apply it
    // /data/ will be in the url if we are in the datacube drilldown page in which case datacube_id should be in the route.
    const finalURL = getSourceUrlForExport(savedURL, insightId, datacubeId);
    return finalURL;
  }
}

function getPngDimensionsInPixels(base64png: string) {
  const header = atob(base64png.slice(22, 72)).slice(16, 24);
  const uint8 = Uint8Array.from(header, c => c.charCodeAt(0));
  const dataView = new DataView(uint8.buffer);
  const width = dataView.getInt32(0);
  const height = dataView.getInt32(4);
  return { height, width };
}

function scaleImage(base64png: string, widthLimit: number, heightLimit: number) {
  const imageSize = getPngDimensionsInPixels(base64png);
  let scaledWidth = widthLimit;
  let scaledHeight = imageSize.height * scaledWidth / imageSize.width;

  if (scaledHeight > heightLimit) {
    scaledHeight = heightLimit;
    scaledWidth = imageSize.width * scaledHeight / imageSize.height;
  }

  return {
    width: scaledWidth,
    height: scaledHeight
  };
}

function slideURL(slideURL: string) {
  return `${window.location.protocol}//${window.location.host}/#${slideURL}`;
}

function getFileName(projectMetadata: any) {
  const date = new Date();
  const formattedDate = dateFormatter(date, 'YYYY-MM-DD hh:mm:ss a');
  return `Causemos ${projectMetadata.name} ${formattedDate}`;
}

// REVIEW withe MetadataSummary type referenced at the top of this file
function getMetadataSummary(projectMetadata: any) {
  const projectCreatedDate = new Date(projectMetadata.created_at);
  const projectModifiedDate = new Date(projectMetadata.modified_at);
  return `Project: ${projectMetadata.name} - Created: ${projectCreatedDate.toLocaleString()} - ` +
    `Modified: ${projectModifiedDate.toLocaleString()} - Corpus: ${projectMetadata.corpus_id}`;
}


// creates a new array of insights out of the questions and insights passed to
// the function that can be used to export something in the order expected from
// analysis checklist.
function parseReportFromQuestionsAndInsights(
  insights: Insight[],
  questions: AnalyticalQuestion[]
): (AnalyticalQuestion|Insight)[] {
  if (questions.length === 0) return insights;

  const report: (Insight|AnalyticalQuestion)[] = [];
  const insightMap = new Map<string, Insight>();
  insights.forEach(i => insightMap.set(i.id ?? '', i));

  questions.forEach((question) => {
    report.push(question);
    question.linked_insights.forEach(li => {
      const i = insightMap.get(li);
      i && report.push(i);
    });
  });

  return report;
}

function createEmptyChecklistSection(): AnalyticalQuestion {
  return {
    id: '',
    question: '',
    linked_insights: [],
    view_state: {},
    target_view: [],
    visibility: '',
    url: ''
  };
}

function getSlideFromPosition(
  sections: SectionWithInsights[],
  position: ReviewPosition | null
): FullInsight | AnalyticalQuestion | null {
  if (position === null) {
    return null;
  }
  const section = sections.find(
    section => section.section.id === position.sectionId
  );
  if (section === undefined) {
    return null;
  }
  if (position.insightId === null) {
    return section.section;
  }
  return section.insights.find(
    insight => insight.id === position.insightId
  ) ?? null;
}

function instanceOfFullInsight(data: any): data is FullInsight {
  return data !== null && 'thumbnail' in data;
}

function instanceOfQuestion(data: any): data is AnalyticalQuestion {
  return data !== null && 'question' in data;
}

function generateFooterDOCX (metadataSummary: string) {
  return {
    default: new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              size: 14,
              text: metadataSummary
            })
          ]
        })
      ]
    })
  };
}

function generateInsightDOCX (
  insight: FullInsight,
  metadataSummary: string,
  newPage: boolean
): ISectionOptions {
  // 72dpi * 8.5 inches width, as word perplexingly uses pixels
  // same height as width so that we can attempt to be consistent with the layout.
  const docxMaxImageSize = 612;
  const datacubeId = _.first(insight.context_id);
  const imageSize = scaleImage(insight.image, docxMaxImageSize, docxMaxImageSize);
  const insightDate = dateFormatter(insight.modified_at);
  const footers = generateFooterDOCX(metadataSummary);
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_2,
      text: `${insight.name}`
    }),
    new Paragraph({
      // break: 1, // REVIEW
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: insight.image,
          transformation: {
            height: imageSize.height,
            width: imageSize.width
          }
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          break: 1,
          bold: true,
          size: 24,
          text: 'Description: '
        }),
        new TextRun({
          size: 24,
          text: `${insight.description}`
        }),
        new TextRun({
          bold: true,
          break: 1,
          size: 24,
          text: 'Metadata: '
        }),
        new TextRun({
          size: 24,
          text: `Captured on: ${insightDate} - ${metadataSummary} - `
        }),
        new ExternalHyperlink({
          child: new TextRun({
            size: 24,
            text: '(View Source on Causemos)',
            underline: {
              type: UnderlineType.SINGLE
            }
          }),
          link: slideURL(getSourceUrlForExport(insight.url, insight.id as string, datacubeId as string))
        })
      ]
    })
  ];
  const properties = {
    type: newPage ? SectionType.NEXT_PAGE : SectionType.CONTINUOUS
  };
  return newPage ? {
    footers,
    children,
    properties
  } : {
    children,
    properties
  };
}

function generateQuestionDOCX (
  question: AnalyticalQuestion,
  metadataSummary: string
): ISectionOptions {
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      text: `${question.question}`
    })
  ];
  const properties = {
    type: SectionType.NEXT_PAGE
  };
  const footers = generateFooterDOCX(metadataSummary);
  return {
    children,
    properties,
    footers
  };
}

function targetViewsContainCAG(targetViews: string[]): boolean {
  const validBibiographyTypes = ['quantitative', 'qualitative'];
  return targetViews.some(v => validBibiographyTypes.includes(v));
}

function generateAPACiteDOCX(b: Bibliography): TextRun[] {
  const cite = <TextRun[]>[];
  // line break, author
  cite.push(new TextRun({
    break: 1,
    size: 24,
    text: b.author.length > 0 ? `${b.author} ` : ''
  }));

  // date
  cite.push(new TextRun({
    size: 24,
    text: `(${b.publication_date ? b.publication_date.year : 'n/a'}). `
  }));

  // title
  const title = (b.title && b.title.length > 0) ? b.title : `Document: ${b.doc_id}`;
  cite.push(new TextRun({
    size: 24,
    text: `${title}. `
  }));

  // publisher name
  if (b.publisher_name.length > 0) {
    cite.push(new TextRun({
      italics: true,
      size: 24,
      text: `${b.publisher_name}.`
    }));
  }

  return cite;
}

async function generateAppendixDOCX(
  insights: Insight[],
  metadataSummary: string
) {
  const cags = getCagMapFromInsights(insights);
  const cagIds = Array.from(cags.keys());
  // FIXME: Not an ideal place to make this call, but generally need consider overhauling this with insights
  const result = await getBibiographyFromCagIds(cagIds);
  const children = <Paragraph[]>[];

  cagIds.forEach(id => {
    const cagInfo = cags.get(id);

    children.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          break: 1,
          text: `${cagInfo?.modelName}`
        })
      ]
    }));

    result.data[id].forEach((b: Bibliography) => {
      children.push(new Paragraph({
        indent: {
          start: convertInchesToTwip(0.5)
        },
        alignment: AlignmentType.LEFT,
        children: generateAPACiteDOCX(b)
      }));
    });
  });

  const bibliographyHeader = new Paragraph({
    alignment: AlignmentType.LEFT,
    heading: HeadingLevel.HEADING_1,
    text: 'References'
  });
  children.unshift(bibliographyHeader);

  const properties = {
    type: SectionType.NEXT_PAGE
  };
  const footers = generateFooterDOCX(metadataSummary);
  return {
    children,
    properties,
    footers
  };
}

function getCagMapFromInsights (insights: Insight[]) {
  const cags = insights.reduce((acc, item) => {
    if (
      item.context_id &&
      item.context_id.length > 0 &&
      targetViewsContainCAG(item.target_view)
    ) {
      if (
        !acc.has(item.context_id[0]) &&
        item.data_state &&
        isQualitativeViewDataState(item.data_state)
      ) {
        acc.set(
          item.context_id[0],
          item.data_state
        );
      }
    }
    return acc;
  }, new Map<string, QualitativeDataState>());
  return cags;
}

async function exportDOCX(
  insights: FullInsight[],
  projectMetadata: any,
  questions?: AnalyticalQuestion[]
) {
  const allData = questions
    ? parseReportFromQuestionsAndInsights(insights, questions)
    : insights;

  const metadataSummary = getMetadataSummary(projectMetadata);
  const sections = allData.reduce((acc, item, index) => {
    if (instanceOfFullInsight(item)) {
      const newPage = index > 0 && !instanceOfQuestion(allData[index - 1]);
      acc.push(generateInsightDOCX(item, metadataSummary, newPage));
    } else if (instanceOfQuestion(item)) {
      acc.push(generateQuestionDOCX(item, metadataSummary));
    }
    return acc;
  }, <ISectionOptions[]>[]);


  const bibliographyPages = await generateAppendixDOCX(insights, metadataSummary);
  sections.push(bibliographyPages);

  const doc = new Document({
    sections,
    title: projectMetadata.name,
    description: metadataSummary
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${getFileName(projectMetadata)}.docx`);
  });
}

function generateInsightPPTX (
  insight: FullInsight,
  pres: pptxgen,
  metadataSummary: string
) {
  // some PPTX consts as powerpoint does everything in inches & has hard boundaries
  const widthLimitImage = 10;
  const heightLimitImage = 4.75;

  const datacubeId = _.first(insight.context_id);
  const imageSize = scaleImage(insight.image, widthLimitImage, heightLimitImage);
  const insightDate = dateFormatter(insight.modified_at);
  const slide = pres.addSlide();
  const notes = `Title: ${insight.name}\nDescription: ${insight.description}\nCaptured on: ${insightDate}\n${metadataSummary}`;

  /*
    PPTXGEN BUG WORKAROUND - library level function slide.addNotes(notes) doesn't insert notes
    correctly at the moment, placing an object array doesn't get parse back out to a string
    so we manually push a SlideObject representing a note in this slides' _slideObject array,
    so that only a string is set.
  */
  (slide as any)._slideObjects.push({
    _type: 'notes',
    text: notes
  });
  slide.addImage({
    data: insight.image,
    // centering image code for x & y limited by consts for max content size
    // plus base offsets needed to stay clear of other elements
    x: (widthLimitImage - imageSize.width) / 2,
    y: (heightLimitImage - imageSize.height) / 2,
    w: imageSize.width,
    h: imageSize.height
  });
  slide.addText([
    {
      text: `${insight.name}: `,
      options: {
        bold: true,
        color: '000088',
        hyperlink: {
          url: slideURL(getSourceUrlForExport(insight.url, insight.id as string, datacubeId as string))
        }
      }
    },
    {
      text: `${insight.description} `,
      options: {
        // break: false
      }
    },
    {
      text: `\n(Captured on: ${insightDate} - ${metadataSummary} `,
      options: {
        // break: false // REVIEW
      }
    },
    {
      text: 'View On Causemos',
      options: {
        // break: false, // REVIEW
        color: '000088',
        hyperlink: {
          url: slideURL(getSourceUrlForExport(insight.url, insight.id as string, datacubeId as string))
        }
      }
    },
    {
      text: '.)',
      options: {
        // break: false // REVIEW
      }
    }
  ], {
    x: 0,
    y: 4.75,
    w: 10,
    h: 0.75,
    color: '363636',
    fontSize: 10,
    align: pres.AlignH.left
  });
}

function generateQuestionPPTX (question: AnalyticalQuestion, pres: pptxgen) {
  const slide = pres.addSlide();
  slide.addText(question.question, {
    x: 0,
    y: 2.375,
    w: 10,
    h: 0.75,
    color: '363636',
    fontSize: 30,
    align: pres.AlignH.center
  });
}

function exportPPTX(
  insights: FullInsight[],
  projectMetadata: any,
  questions?: AnalyticalQuestion[]
) {
  const allData = questions
    ? parseReportFromQuestionsAndInsights(insights, questions)
    : insights;

  const Pptxgen = pptxgen;
  const pres = new Pptxgen();

  const metadataSummary = getMetadataSummary(projectMetadata);

  // so we can add the project metadata in the footer with basic numbering while we're at it.
  pres.defineSlideMaster({
    title: 'MASTER_SLIDE',
    margin: [0.5, 0.25, 1.00, 0.25],
    background: { fill: 'FFFFFF' },
    slideNumber: { x: 9.75, y: 5.375, color: '000000', fontSize: 8, align: pres.AlignH.right }
  });

  allData.forEach((item) => {
    if (instanceOfFullInsight(item)) {
      generateInsightPPTX(item, pres, metadataSummary);
    } else if (instanceOfQuestion(item)) {
      generateQuestionPPTX(item, pres);
    }
  });

  pres.writeFile({
    fileName: getFileName(projectMetadata)
  });
}


export default {
  instanceOfFullInsight,
  instanceOfQuestion,
  createEmptyChecklistSection,
  getSlideFromPosition,
  getFormattedFilterString,
  getSourceUrlForExport,
  removeInsight,
  jumpToInsightContext,
  exportDOCX,
  exportPPTX
};
