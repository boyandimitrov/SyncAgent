const express = require('express');
const hash = require('json-hash');

const router = express.Router({mergeParams: true});

const ds_man = require('./db.js');

let memory_hash = {};

// middleware that is specific to this router
router.use((req, res, next) => {
    console.log('Time: ', Date.now())
    const json = Object.assign (req.body, req.query);
    const key = hash.digest(json);
    if (memory_hash[key]) {
        console.log('get from cache');
        return res.send(memory_hash[key]);
    }

    req.hash_key = key;
    next()
})
// define the home page route

router.post('/query', async (req, res) => {
  console.log('request =' + JSON.stringify(req.body))

  const input = req.body;

  const result = await ds_man.query(input);
  // let result = { results : rows};

  memory_hash[req.hash_key] = result;

  res.send(result);
})

router.post('/aggregate', async (req, res) => {
    console.log('request =' + JSON.stringify(req.body))

    const input = req.body;

    try {
        const {rows} = await ds_man.query(input);

        const output = ds_man.aggregate(rows, input);

        const result = { results : output};

        memory_hash[req.hash_key] = result;

        res.send(result);
    }
    catch(e) {
        res.send({err: e});
    }
})

router.post('/distincts', async (req, res) => {
    console.log('request =' + JSON.stringify(req.body))

    const input = req.body;

    try {
        const result = {};

        if ( input.distincts ) {
            result.distincts = await ds_man.get_distincts(input);
        }

        memory_hash[req.hash_key] = result;

        res.send(result);
    }
    catch(e) {
        res.send({err: e});
    }
})

module.exports = router