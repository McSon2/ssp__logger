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
    type: DataTypes.TEXT,
    allowNull: false,
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
});

// Synchroniser la base de données
sequelize
  .sync()
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
    const logEntry = await Log.create(req.body);
    res.status(201).json(logEntry);
  } catch (error) {
    console.error("Erreur lors de la création du log :", error);
    res.status(500).json({ error: "Erreur lors de la création du log" });
  }
});

// Route pour récupérer les logs
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await Log.findAll({ order: [["timestamp", "DESC"]] });
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
