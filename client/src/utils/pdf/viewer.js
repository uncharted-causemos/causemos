import _ from 'lodash';

const DEFAULT_WIDTH = 800;

export async function createPDFViewer({ url, contentWidth = DEFAULT_WIDTH }) {
  // lazy load pdfjs lib
  // Set the pdf workerSrc explicitly for firefox
  // For more detail see: https://github.com/mozilla/pdf.js/issues/8204
  const [pdfjs, pdfjsWorker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.entry')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  const pdfDoc = await pdfjs.getDocument(url).promise;

  const container = document.createElement('div');
  container.classList.add('pdf-viewer-container');
  container.style.cssText = `
    height: 100%;
    background-color: #fff;
    text-align: center;
  `;

  const fragment = document.createDocumentFragment();
  const renderContexts = [];
  const pagePromises = _.range(0, pdfDoc.numPages).map(num => pdfDoc.getPage(num + 1));
  const pages = await Promise.all(pagePromises);

  const firstPage = pages[0].getViewport({ scale: 1 });

  const pageWidth = firstPage.width;
  const pageHeight = firstPage.height;
  const pageRatio = pageWidth / pageHeight;

  const canvasWidth = contentWidth * window.devicePixelRatio;
  const canvasHeight = Math.floor(canvasWidth / pageRatio) || 0;
  const scale = canvasWidth / pageWidth;

  pages.forEach(page => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: scale });
    canvas.height = canvasHeight;
    canvas.width = canvasWidth;
    canvas.style.cssText = `
      width: ${contentWidth}px;
      height: ${contentWidth / pageRatio}px;
    `;
    fragment.appendChild(canvas);
    renderContexts.push({ page, ctx, viewport });
  });

  container.appendChild(fragment);

  return {
    element: container,
    async renderPages() {
      for (const context of renderContexts) {
        const { ctx, page, viewport } = context;
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    }
  };
}
