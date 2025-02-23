// server.cjs
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sequelize, User, Marker } = require('./models.cjs'); // Import your models

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Secret key for JWT
const JWT_SECRET = 'your-secret-key';

// Sync the database
(async () => {
  try {
    await sequelize.sync(); // creates tables if they don't already exist
    console.log('Database synced successfully.');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
})();

/**
 * Helper function to verify JWT from Authorization header.
 * Returns the user record if valid, otherwise null.
 */
async function authenticateUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Find user in DB
    const user = await User.findOne({ where: { email: decoded.email } });
    return user || null;
  } catch (err) {
    return null;
  }
}

// -----------------------------
//       USERS (REGISTER/LOGIN)
// -----------------------------

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in DB
    await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Generate JWT
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (error) {
    console.error('Error in /register:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user in DB
    const user = await User.findOne({ where: { email } });
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
  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test endpoint to verify JWT
app.get('/map', async (req, res) => {
  const user = await authenticateUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  res.json({ message: 'Welcome to the map!', user: user.email });
});

// -----------------------------
//           MARKERS
// -----------------------------

// GET /markers => get ALL markers
app.get('/markers', async (req, res) => {
  try {
    const markers = await Marker.findAll({
      include: {
        model: User,
        attributes: ['username'],
      },
    });
    res.json(markers);
  } catch (error) {
    console.error('Error fetching markers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /markers => create a new marker in the DB
app.post('/markers', async (req, res) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { markerName, lat, lng } = req.body;
    if (!markerName || lat == null || lng == null) {
      return res.status(400).json({ message: 'Missing marker data' });
    }

    // Create in DB
    const newMarker = await Marker.create({
      markerName,
      lat,
      lng,
      UserId: user.id,
    });

    // Option 1: Return just the marker
    // res.status(201).json(newMarker);

    // Option 2: Re-query (or use .reload()) to include the User
    const markerWithUser = await Marker.findByPk(newMarker.id, {
      include: { model: User, attributes: ['username'] },
    });
    res.status(201).json(markerWithUser);

  } catch (error) {
    console.error('Error creating marker:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /markers/:id/like => increment the "likes" count of a marker
app.patch('/markers/:id/like', async (req, res) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find marker by ID
    const marker = await Marker.findByPk(req.params.id);
    if (!marker) {
      return res.status(404).json({ message: 'Marker not found' });
    }

    marker.likes += 1;
    await marker.save();

    res.json(marker);
  } catch (error) {
    console.error('Error liking marker:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /markers/:id/dislike => increment the "dislikes" count of a marker
app.patch('/markers/:id/dislike', async (req, res) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find marker by ID
    const marker = await Marker.findByPk(req.params.id);
    if (!marker) {
      return res.status(404).json({ message: 'Marker not found' });
    }

    marker.dislikes += 1;
    await marker.save();

    res.json(marker);
  } catch (error) {
    console.error('Error disliking marker:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Right-click (contextmenu) remove marker => you could do a DELETE endpoint
app.delete('/markers/:id', async (req, res) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find marker
    const marker = await Marker.findByPk(req.params.id);
    if (!marker) {
      return res.status(404).json({ message: 'Marker not found' });
    }

    // If you only want users to delete their own markers:
    // if (marker.UserId !== user.id) {
    //   return res.status(403).json({ message: 'Forbidden' });
    // }

    await marker.destroy();
    res.json({ message: 'Marker deleted' });
  } catch (error) {
    console.error('Error deleting marker:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
