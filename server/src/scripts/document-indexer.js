const dotenvConfigResult = require('dotenv').config(); // This line of code reads the contents of the .env file in root into the process.env variable.
const { client } = require('../adapters/es/client');

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
        term: { id: documentId }
      }
    }
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
        match_all: {}
      }
    }
  });
  const docs = response.body.hits.hits.map(d => d._source);
  return docs;
};


const updateDocuments = async (index, statements, doc) => {
  const bulk = [];
  for (const stmt of statements) {
    let changed = false;
    for (const ev of stmt._source.evidence) {
      if (ev.document_context.doc_id === doc.id) {
        // copy over new attrs
        ev.document_context.title = doc.title;
        ev.document_context.author = doc.author;
        ev.document_context.publisher_name = doc.publisher_name;
        ev.document_context.publication_date = doc.publiccation_date;
        changed = true;
      }
    }
    if (changed === true) {
      bulk.push({ update: { _index: index, _id: stmt._id } });
      bulk.push({ doc: stmt._source });
    }
  }
  if (bulk.length > 0) {
    const r = await client.bulk({
      body: bulk
    });
    console.log(`has errors ${r.body.errors}`);
  }
};


// Reindex statement.evidence.document_contenxt with respect to doc
const reindex = async (index, doc) => {
  const batchsize = 1000;

  // Scroll interface
  const response = await client.search({
    index: index,
    scroll: '5m',
    size: batchsize,
    body: {
      query: {
        nested: {
          path: 'evidence',
          query: {
            bool: {
              must: [
                { term: { 'evidence.document_context.doc_id': doc.id } }
              ]
            }
          }
        }
      },
      _source: {
        includes: ['id', 'evidence', 'matches_hash']
      }
    }
  });

  const responseQueue = [];
  responseQueue.push(response);

  while (responseQueue.length) {
    const { body } = responseQueue.shift();

    const docs = body.hits.hits;
    if (docs.length === 0) break;

    console.log('processing ... ', docs.length);
    await updateDocuments(index, docs, doc);

    // Get the next response if there are more quotes to fetch
    responseQueue.push(
      await client.scroll({
        scrollId: body._scroll_id,
        scroll: '5m'
      })
    );
  }
};

const run = async () => {
  // 1. Get the document
  const doc = await getDocument(documentId);
  console.log(`Updating document ${doc.id}`);

  // 2. For each knowledge-base, update evidence that points to document
  const kbs = await getElasticDocs('knowledge-base');
  for (const kb of kbs) {
    console.log(`Reindexing ${kb.name}`);

    // Take off readonly
    await client.indices.putSettings({
      index: kb.id,
      body: {
        index: {
          'blocks.write': false,
          'blocks.read_only': false
        }
      }
    });
    await sleep(4000);

    await reindex(kb.id, doc);

    // Restore readonly
    await client.indices.putSettings({
      index: kb.id,
      body: {
        index: {
          'blocks.write': true,
          'blocks.read_only': true
        }
      }
    });
  }

  // 3. For each project, update evidence that points to document
};

run();
