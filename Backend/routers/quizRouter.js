const express = require('express');
const quizController = require('../controllers/quizController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');
const quizValidation = require('../validations/quiz');

const router = express.Router();

router.post('/', auth, role('instructor', 'admin'), validate({ body: quizValidation.createQuizBody }), quizController.createQuiz);
router.get('/', auth, role('admin'), quizController.listAllQuizzes);
router.get('/course/:courseId', auth, quizController.listQuizzesByCourse);

// Question-specific routes MUST come before /:id to avoid Express misrouting
router.post('/question', auth, role('instructor', 'admin'), validate({ body: quizValidation.addQuestionBody }), quizController.addQuestion);
router.patch('/question/:id', auth, role('instructor', 'admin'), validate({ body: quizValidation.updateQuestionBody }), quizController.updateQuestion);
router.delete('/question/:id', auth, role('instructor', 'admin'), quizController.deleteQuestion);
router.post('/submit', auth, validate({ body: quizValidation.submitQuizBody }), quizController.submitQuiz);

// Attempt history routes (before /:id)
router.get('/:quizId/my-attempts', auth, quizController.getMyAttempts);
router.get('/:quizId/attempts', auth, role('instructor', 'admin'), quizController.getQuizAttempts);

// Dynamic quiz /:id routes come last
router.get('/:quizId/questions', auth, quizController.listQuizQuestions);
router.patch('/:id', auth, role('instructor', 'admin'), validate({ body: quizValidation.updateQuizBody }), quizController.updateQuiz);
router.delete('/:id', auth, role('instructor', 'admin'), quizController.deleteQuiz);

module.exports = router;
