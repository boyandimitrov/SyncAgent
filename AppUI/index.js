require('dotenv').config();

const express = require('express')
const bodyParser = require('body-parser');
const router = require('./core/router.js');

const app = express()
const port = 3200;

app.use( bodyParser.json() );     
app.use(bodyParser.urlencoded({   
    extended: true
}));

app.use('/api', router);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
