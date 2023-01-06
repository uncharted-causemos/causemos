const dotenvConfigResult = require('dotenv').config();
const { client } = require('../adapters/es/client');

if (dotenvConfigResult.error) {
  console.log('No .env file found or has initialization errors - will use default environment');
}

const documentId = process.argv[2];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Get document doc
const getDocument = async (documentId) => {
  const response = await client.search({
    index: 'corpus',
    size: 1,
    body: {
      query: {
        term: { id: documentId },
      },
    },
  });
  const doc = response.body.hits.hits[0]._source;
  return doc;
};

// Get all docs from index
const getElasticDocs = async (index) => {
  const response = await client.search({
    index: index,
    size: 2000,
    body: {
      query: {
        match_all: {},
      },
    },
  });
  const docs = response.body.hits.hits.map((d) => d._source);
  return docs;
};

// const updateDocuments = async (index, statements, doc) => {
//   const bulk = [];
//   for (const stmt of statements) {
//     let changed = false;
//     for (const ev of stmt._source.evidence) {
//       if (ev.document_context.doc_id === doc.id) {
//         // copy over new attrs
//         ev.document_context.title = doc.doc_title;
//         ev.document_context.author = doc.author;
//         ev.document_context.publisher_name = doc.publisher_name;
//         ev.document_context.publication_date = doc.publication_date;
//         changed = true;
//       }
//     }
//     if (changed === true) {
//       bulk.push({ update: { _index: index, _id: stmt._id } });
//       bulk.push({ doc: stmt._source });
//     }
//   }
//   if (bulk.length > 0) {
//     const r = await client.bulk({
//       body: bulk
//     });
//     console.log(`has errors ${r.body.errors}`);
//   }
// };
//
//
// const reindex = async (index, doc) => {
//   const batchsize = 1000;
//
//   // Scroll interface
//   const response = await client.search({
//     index: index,
//     scroll: '5m',
//     size: batchsize,
//     body: {
//       query: {
//         nested: {
//           path: 'evidence',
//           query: {
//             bool: {
//               must: [
//                 { term: { 'evidence.document_context.doc_id': doc.id } }
//               ]
//             }
//           }
//         }
//       },
//       _source: {
//         includes: ['id', 'evidence', 'matches_hash']
//       }
//     }
//   });
//
//   const responseQueue = [];
//   responseQueue.push(response);
//
//   while (responseQueue.length) {
//     const { body } = responseQueue.shift();
//
//     const docs = body.hits.hits;
//     if (docs.length === 0) break;
//
//     console.log('processing ... ', docs.length);
//     await updateDocuments(index, docs, doc);
//
//     // Get the next response if there are more quotes to fetch
//     responseQueue.push(
//       await client.scroll({
//         scrollId: body._scroll_id,
//         scroll: '5m'
//       })
//     );
//   }
// };

// Reindex statement.evidence.document_contenxt with respect to doc
const reindexByScript = async (index, doc) => {
  await client.updateByQuery({
    index: index,
    body: {
      query: {
        nested: {
          path: 'evidence',
          query: {
            bool: {
              must: [{ term: { 'evidence.document_context.doc_id': doc.id } }],
            },
          },
        },
      },
      script: {
        lang: 'painless',
        params: {
          doc_id: doc.id,
          title: doc.doc_title,
          author: doc.author,
          publisher_name: doc.publisher_name,
          publication_date: doc.publication_date,
        },
        source: `
          for (int i=ctx._source.evidence.length-1; i >= 0; i--) {
            if (ctx._source.evidence[i].document_context.doc_id == params.doc_id) {
              ctx._source.evidence[i].document_context.author = params.author;
              ctx._source.evidence[i].document_context.title = params.title;
              ctx._source.evidence[i].document_context.publisher_name = params.publisher_name;
              ctx._source.evidence[i].document_context.publication_date = params.publication_date;
            }
          }
        `,
      },
    },
  });
};

const run = async () => {
  const start = new Date().getTime();

  // 1. Get the document
  const doc = await getDocument(documentId);
  console.log(`Updating indices for document ${doc.id}`);

  // 2. For each knowledge-base, update evidence that points to document
  // knowledge-bases are set to readonly for cloning reasons, we need to flip the setting temporarily
  const kbs = await getElasticDocs('knowledge-base');
  for (const kb of kbs) {
    console.log(`Reindexing ${kb.name}`);

    // Take off readonly
    await client.indices.putSettings({
      index: kb.id,
      body: {
        index: {
          'blocks.write': false,
          'blocks.read_only': false,
        },
      },
    });
    await sleep(2500); // Just to ensure settings take hold

    await reindexByScript(kb.id, doc);

    // Restore readonly
    await client.indices.putSettings({
      index: kb.id,
      body: {
        index: {
          'blocks.write': true,
          'blocks.read_only': true,
        },
      },
    });
  }

  // 3. For each project, update evidence that points to document
  const projects = await getElasticDocs('project');
  for (const project of projects) {
    console.log(`Reindexing ${project.name}`);
    await reindexByScript(project.id, doc);
  }

  const end = new Date().getTime();
  console.log(`Elapsed ${end - start}`);
};

run();
