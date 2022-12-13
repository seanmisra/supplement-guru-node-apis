const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
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

// get all supplements, all fields including the auto-generated id
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

// get all keywords (i.e. tags) of all supplements in the DB, sorted, non-duplicates
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

// add one supplement; name and tags are required in req body 
app.post('/api/supplement', async(req, res) => {
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

// update one supplement; all fields will be updated
app.put('/api/supplement', async(req, res) => {
    const { name } = req.body;
    const { tags } = req.body;
    const { description } = req.body; 

    const filter = {
        name: name
    }

    const recordToUpdate = {
        name: name,
        description: description,
        tags: tags
    }

    supplementCluster.updateOne(filter, {$set: recordToUpdate}, (error, response) => {
        if (error) {
            handleServerError(res, error.message);
        } else {
            res.send(recordToUpdate);
        }
    })
});

// delete one supplement by name (only one field in the req object -- name -- is required)
app.delete('/api/supplement/:id', async(req, res) => {
    const { id } = req.params;

    const filter = {
        _id: ObjectId(id)
    }

    console.log('id', id)

    supplementCluster.deleteOne(filter, (error, response) => {
        if (error) {
            handleServerError(res, error.message);
        } else {
            const records = response.deletedCount;
            if (records === 0) {
                res.send('Record does not exist, so was not deleted: ' + id);
            } else {
                res.send('Successfully deleted record: ' + id);
            }
        }
    });
});