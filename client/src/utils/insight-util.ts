import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import { Clause, Filters } from '@/types/Filters';
import _ from 'lodash';
import { deleteInsight, fetchInsights, InsightFilterFields } from '@/services/insight-service';
import { INSIGHTS } from './messages-util';
import useToaster from '@/services/composables/useToaster';
import { computed } from 'vue';
import { Insight, InsightMetadata } from '@/types/Insight';
import dateFormatter from '@/formatters/date-formatter';
import { Packer, Document, SectionType, Footer, Paragraph, AlignmentType, ImageRun, TextRun, HeadingLevel, ExternalHyperlink, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import pptxgen from 'pptxgenjs';
import { ProjectType } from '@/types/Enums';

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

function isQuantitativeView(currentView: string) {
  return currentView === 'modelPublishingExperiment' ||
  currentView === 'data' ||
  currentView === 'dataPreview' ||
  currentView === 'dataComparative';
}

function parseMetadataDetails (
  dataState: any,
  projectMetadata: any,
  analysisName: string,
  formattedFilterString: string,
  currentView: string,
  projectType: string,
  insightLastUpdate?: number
): InsightMetadata {
  const quantitativeView = isQuantitativeView(currentView);
  const summary: InsightMetadata = {
    projectName: projectMetadata.name,
    insightLastUpdate: insightLastUpdate ?? Date.now()
  };
  if (!dataState || !projectMetadata) return summary;

  if (quantitativeView) {
    if (projectType === ProjectType.Analysis) {
      summary.analysisName = analysisName;
    }
  } else {
    summary.cagName = dataState.modelName;
    summary.ontology = projectMetadata.ontology;
    summary.ontology_created_at = projectMetadata.created_at;
    summary.ontology_modified_at = projectMetadata.modified_at;
    summary.corpus_id = projectMetadata.corpus_id;
    if (formattedFilterString.length > 0) {
      summary.filters = formattedFilterString;
    }
    summary.nodesCount = dataState.nodesCount ?? undefined;
    summary.selectedNode = dataState.selectedNode ?? undefined;
    summary.selectedEdge = dataState.selectedEdge ?? undefined;
    summary.selectedCAGScenario = dataState.selectedScenarioId ?? undefined;
    summary.currentEngine = dataState.currentEngine ?? undefined;
    summary.selectedNode = dataState.selectedNode ?? undefined;
  }

  if (dataState.datacubeTitles) {
    summary.datacubes = [];
    dataState.datacubeTitles.forEach((title: any) => {
      summary.datacubes?.push({
        datasetName: title.datacubeName,
        outputName: title.datacubeOutputName,
        source: title.source
      });
    });
  }
  return summary;
}

function removeInsight(id: string, store?: any) {
  deleteInsight(id).then(result => {
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
  });
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

function exportDOCX(selectedInsights: Insight[], projectMetadata: any) {
  // 72dpi * 8.5 inches width, as word perplexingly uses pixels
  // same height as width so that we can attempt to be consistent with the layout.
  const docxMaxImageSize = 612;
  const insightSet = selectedInsights;
  const metadataSummary = getMetadataSummary(projectMetadata);
  const sections = insightSet.map((i) => {
    const datacubeId = _.first(i.context_id);
    const imageSize = scaleImage(i.thumbnail, docxMaxImageSize, docxMaxImageSize);
    const insightDate = dateFormatter((i as any).modified_at); // FIXME: add modified_at field to type
    return {
      footers: {
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
      },
      properties: {
        type: SectionType.NEXT_PAGE
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.HEADING_2,
          text: `${i.name}`
        }),
        new Paragraph({
          // break: 1, // REVIEW
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: i.thumbnail,
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
              text: `${i.description}`
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
              link: slideURL(getSourceUrlForExport(i.url, i.id as string, datacubeId as string))
            })
          ]
        })
      ]
    };
  });

  const doc = new Document({
    sections,
    title: projectMetadata.name,
    description: metadataSummary
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${getFileName(projectMetadata)}.docx`);
  });
}

function exportPPTX(selectedInsights: Insight[], projectMetadata: any) {
  // some PPTX consts as powerpoint does everything in inches & has hard boundaries
  const widthLimitImage = 10;
  const heightLimitImage = 4.75;
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
  const insightSet = selectedInsights;
  insightSet.forEach((i) => {
    const datacubeId = _.first(i.context_id);
    const imageSize = scaleImage(i.thumbnail, widthLimitImage, heightLimitImage);
    const insightDate = dateFormatter((i as any).modified_at); // FIXME
    const slide = pres.addSlide();
    const notes = `Title: ${i.name}\nDescription: ${i.description}\nCaptured on: ${insightDate}\n${metadataSummary}`;

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
      data: i.thumbnail,
      // centering image code for x & y limited by consts for max content size
      // plus base offsets needed to stay clear of other elements
      x: (widthLimitImage - imageSize.width) / 2,
      y: (heightLimitImage - imageSize.height) / 2,
      w: imageSize.width,
      h: imageSize.height
    });
    slide.addText([
      {
        text: `${i.name}: `,
        options: {
          bold: true,
          color: '000088',
          hyperlink: {
            url: slideURL(getSourceUrlForExport(i.url, i.id as string, datacubeId as string))
          }
        }
      },
      {
        text: `${i.description} `,
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
            url: slideURL(getSourceUrlForExport(i.url, i.id as string, datacubeId as string))
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
  });
  pres.writeFile({
    fileName: getFileName(projectMetadata)
  });
}

async function getPublicInsights(datacubeId: string, projectId: string) {
  const publicInsightsSearchFields: InsightFilterFields = {};
  publicInsightsSearchFields.visibility = 'public';
  publicInsightsSearchFields.project_id = projectId;
  publicInsightsSearchFields.context_id = datacubeId;
  const publicInsights = await fetchInsights([publicInsightsSearchFields]);
  return publicInsights as Insight[];
}

export default {
  parseMetadataDetails,
  getFormattedFilterString,
  getSourceUrlForExport,
  removeInsight,
  jumpToInsightContext,
  exportDOCX,
  exportPPTX,
  getPublicInsights
};
