const User = require('../schema/User');
const Course = require('../schema/Course');
const Enrollment = require('../schema/Enrollment');
const Payment = require('../schema/Payment');
const Category = require('../schema/Category');
const QuizAttempt = require('../schema/QuizAttempt');
const Quiz = require('../schema/Quiz');
const Payout = require('../schema/Payout');

exports.getStats = async (req, res) => {
    try {
        // 1. Basic Counts
        const [totalUsers, totalCourses, totalEnrollments, payments] = await Promise.all([
            User.countDocuments(),
            Course.countDocuments(),
            Enrollment.countDocuments(),
            Payment.find({ status: 'paid' })
        ]);

        const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // 2. Recent Activity (Latest 10 from AuditLog)
        const AuditLog = require('../schema/AuditLog');
        const recentLogs = await AuditLog.find({
            dismissedBy: { $ne: req.user._id }
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'name email avatar');
 
        const recentActivity = await mapLogsToActivities(recentLogs);

        // 2b. Module Counts (Action Required: Pending Items)
        // Note: Pending counts don't usually depend on notification dismissal 
        // as they are real-time status counts. If the user wants dismissal to affect these 
        // we might need to rethink, but typically "Pending Verification" should remain 
        // until verified. However, for "Notifications Badge" in Navbar, we use the dismissal.
        
        const [pendingPayments, pendingPayouts, pendingUsers] = await Promise.all([
            Payment.countDocuments({ status: 'pending' }),
            Payout.countDocuments({ status: 'pending' }),
            User.countDocuments({ status: 'pending' })
        ]);

        const countsMap = {
            'PAYMENTS': pendingPayments,
            'PAYOUTS': pendingPayouts,
            'USERS': pendingUsers
        };

        // 3. Top Courses
        const enrollmentStats = await Enrollment.aggregate([
            { $group: { _id: '$courseId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 4 }
        ]);

        const topCourseIds = enrollmentStats.map(s => s._id);
        const coursesData = await Course.find({ _id: { $in: topCourseIds } });

        const topCourses = enrollmentStats.map(stat => {
            const course = coursesData.find(c => String(c._id) === String(stat._id));
            return {
                id: stat._id,
                title: course?.title || 'Unknown Course',
                students: stat.count,
                rating: 4.8 // Fixed for now as we don't have reviews aggregation yet
            };
        });

        // 4. Revenue Overview (Last 7 Months)
        const revenueAggregation = await Payment.aggregate([
            { $match: { status: 'paid' } },
            {
                $group: {
                    _id: { $month: "$paidAt" },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const revenueData = revenueAggregation
            .filter(item => item._id && item._id >= 1 && item._id <= 12)
            .map(item => ({
                name: months[item._id - 1] || 'Unknown',
                total: item.total
            }));

        // 5. User Growth (Last 6 Months)
        const userAggregation = await User.aggregate([
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        role: "$role"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);

        // Transform user aggregation for chart
        const growthMap = {};
        userAggregation.forEach(item => {
            const mIdx = (item._id && item._id.month) ? item._id.month - 1 : -1;
            if (mIdx < 0 || mIdx > 11) return;
            
            const m = months[mIdx];
            if (!growthMap[m]) growthMap[m] = { name: m, students: 0, instructors: 0 };
            if (item._id.role === 'admin') return; // skip admins
            if (item._id.role === 'instructor') {
                growthMap[m].instructors += item.count;
            } else {
                growthMap[m].students += item.count;
            }
        });

        const userGrowthData = Object.values(growthMap).sort((a, b) => months.indexOf(a.name) - months.indexOf(b.name));

        return res.status(200).json({
            success: true,
            message: 'Stats fetched.',
            data: {
                totalUsers,
                totalCourses,
                totalRevenue,
                totalEnrollments,
                recentActivity,
                topCourses,
                moduleCounts: countsMap,
                revenueData,
                userGrowthData
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch stats.',
            error: error.message
        });
    }
};

exports.getAdvancedStats = async (req, res) => {
    try {
        // 1. Course Completion Rates
        const completionStats = await Enrollment.aggregate([
            {
                $lookup: {
                    from: 'certificates',
                    localField: 'courseId',
                    foreignField: 'courseId',
                    as: 'completed'
                }
            },
            {
                $group: {
                    _id: '$courseId',
                    totalEnrolled: { $sum: 1 },
                    totalCompleted: { $sum: { $size: '$completed' } }
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            { $unwind: '$course' },
            {
                $project: {
                    title: '$course.title',
                    totalEnrolled: 1,
                    totalCompleted: 1,
                    percentage: { 
                        $cond: [
                            { $eq: ['$totalEnrolled', 0] }, 
                            0, 
                            { $multiply: [{ $divide: ['$totalCompleted', '$totalEnrolled'] }, 100] }
                        ] 
                    }
                }
            },
            { $sort: { percentage: -1 } }
        ]);

        // 2. Revenue by Category
        const revenueByCategory = await Payment.aggregate([
            { $match: { status: 'paid' } },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            { $unwind: '$course' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'course.categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$category.name',
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // 3. Quiz Performance
        const quizPerformance = await QuizAttempt.aggregate([
            {
                $group: {
                    _id: '$quizId',
                    attempts: { $sum: 1 },
                    passes: { $sum: { $cond: ['$passed', 1, 0] } },
                    avgScore: { $avg: '$score' }
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'quiz'
                }
            },
            { $unwind: '$quiz' },
            {
                $project: {
                    title: '$quiz.title',
                    attempts: 1,
                    passes: 1,
                    avgScore: 1,
                    passRate: { 
                        $cond: [
                            { $eq: ['$attempts', 0] },
                            0,
                            { $multiply: [{ $divide: ['$passes', '$attempts'] }, 100] }
                        ]
                    }
                }
            },
            { $sort: { passRate: 1 } }
        ]);

        return res.status(200).json({
            success: true,
            message: 'Advanced stats fetched.',
            data: {
                completionStats,
                revenueByCategory,
                quizPerformance
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch advanced stats.',
            error: error.message
        });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const skip = (page - 1) * limit;

        const AuditLog = require('../schema/AuditLog');
        
        // Filter out dismissed notifications for this user
        const query = {
            dismissedBy: { $ne: req.user._id }
        };

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email avatar'),
            AuditLog.countDocuments(query)
        ]);
        const activities = await mapLogsToActivities(logs);

        res.json({
            success: true,
            data: {
                notifications: activities,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Reusable helper to map logs to human-readable activities
async function mapLogsToActivities(logs) {
    const Course = require('../schema/Course');
    return Promise.all(logs.map(async (log) => {
        let readableAction = `${log.action} ${log.module}`;
        let amount = null;
        let coupon = null;
        
        try {
            if (log.details && log.details.startsWith('{')) {
                const details = JSON.parse(log.details);
                
                if (log.module === 'ENROLLMENTS') {
                    let courseTitle = 'a course';
                    if (details.courseId) {
                        const course = await Course.findById(details.courseId).select('title');
                        courseTitle = course?.title || courseTitle;
                    }
                    readableAction = `New Enrollment: ${courseTitle}`;
                    if (details.amount) amount = `${details.amount} ${details.currency || 'MMK'}`;
                    if (details.couponCode) coupon = details.couponCode;
                } else if (log.module === 'PAYMENTS') {
                    if (details.amount) {
                        amount = `${details.amount} ${details.currency || 'MMK'}`;
                        readableAction = `Payment of ${amount} received`;
                    } else {
                        readableAction = 'New payment received';
                    }
                    if (details.couponCode) coupon = details.couponCode;
                } else if (log.module === 'COURSES') {
                    const actionLabel = log.action === 'CREATE' ? 'Created' : 'Updated';
                    readableAction = `${actionLabel} course: ${details.title || ''}`;
                } else if (log.module === 'USERS') {
                    readableAction = `${log.action === 'CREATE' ? 'New user registered' : 'User updated'}: ${details.name || details.email || ''}`;
                }
            } else if (log.details && log.details !== 'No body details') {
                readableAction = log.details;
            }
        } catch (e) {
            // Fallback
        }

        return {
            id: log._id,
            user: log.userId?.name || 'System',
            action: readableAction,
            time: log.createdAt,
            amount,
            coupon,
            module: log.module,
            originalAction: log.action
        };
    }));
}

exports.dismissNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const AuditLog = require('../schema/AuditLog');
        
        await AuditLog.findByIdAndUpdate(id, {
            $addToSet: { dismissedBy: req.user._id }
        });

        res.json({ success: true, message: 'Notification dismissed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to dismiss notification' });
    }
};

exports.dismissAllNotifications = async (req, res) => {
    try {
        const AuditLog = require('../schema/AuditLog');
        
        await AuditLog.updateMany(
            { dismissedBy: { $ne: req.user._id } },
            { $addToSet: { dismissedBy: req.user._id } }
        );

        res.json({ success: true, message: 'All notifications dismissed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to dismiss all notifications' });
    }
};
