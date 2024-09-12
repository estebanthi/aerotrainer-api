const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

require('dotenv').config();
const app = express();

const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

app.get('/exams', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exam_classes');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/modules', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM modules');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.get('/questions/count', async (req, res) => {
    const { exam_id, module_id } = req.query;
    try {
        const sendResponse = async (query, params) => {
            const result = await pool.query(query, params);
            res.json(parseInt(result.rows[0].count));
        }
        if (module_id) {
            const query = 'SELECT COUNT(*) FROM question_associations WHERE module_id = $1';
            await sendResponse(query, [module_id]);
            return
        }
        if (exam_id) {
            const query = 'SELECT COUNT(*) FROM question_associations WHERE exam_class_id = $1';
            await sendResponse(query, [exam_id]);
            return
        }
        if (!exam_id && !module_id) {
            const query = 'SELECT COUNT(*) FROM question_associations';
            await sendResponse(query, []);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/questions', async (req, res) => {
    const { exam_id, module_id, limit } = req.query;
    try {
        const sendResponse = async (query, params) => {
            const result = await pool.query(query, params);
            res.json(result.rows);
        }
        if (module_id) {
            const query = 'SELECT * FROM questions WHERE no_question IN (SELECT no_question FROM question_associations WHERE module_id = $1) ORDER BY RANDOM() LIMIT $2';
            await sendResponse(query, [module_id, limit]);
            return
        }
        if (exam_id) {
            const query = 'SELECT * FROM questions WHERE no_question IN (SELECT no_question FROM question_associations WHERE exam_class_id = $1) ORDER BY RANDOM() LIMIT $2';
            await sendResponse(query, [exam_id, limit]);
            return
        }
        if (!exam_id && !module_id) {
            const query = 'SELECT * FROM questions ORDER BY RANDOM() LIMIT $1';
            await sendResponse(query, [limit]);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
