const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient } = require('mongodb');
const PORT = process.env.PORT || 8080;
let supplementCluster = null;

let uri = process.env.DATABASE_URL;
let mongoClient = new MongoClient(uri);
connectToDB().catch(console.error);

app.use(express.json()); 

app.use(cors({
    origin: '*' 
}));

app.listen(
    PORT, 
    () => console.log(`server running at http://localhost:${PORT}`)
)

async function connectToDB() {
    try {
        let database = mongoClient.db(process.env.DATABASE_NAME);
        let supplements = database.collection(process.env.COLLECTION_NAME);

        if (!supplements) {
             console.log('errors while connecting to MongoDB');
        } else {
            console.log('MONGO CONNECTED!');
            supplementCluster = supplements
        }
    } finally {
        // await mongoClient.close()
    }
}

function handleServerError(res, messageString) {
    res.status(500).send({
        message: messageString 
    })
}

function handleClientError(res, messageString) {
    res.status(400).send({
        message: messageString 
    })
}

app.get('/api/allSupplements', async (req, res) => {
    const options = {
        sort: { name: 1 },
        projection: { name: 1, description: 1, tags: 1 }
    };

    const cursor = supplementCluster.find({}, options);

    if ((await cursor.count()) === 0) {
        console.log('No supplement data found!');
        handleServerError(res, 'Server error retrieving supplement data');
        return;
    } else {
        const allSupplementData = await cursor.toArray();
        res.send(allSupplementData);
    }
})

app.get('/api/allKeywords', async (req, res) => {
    const options = {
        projection: { _id: 0, tags: 1}
    }

    const cursor = supplementCluster.find({}, options);

    if ((await cursor.count()) === 0) {
        console.log('No keyword data found!');
        handleServerError(res, 'Server error retrieving keyword data');
    } else {
        const allKeywordData = await cursor.toArray();
        const allKeywords = [];
        allKeywordData.forEach(keywordObj => {
            allKeywords.push(...keywordObj.tags);
        });

        const allKeywordsFilteredSorted = [...new Set(allKeywords)].sort();  

        res.send(allKeywordsFilteredSorted);
    }
});

app.post('/api/addSupp', async(req, res) => {
    const { name } = req.body;
    const { tags } = req.body;
    const { description } = req.body; 

    if (!name || !tags || tags.length === 0) {
        handleClientError(res, 'Invalid data when adding supplement. Name and tag fields are required, with at least one tag')
        return;
    }

    const recordToInsert = {
        name: name,
        description: description,
        tags: tags
    }

    supplementCluster.insertOne(recordToInsert, (error, response) => {
        if (error) {
            handleServerError(res, error.message);
        } else {
            res.send(recordToInsert);
        }
    });
});