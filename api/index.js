const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

require('dotenv').config();

const app = express();
const apiRouter = require('../routes/api');

app.use(cors());

const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use('/api', apiRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
