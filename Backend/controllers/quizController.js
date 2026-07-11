const Quiz = require('../schema/Quiz');
const Question = require('../schema/Question');
const QuizAttempt = require('../schema/QuizAttempt');
const Course = require('../schema/Course');

exports.createQuiz = async (req, res) => {
    try {
        const { courseId, title, description, timeLimit, passScore, settings } = req.body;

        if (!courseId || !title) {
            return res.status(400).json({ success: false, message: 'courseId and title are required.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        const quiz = await Quiz.create({
            courseId,
            title,
            description,
            timeLimit,
            passScore,
            settings: settings || {}
        });

        return res.status(201).json({
            success: true,
            message: 'Quiz created.',
            data: { quiz }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create quiz.',
            error: error.message
        });
    }
};

exports.addQuestion = async (req, res) => {
    try {
        const { quizId, prompt, options, correctIndex, type, points, explanation } = req.body;

        if (!quizId || !prompt || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ success: false, message: 'quizId, prompt, and options are required.' });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const course = await Course.findById(quiz.courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        const question = await Question.create({
            quizId,
            prompt,
            options,
            correctIndex,
            type: type || 'mcq',
            points: points || 1,
            explanation: explanation || ''
        });

        return res.status(201).json({
            success: true,
            message: 'Question added.',
            data: { question }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to add question.',
            error: error.message
        });
    }
};

exports.listQuizQuestions = async (req, res) => {
    try {
        const { quizId } = req.params;
        const questions = await Question.find({ quizId });

        return res.status(200).json({
            success: true,
            message: 'Questions fetched.',
            data: { questions, count: questions.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch questions.',
            error: error.message
        });
    }
};

exports.submitQuiz = async (req, res) => {
    try {
        const { quizId, answers } = req.body;

        if (!quizId || !Array.isArray(answers)) {
            return res.status(400).json({ success: false, message: 'quizId and answers (array) are required.' });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        // ✅ Check attempt limit BEFORE scoring (fix: was checked after)
        if (quiz.settings && quiz.settings.maxAttempts > 0) {
            const attemptsCount = await QuizAttempt.countDocuments({ userId: req.user._id, quizId });
            if (attemptsCount >= quiz.settings.maxAttempts) {
                return res.status(403).json({
                    success: false,
                    message: `You have used all ${quiz.settings.maxAttempts} attempt(s) for this quiz.`
                });
            }
        }

        const questions = await Question.find({ quizId });
        if (!questions.length) {
            return res.status(404).json({ success: false, message: 'No questions found for this quiz.' });
        }

        let totalPoints = 0;
        let earnedPoints = 0;

        questions.forEach((q, idx) => {
            const studentAnswer = answers[idx];
            const qPoints = q.points || 1;
            totalPoints += qPoints;

            if (q.type === 'mcq' || q.type === 'true_false') {
                if (studentAnswer === q.correctIndex) {
                    earnedPoints += qPoints;
                }
            } else if (q.type === 'multi_select') {
                const correctIndices = q.options
                    .map((opt, i) => (opt.isCorrect ? i : -1))
                    .filter((i) => i !== -1);
                
                if (Array.isArray(studentAnswer)) {
                    const isFullyCorrect = 
                        studentAnswer.length === correctIndices.length &&
                        studentAnswer.every((val) => correctIndices.includes(val));
                    
                    if (isFullyCorrect) {
                        earnedPoints += qPoints;
                    }
                }
            } else if (q.type === 'short_answer') {
                if (typeof studentAnswer === 'string' && q.options.some(opt => opt.isCorrect && opt.text.toLowerCase().trim() === studentAnswer.toLowerCase().trim())) {
                    earnedPoints += qPoints;
                }
            }
        });

        const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = score >= (quiz.passScore || 0);

        // ✅ Save answers + points breakdown to the attempt record
        const attempt = await QuizAttempt.create({
            userId: req.user._id,
            quizId,
            score,
            passed,
            earnedPoints,
            totalPoints,
            answers,
            finishedAt: new Date()
        });

        return res.status(200).json({
            success: true,
            message: 'Quiz submitted.',
            data: { 
                score, 
                passed, 
                earnedPoints, 
                totalPoints, 
                attempt,
                questions: quiz.settings?.showFeedback ? questions : undefined
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to submit quiz.',
            error: error.message
        });
    }
};

// Get the current student's attempts for a specific quiz
exports.getMyAttempts = async (req, res) => {
    try {
        const { quizId } = req.params;
        const attempts = await QuizAttempt.find({ userId: req.user._id, quizId })
            .sort({ createdAt: -1 });

        const quiz = await Quiz.findById(quizId);
        const maxAttempts = quiz?.settings?.maxAttempts || 0;
        const attemptsUsed = attempts.length;
        const attemptsRemaining = maxAttempts > 0 ? Math.max(0, maxAttempts - attemptsUsed) : null;

        return res.status(200).json({
            success: true,
            message: 'Attempts fetched.',
            data: { attempts, attemptsUsed, attemptsRemaining, maxAttempts }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch attempts.', error: error.message });
    }
};

// Admin: get all student attempts for a quiz (grade book)
exports.getQuizAttempts = async (req, res) => {
    try {
        const { quizId } = req.params;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

        const course = await Course.findById(quiz.courseId);
        const isAdmin = req.user.role === 'admin';
        const isOwner = course && String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        const attempts = await QuizAttempt.find({ quizId })
            .populate('userId', 'name email profilePicture')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Attempts fetched.',
            data: { attempts, count: attempts.length }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch attempts.', error: error.message });
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const course = await Course.findById(quiz.courseId);
        const isAdmin = req.user.role === 'admin';
        const isOwner = course && String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        const { title, description, timeLimit, passScore, settings } = req.body;
        if (title !== undefined) quiz.title = title;
        if (description !== undefined) quiz.description = description;
        if (timeLimit !== undefined) quiz.timeLimit = timeLimit;
        if (passScore !== undefined) quiz.passScore = passScore;
        if (settings !== undefined) {
            quiz.settings = { ...quiz.settings, ...settings };
        }

        await quiz.save();
        return res.status(200).json({ success: true, message: 'Quiz updated.', data: { quiz } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Update failed.', error: error.message });
    }
};

exports.deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const course = await Course.findById(quiz.courseId);
        const isAdmin = req.user.role === 'admin';
        const isOwner = course && String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        await Quiz.findByIdAndDelete(quiz._id);
        await Question.deleteMany({ quizId: quiz._id });

        return res.status(200).json({ success: true, message: 'Quiz deleted.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Delete failed.', error: error.message });
    }
};

exports.updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        const quiz = await Quiz.findById(question.quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const course = await Course.findById(quiz.courseId);
        const isAdmin = req.user.role === 'admin';
        const isOwner = course && String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        const { prompt, options, correctIndex, type, points, explanation } = req.body;
        if (prompt !== undefined) question.prompt = prompt;
        if (options !== undefined) question.options = options;
        if (correctIndex !== undefined) question.correctIndex = correctIndex;
        if (type !== undefined) question.type = type;
        if (points !== undefined) question.points = points;
        if (explanation !== undefined) question.explanation = explanation;

        await question.save();
        return res.status(200).json({ success: true, message: 'Question updated.', data: { question } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Update failed.', error: error.message });
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        const quiz = await Quiz.findById(question.quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const course = await Course.findById(quiz.courseId);
        const isAdmin = req.user.role === 'admin';
        const isOwner = course && String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        await Question.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: 'Question deleted.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Delete failed.', error: error.message });
    }
};

exports.listAllQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find().populate('courseId', 'title');
        return res.status(200).json({ success: true, message: 'Quizzes fetched.', data: { quizzes, count: quizzes.length } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Fetch failed.', error: error.message });
    }
};

exports.listQuizzesByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const quizzes = await Quiz.find({ courseId });
        return res.status(200).json({
            success: true,
            message: 'Quizzes fetched.',
            data: { quizzes, count: quizzes.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch quizzes.',
            error: error.message
        });
    }
};
