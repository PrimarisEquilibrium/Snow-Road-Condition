// models.cjs
const { Sequelize, DataTypes } = require('sequelize');

// For demo: using SQLite in a file named "database.sqlite"
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
  logging: false, // set to true if you want SQL logs in console
});

// Define User model
const User = sequelize.define('User', {
  // The user's display name (optional field)
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // The user's email (acts like a login identifier)
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  // The user's hashed password
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Define Marker model
const Marker = sequelize.define('Marker', {
  // Marker name/type (e.g., "Pizza Place", "Coffee Shop", etc.)
  markerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Coordinates
  lat: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  lng: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  // Like/dislike counters
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  dislikes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

// Relations: 1 user can have many markers; a marker belongs to 1 user
User.hasMany(Marker, { onDelete: 'CASCADE' });
Marker.belongsTo(User);

module.exports = {
  sequelize,
  User,
  Marker,
};
