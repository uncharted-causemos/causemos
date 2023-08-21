// See https://observablehq.com/@mbostock/hello-pdf-js-pdfpageview
export async function createPDFViewer({ url }) {
  // lazy load pdfjs lib
  // Set the pdf workerSrc explicitly for firefox
  // For more detail see: https://github.com/mozilla/pdf.js/issues/8204
  const [pdfjs, pdfjsWorker, PDFViewer] = await Promise.all([
    import('pdfjs-dist/build/pdf.js'),
    import('pdfjs-dist/build/pdf.worker.entry.js'),
    import('pdfjs-dist/web/pdf_viewer.js'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.overflow = 'auto';
  container.style.width = '100%';
  container.style.height = '100%';

  const pdfViewerElement = document.createElement('div');
  pdfViewerElement.classList = 'pdfViewer';
  container.appendChild(pdfViewerElement);

  const eventBus = new PDFViewer.EventBus();

  const linkService = new PDFViewer.PDFLinkService({ eventBus });

  const findController = new PDFViewer.PDFFindController({
    eventBus,
    linkService,
  });

  const viewer = new PDFViewer.PDFViewer({ container, eventBus, linkService, findController });

  const pdfDoc = await pdfjs.getDocument(url).promise;
  viewer.setDocument(pdfDoc);
  linkService.setViewer(viewer);
  linkService.setDocument(pdfDoc, null);

  eventBus.on('pagesinit', () => {
    viewer.currentScaleValue = 'page-width';
  });

  // eventBus.on('updatefindcontrolstate', data => {
  //   console.log('EB', data);
  // });

  return {
    search(query) {
      findController.executeCommand('find', {
        query,
        phraseSearch: true,
      });
    },
    element: container,
  };
}
