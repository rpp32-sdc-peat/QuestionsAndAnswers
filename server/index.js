const express = require('express');
const { dataConverter } = require('./utils/dataConverter.js');
const { questionsConv, answersConv } = dataConverter;
const Redis = require('redis');
const { promisify } = require('util');
const cors = require('cors')
require('dotenv/config');
const client = require('../redis/redis-init.js')

module.exports = (database) => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());

  const GET_ASYNC = promisify(client.get).bind(client);
  const SET_ASYNC = promisify(client.set).bind(client);

  app.get('/qa/questions', async (req, res, next) => {
    const product_id = Number(req.query.product_id);
    try {
      const reply = await GET_ASYNC(`p-${product_id}`)
      if (reply) {
        console.log('using cached data')
        res.status(200).send({
          success: true,
          successMsg: 'Grabbed questions',
          data: JSON.parse(reply)
        })
      } else {
        const questions = await database.getQuestions([product_id]);
        const save = await SET_ASYNC(`p-${product_id}`, JSON.stringify(questions))
        console.log('new key/value cached')
        res.status(200).send({
          success: true,
          successMsg: 'Grabbed questions',
          data: questions
        })
      }
    } catch (err) {
      res.send(err.message)
    }
  })

  app.get('/qa/questions/:question_id/answers', async (req, res) => {
      const question_id = Number(req.params.question_id);
      try {
        const reply = await GET_ASYNC(`p-${question_id}`)
        if (reply) {
          console.log('using cached data')
          res.status(200).send({
            success: true,
            successMsg: `Grabbed answers for question ${question_id}`,
            data: JSON.parse(reply)
          })
        } else {
          const answers = await database.getAnswers([question_id]);
          const save = await SET_ASYNC(`p-${question_id}`, JSON.stringify(answers))
          console.log('new key/value cached')
          res.status(200).send({
            success: true,
            successMsg: `Grabbed answers for question ${question_id}`,
            data: answers
          })
        }
      } catch (err) {
        res.send(err.message)
      }
  })

  app.post('/qa/questions', async (req, res) => {
    try {
      const { product_id, name, email, body, date_written } = req.body;
      if (!name || !email || !body || !product_id) {
        throw err
      }
      const params = [product_id, name, email, body, date_written];
      const question = await database.createQuestion(params);
      res.status(200).send({
        success: true,
        successMsg: 'Posted question to database',
        data: product_id
      })
    } catch (err) {
      res.status(500).send({
        success: false,
        successMsg: 'Failed to post question',
        error: err.message
      })
    }
  })

  app.post('/qa/questions/:question_id/answers', async (req, res) => {
    try {
      const { body, name, email, photos, date_written } = req.body;
      if (!name || !email || !body) {
        throw err
      };
      const question_id = Number(req.params.question_id);
      const params1 = [question_id, name, email, body, date_written];
      const params2 = [question_id, photos]
      const answers = await database.createAnswer(params1);
      const newPhotos = await database.addPhotos(params2);
      res.status(200).send({
        success: true,
        successMsg: `Posted answer for question ${question_id} to database`,
        data: question_id
      })
    } catch (err) {
      res.status(500).send({
        success: false,
        successMsg: 'Failed to post answer',
        error: err.message
      })
    }
  })


  // ========= PUT =======>
  app.put('/qa/questions/:question_id/helpful', async (req, res) => {
    try {
      const question_id = Number(req.params.question_id);
      if (isNaN(question_id)) {
        throw err
      }
      const helpful = await database.markQuestionHelpful([question_id])
      res.status(200).send({
        success: true,
        successMsg: `question ${question_id} marked as helpful`,
        id: question_id
      })
    } catch (err) {
      res.status(500).send({
        success: false,
        successMsg: 'Failed to update question helpfulness',
        error: err.message
      })
    }
  })
  app.put('/qa/questions/:question_id/report', async (req, res) => {
    try {
      const question_id = Number(req.params.question_id);
      if (isNaN(question_id)) {
        throw err
      }
      const report = await database.markQuestionReported([question_id]);
      res.status(200).send({
        success: true,
        successMsg: `question ${question_id} marked as reported`,
        data: question_id
      })
    } catch (err) {
      res.status(500).send({
        success: false,
        successMsg: 'Failed to report question',
        error: err.message
      })
    }
  })
  app.put('/qa/answers/:answer_id/helpful', async (req, res) => {
    try {
      const answer_id = Number(req.params.answer_id);
      if (isNaN(answer_id)) {
        throw err
      }
      const helpful = await database.markAnswerHelpful([answer_id]);
      res.status(200).send({
        success: true,
        successMsg: `answer ${answer_id} marked as helpful`,
        data: answer_id
      })
    } catch (err) {
      res.status(500).send({
        success: false,
        successMsg: 'Failed to put answer',
        error: err.message
      })
    }
  })
  app.put('/qa/answers/:answer_id/report', async (req, res) => {
    try {
      const answer_id = Number(req.params.answer_id);
      if (isNaN(answer_id)) {
        throw err
      }
      const report = await database.markAnswerReported([answer_id]);
      res.status(200).send({
        success: true,
        successMsg: `answer ${answer_id} marked as reported`,
        data: answer_id
      })
    } catch (err) {
      res.status(500).send({
        success: false,
        successMsg: 'Failed to report answer',
        error: err.message
      })
    }
  })
  return app;
}
