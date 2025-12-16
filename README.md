# MPASAT Online - Financial Management System

A modern financial management system built with React and SQLite, featuring income/expense tracking, reporting, and multi-currency support.

## Features

- 🔐 Secure user authentication
- 💰 Income and expense tracking
- 📊 Visual reports and analytics
- 💱 Multi-currency support (USD, EUR, FCFA)
- 📱 Responsive design
- 📄 PDF report generation
- 📈 Interactive charts
- 🔄 Real-time updates

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQLite3

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd quick-app
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

## Configuration

1. Create a `.env` file in the backend directory:
```bash
PORT=5000
JWT_SECRET=your-secret-key
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

3. Access the application at `http://localhost:3000`

## Default Credentials

- Username: admin1234
- Password: admin4321

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Income', 'Expense')),
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

## API Endpoints

### Authentication
- POST `/api/login` - User login

### Transactions
- GET `/api/transactions` - Get user transactions
- POST `/api/transactions` - Create new transaction
- GET `/api/transactions/summary` - Get transactions summary

## Technologies Used

### Frontend
- React
- Chart.js
- Material-UI Icons
- jsPDF
- Context API for state management

### Backend
- Node.js
- Express
- SQLite3
- JSON Web Tokens
- bcryptjs for password hashing

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- SQL injection prevention
- Input validation
- Secure session management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request2

## License
Live update

This project is licensed under the MIT License - see the LICENSE file for details. 

Live update-test 14
