const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory user storage (replace with a database in production)
const users = [];

// Secret key for JWT
const JWT_SECRET = 'your-secret-key';

// Register endpoint
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    if (users.find(user => user.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const user = { username, email, password: hashedPassword };
    users.push(user);

    // Generate JWT
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = users.find(user => user.email === email);
    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
});

app.get('/map', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
  }

  // Verify JWT
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
          return res.status(401).json({ message: 'Unauthorized' });
      }

      // If the token is valid, allow access
      res.json({ message: 'Welcome to the map!', user: decoded });
  });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});