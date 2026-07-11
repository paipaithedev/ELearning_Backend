const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const authRouter = require('./routers/authRouter');
const courseRouter = require('./routers/courseRouter');
const enrollmentRouter = require('./routers/enrollmentRouter');
const categoryRouter = require('./routers/categoryRouter');
const chapterRouter = require('./routers/chapterRouter');
const lessonRouter = require('./routers/lessonRouter');
const progressRouter = require('./routers/progressRouter');
const reviewRouter = require('./routers/reviewRouter');
const userRouter = require('./routers/userRouter');
const paymentRouter = require('./routers/paymentRouter');
const uploadRouter = require('./routers/uploadRouter');
const quizRouter = require('./routers/quizRouter');
const certificateRouter = require('./routers/certificateRouter');
const statsRouter = require('./routers/statsRouter');
const announcementRouter = require('./routers/announcementRouter');
const couponRouter = require('./routers/couponRouter');
const logRouter = require('./routers/logRouter');
const payoutRouter = require('./routers/payoutRouter');
const mediaRouter = require('./routers/mediaRouter');
const wishlistRouter = require('./routers/wishlistRouter');
const chatRouter = require('./routers/chatRouter');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();
const app = express();

app.use(cors({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

app.get('/health', (req, res) => {
    res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/courses', courseRouter);
app.use('/api/enrollments', enrollmentRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/chapters', chapterRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/progress', progressRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/users', userRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/certificates', certificateRouter);
app.use('/api/admin/stats', statsRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/logs', logRouter);
app.use('/api/payouts', payoutRouter);
app.use('/api/media', mediaRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/chat', chatRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URI, {
}).then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
})
