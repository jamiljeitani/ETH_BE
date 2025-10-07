# ETH Backend - Elite Tutoring Hub

A comprehensive backend API for the Elite Tutoring Hub platform, built with Node.js, Express, and PostgreSQL.

## 🚀 Features

- **User Management**: Student and tutor registration with profile management
- **Authentication**: JWT-based authentication with refresh tokens
- **Session Management**: Online tutoring session scheduling and management
- **Payment Integration**: Stripe payment processing
- **Calendar System**: Integrated calendar for session scheduling
- **File Upload**: Profile pictures and document uploads via ImageKit
- **Email Notifications**: Automated email system for various events
- **Wallet System**: Tutor earnings and payout management
- **Admin Panel**: Comprehensive admin controls and reporting

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: ImageKit
- **Payments**: Stripe
- **Email**: Nodemailer
- **Validation**: Joi

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- ImageKit account (for file uploads)
- Stripe account (for payments)
- SMTP email service

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jamiljeitani/ETH_BE.git
   cd ETH_BE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Create your PostgreSQL database
   # Update database credentials in .env
   ```

5. **Run Migrations**
   ```bash
   node scripts/make-profile-pictures-optional.js
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📁 Project Structure

```
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middlewares/     # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── validators/      # Input validation schemas
├── utils/           # Utility functions
├── scripts/         # Database scripts and migrations
└── uploads/         # File uploads directory
```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Server
PORT=4000
NODE_ENV=development
BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tutoring
DB_USER=postgres
DB_PASS=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
REFRESH_SECRET=your_refresh_secret
REFRESH_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=no-reply@yourdomain.com

# Stripe
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ImageKit
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - User logout

### Students
- `GET /api/v1/students/me` - Get student profile
- `PUT /api/v1/students/me` - Update student profile
- `POST /api/v1/students/upload-avatar` - Upload profile picture

### Tutors
- `GET /api/v1/tutors/me` - Get tutor profile
- `PUT /api/v1/tutors/me` - Update tutor profile
- `POST /api/v1/tutors/upload-avatar` - Upload profile picture

### Sessions
- `GET /api/v1/sessions` - Get sessions
- `POST /api/v1/sessions` - Create session
- `PUT /api/v1/sessions/:id` - Update session

### Payments
- `POST /api/v1/payments/create-checkout` - Create Stripe checkout
- `POST /api/v1/payments/stripe/webhook` - Stripe webhook

## 🔄 Recent Updates

### v1.0.8 - Profile Pictures Made Optional
- ✅ Profile pictures are now optional for both students and tutors
- ✅ Updated database schema to allow null values
- ✅ Updated validation schemas
- ✅ Applied database migration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, email support@elitetutoringhub.com or create an issue in this repository.
