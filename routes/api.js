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
    const { exam_id, module_id, collection_id, limit } = req.query;
    try {
        const sendResponse = async (query, params) => {
            const result = await pool.query(query, params);
            res.json(result.rows);
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

router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

router.post('/register', async (req, res) => {
    const {email, password} = req.body;
    try {
        if (!email || !password) {
            res.status(400).json({error: 'Email ou mot de passe manquant'});
            return;
        }

        const result = await pool.query('SELECT * FROM users WHERE username = $1', [email]);
        if (result.rows.length > 0) {
            res.status(400).json({error: 'Email déjà utilisé'});
            return;
        }

        const hashedPassword = await hash(password, 10);
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [email, hashedPassword]);
        res.status(201).json({message: 'User created successfully'});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Erreur interne du serveur'});
    }
});

router.post('/login', async (req, res) => {
    const {username, password} = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            res.status(401).json({error: 'Invalid credentials'});
            return;
        }
        const user = result.rows[0];
        if (await compare(password, user.password)) {
            res.status(200).json({id: user.id, username: user.username});
        } else {
            res.status(401).json({error: 'Invalid credentials'});
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
});


module.exports = router;