# E-Learning API (MVP)

Base URL: `http://localhost:8000`

Auth header: `Authorization: Bearer <token>`

## Auth
- `POST /api/auth/register`
  - Body: `{ name, email, password }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
- `GET /api/auth/me` (auth)
- `POST /api/auth/forgot-password`
  - Body: `{ email }`
- `POST /api/auth/reset-password`
  - Body: `{ token, newPassword }`

## Courses
- `GET /api/courses`
  - Query: `q, categoryId, instructorId, level, language, minPrice, maxPrice, published, page, limit`
- `GET /api/courses/:id`
- `POST /api/courses` (instructor/admin)
- `PATCH /api/courses/:id` (owner/admin)
- `DELETE /api/courses/:id` (owner/admin)

## Categories
- `GET /api/categories`
- `GET /api/categories/:id`
- `POST /api/categories` (admin)
- `PATCH /api/categories/:id` (admin)
- `DELETE /api/categories/:id` (admin)
- `GET /api/categories/:id/children`
- `POST /api/categories/:id/children` (admin)

## Chapters
- `GET /api/chapters/course/:courseId` (auth)
- `POST /api/chapters` (owner/admin)
- `PATCH /api/chapters/:id` (owner/admin)
- `DELETE /api/chapters/:id` (owner/admin)

## Lessons
- `GET /api/lessons/chapter/:chapterId` (auth)
- `POST /api/lessons` (owner/admin)
- `PATCH /api/lessons/:id` (owner/admin)
- `DELETE /api/lessons/:id` (owner/admin)

## Enrollments
- `POST /api/enrollments` (student/admin)
- `GET /api/enrollments/me` (auth)

## Progress
- `POST /api/progress` (auth)
- `GET /api/progress/course/:courseId` (auth)

## Reviews
- `POST /api/reviews` (auth)
- `GET /api/reviews/course/:courseId`

## Payments
- `POST /api/payments` (auth)
- `GET /api/payments/me` (auth)
- `GET /api/payments` (admin)

## Uploads
- `POST /api/uploads/image` (instructor/admin)
  - Form-data: `file` (image)

## Quizzes
- `POST /api/quizzes` (owner/admin)
- `POST /api/quizzes/question` (owner/admin)
- `GET /api/quizzes/:quizId/questions` (auth)
- `POST /api/quizzes/submit` (auth)

## Certificates
- `POST /api/certificates` (auth)
- `GET /api/certificates/me` (auth)

## Users (admin)
- `GET /api/users`
- `PATCH /api/users/:id/role`
- `PATCH /api/users/:id/status`
- `DELETE /api/users/:id`
