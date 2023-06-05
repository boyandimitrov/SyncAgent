const elastic = require("./es.js");
const bigquery = require("./bq.js");
const firebase = require("./firebase.js");

const InputDataSources = {
    es: {
        search: elastic.search
    },
    fb: {
        search: firebase.search
    }
};

const OutputDataSources = {
    bq: {
        getLastSyncRecord: bigquery.getLastSyncRecord,
        insertRows: bigquery.insertRows,
    }
};


module.exports = {
    InputDataSources, OutputDataSources
}