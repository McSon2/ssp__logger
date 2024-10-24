// index.js
const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser le JSON
app.use(express.json());

// Configurer la base de données avec Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

// Définir le modèle Log
const Log = sequelize.define("Log", {
  level: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT, // Assurez-vous que c'est TEXT pour des messages longs
    allowNull: false,
  },
  details: {
    type: DataTypes.JSONB, // Pour stocker des objets JSON
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  appVersion: {
    type: DataTypes.STRING,
  },
  platform: {
    type: DataTypes.STRING,
  },
  stakeUsername: {
    type: DataTypes.STRING,
  },
  // Autres champs si nécessaire
});

// Synchroniser la base de données
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Base de données synchronisée");
  })
  .catch((error) => {
    console.error(
      "Erreur lors de la synchronisation de la base de données :",
      error
    );
  });

// Route de base
app.get("/", (req, res) => {
  res.send("Backend de collecte des logs est opérationnel.");
});

// Route pour recevoir les logs
app.post("/api/logs", async (req, res) => {
  try {
    const logEntry = await Log.create({
      level: req.body.level,
      message: req.body.message,
      details: req.body.details, // Ajoutez ceci
      timestamp: req.body.timestamp,
      appVersion: req.body.appVersion,
      platform: req.body.platform,
      stakeUsername: req.body.stakeUsername,
    });
    res.status(201).json(logEntry);
  } catch (error) {
    console.error("Erreur lors de la création du log :", error);
    res.status(500).json({ error: "Erreur lors de la création du log" });
  }
});

// Route pour récupérer les logs
app.get("/api/logs", async (req, res) => {
  try {
    const { stakeUsername, level, limit, offset } = req.query;

    const whereClause = {};
    if (stakeUsername) {
      whereClause.stakeUsername = stakeUsername;
    }
    if (level) {
      whereClause.level = level;
    }

    const logs = await Log.findAll({
      where: whereClause,
      order: [["timestamp", "DESC"]],
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json(logs);
  } catch (error) {
    console.error("Erreur lors de la récupération des logs :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des logs" });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
