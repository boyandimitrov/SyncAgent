require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { BigQuery } = require("@google-cloud/bigquery");

async function readFiles(folderPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
              console.error('Error reading directory:', err);
              reject(err);
              return;
            }
      
            const csvFiles = files.filter(file => path.extname(file).toLowerCase() === '.csv')
                .map(file => path.basename(file, '.csv'));
            console.log('CSV files:', csvFiles);
            return resolve(csvFiles);
        });
    });
}

async function uploadCsvToBigQuery() {
    // Set up BigQuery client and authenticate using the JSON key file
    const bigquery = new BigQuery({
        projectId: process.env.BQ_ID,
        keyFilename: process.env.BQ_CERT_FILE,
    });

    // Set your dataset ID and table ID
    const datasetId = process.env.BQ_DATASET;
    const csvFolderPath = "./csv";

    let csvFiles = await readFiles(csvFolderPath);

    // Create a new table with auto-detected schema
    const metadata = {
        sourceFormat: "CSV",
        skipLeadingRows: 1,
        autodetect: true,
        quote: '"', // Add this line to specify the quote character
        allowQuotedNewlines: true, // Add this line to allow newlines within quoted fields
        maxBadRecords : 100
    };

    //csvFiles = [csvFiles[0]];
    for ( const csv of csvFiles ) {
        // Load CSV file from local path
        const csvFilePath = path.join(csvFolderPath, `${csv}.csv`);
        const [job] = await bigquery
            .dataset(datasetId)
            .table(csv)
            .load(csvFilePath, metadata);

        console.log(`Job ${job.id} completed.`);

        // Check the job's status for errors
        const errors = job.status.errors;
        if (errors && errors.length > 0) {
            console.log(`Errors in file ${csv}:`);
            errors.forEach((error, index) => {
                console.log(`Error ${index + 1}: ${error.message}`);
            });
        } 
        else {
            console.log(`CSV ${csv} uploaded successfully.`);
        }
    }
}

uploadCsvToBigQuery().catch(console.error);