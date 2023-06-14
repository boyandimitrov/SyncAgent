require('dotenv').config();
const importer = require('./core/importer.js')

let run = async() => {
    try {
        importer.fake();
    }
    catch(e) {
        console.error(e);
    }
};

run()
    .then(() => {
        console.log(' RUNNING ');

        //process.exit();
    })
    .catch(err => console.error(err));

exports.run = run;
