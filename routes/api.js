const express = require('express');
const {Pool} = require("pg");
const {hash, compare} = require('bcrypt');
const router = express.Router();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});


router.get('/exams', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exam_classes');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/modules', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM modules');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/questions/count', async (req, res) => {
    const { exam_id, module_id, collection_id } = req.query;
    try {
        const sendResponse = async (query, params) => {
            const result = await pool.query(query, params);
            res.json(parseInt(result.rows[0].count));
        }
        if (collection_id) {
            const query = 'SELECT COUNT(*) FROM collection_questions WHERE collection_id = $1';
            await sendResponse(query, [collection_id]);
            return
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

router.get('/questions', async (req, res) => {
    const { exam_id, module_id, collection_id, limit, questions } = req.query;
    try {
        const sendResponse = async (query, params) => {
            const result = await pool.query(query, params);
            res.json(result.rows);
        }
        if (questions) {
            const ids = questions.split(',').map(Number);
            const query = `SELECT * FROM questions WHERE no_question = ANY($1)`;
            await sendResponse(query, [ids]);
            return
        }
        if (collection_id) {
            const query = 'SELECT * FROM questions WHERE no_question IN (SELECT no_question FROM collection_questions WHERE collection_id = $1) ORDER BY RANDOM() LIMIT $2';
            await sendResponse(query, [collection_id, limit]);
            return
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
})

router.get('/collections', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM collection');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

router.post('/history', async (req, res) => {
    const {user_email, exam_id, module_id, collection_id, questions, answers, score} = req.body;
    try {
        const result = await pool.query('INSERT INTO history (user_email, exam_id, module_id, collection_id, questions, answers, score) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [user_email, exam_id, module_id, collection_id, questions, answers, score]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

router.get('/history', async (req, res) => {
    const {user_email} = req.query;
    try {
        const result = await pool.query('SELECT * FROM history WHERE user_email = $1', [user_email]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

router.get('/init', async (req, res) => {
    const appSecret = process.env.APP_SECRET;
    const {secret} = req.query;
    if (secret !== appSecret) {
        res.status(403).json({error: 'Forbidden'});
        return
    }
    try {
        const result = await pool.query('CREATE TABLE IF NOT EXISTS exam_classes (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS modules (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS questions (no_question SERIAL PRIMARY KEY, question VARCHAR(255) NOT NULL, answer VARCHAR(255) NOT NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS question_associations (id SERIAL PRIMARY KEY, exam_class_id INT NOT NULL, module_id INT NOT NULL, no_question INT NOT NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS collection (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS collection_questions (id SERIAL PRIMARY KEY, collection_id INT NOT NULL, no_question INT NOT NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS history (id SERIAL PRIMARY KEY, user_email VARCHAR(255) NOT NULL, exam_id INT NOT NULL, module_id INT, collection_id INT, questions INT[] NOT NULL, answers text[] NOT NULL, score FLOAT NOT NULL, datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        res.json({message: 'Database initialized'});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

module.exports = router;