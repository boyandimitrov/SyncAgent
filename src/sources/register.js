const elastic = require("./es.js");
const bigquery = require("./bq.js");
const firestore = require("./firestore.js");

const SourceDataSources = {
    es: {
        search: elastic.search
    },
    fb: {
        search: firestore.search
    }
};

const TargetDataSources = {
    bq: {
        getLastSyncRecord: bigquery.getLastSyncRecord,
        insertRows: bigquery.insertRows,
        createSchema : bigquery.createSchema
    },
    es: {
        getLastSyncRecord: elastic.getLastSyncRecord,
        insertRows: elastic.insertRows,
        createSchema : elastic.createSchema
    },
    fb: {
        getLastSyncRecord: firestore.getLastSyncRecord,
        insertRows: firestore.insertRows,
        createSchema : firestore.createSchema
    }
};


module.exports = {
    SourceDataSources, TargetDataSources
}