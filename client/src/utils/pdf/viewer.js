// import _ from 'lodash';

const DEFAULT_WIDTH = 800;

// See https://observablehq.com/@mbostock/hello-pdf-js-pdfpageview

export async function createPDFViewer({ url, contentWidth = DEFAULT_WIDTH }) {
  console.log(contentWidth);
  // lazy load pdfjs lib
  // Set the pdf workerSrc explicitly for firefox
  // For more detail see: https://github.com/mozilla/pdf.js/issues/8204
  const [pdfjs, pdfjsWorker, PDFViewer] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.js'),
    import('pdfjs-dist/legacy/build/pdf.worker.entry.js'),
    import('pdfjs-dist/legacy/web/pdf_viewer.js')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  console.log('pdfjs', pdfjs);
  console.log('pdfviewer', PDFViewer);
  const container = document.createElement('div');
  const pdfViewerElement = document.createElement('div');
  pdfViewerElement.classList = 'pdfViewer';
  container.appendChild(pdfViewerElement);
  console.log('\tcontainer', container);

  const eventBus = new PDFViewer.EventBus();
  console.log('\teventBus', eventBus);

  const linkService = new PDFViewer.PDFLinkService({ eventBus });
  console.log('\tlinkService', linkService);

  let findController;
  try {
    findController = new PDFViewer.PDFFindController({
      eventBus: eventBus,
      linkService
    });
    console.log('\t\t', findController);
  } catch (err) {
    console.log(err);
  }

  let viewer;
  try {
    // viewer = new PDFViewer.PDFViewer({ container, eventBus, linkService });
    viewer = new PDFViewer.PDFViewer({ container, eventBus, linkService, findController });
  } catch (err) {
    console.log(err);
  }

  const pdfDoc = await pdfjs.getDocument(url).promise;
  viewer.setDocument(pdfDoc);
  linkService.setViewer(viewer);
  linkService.setDocument(pdfDoc, null);

  console.log('###');
  console.log(viewer);
  console.log('###');

  eventBus.on('pagesinit', () => {
    console.log('ready??');
    viewer.currentScaleValue = 'page-width';
  });
  eventBus.on('updatefindcontrolstate', data => {
    console.log('EB', data);
  });

  return {
    search(query) {
      console.log('search ...', query);
      findController.executeCommand('find', {
        query: query,
        phraseSearch: true
      });
      /*
      findController.executeCommand('find', {
        caseSensitive: false,
        findPrevious: true,
        highlightAll: true,
        scrollMatches: true,
        // phraseSearch: true,
        query: query
      });
      */
    },
    element: container,
    async renderPages() {
    }
  };
}
