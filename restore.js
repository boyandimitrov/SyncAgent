const fs = require('fs');
const path = require ('path');

const inputDir = './db';
const outputDir = './db_output';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Read all files from the input directory
fs.readdirSync(inputDir).forEach((file) => {
    // Only process .json files
    if (path.extname(file) === '.json') {
        // Read the JSON file
        const searchOutput = JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf-8'));

        let bulkData = "";
        searchOutput.hits.hits.forEach(hit => {
            // Indexing operation
            const indexOperation = {
                index: {
                    _index: hit._index,
                    _id: hit._id,
                },
            };
    
            // Corresponding document
            const document = hit._source;
    
            bulkData += `${JSON.stringify(indexOperation)}\n${JSON.stringify(document)}\n`;
        })
    
        // Write the transformed data to a new file in the output directory
        const outputFilename = 'output' + path.basename(file, '.json') + '.json';
        fs.writeFileSync(path.join(outputDir, outputFilename), bulkData);


        //exec in future
        //curl -s -H "Content-Type: application/x-ndjson" -XPOST localhost:9200/_bulk --data-binary output.json
    }
});


// let bulkData = "";
// searchOutput.hits.hits.forEach(hit => {
//   // Indexing operation
//   const indexOperation = {
//     index: {
//       _index: hit._index,
//       _id: hit._id,
//     },
//   };

//   // Corresponding document
//   const document = hit._source;

//   bulkData += `${JSON.stringify(indexOperation)}\n${JSON.stringify(document)}\n`;
// });

// // Add trailing newline required by Bulk API
// bulkData += '\n';
// //bulkOperations.push('');

// // Write to output file
// //fs.writeFileSync('bulkOperations.json', bulkOperations.join('\n'));
// fs.writeFileSync(path.join(__dirname, 'output.json'), bulkData);