// index.js
const express = require("express");
const cors = require("cors");
const { Sequelize, DataTypes } = require("sequelize");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

wss.on("listening", () => {
  console.log(`WebSocket server is listening on port ${PORT}`);
});

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
  });
});

wss.clients.forEach((client) => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type: "NEW_LOG", data: logEntry }));
  }
});

function broadcastNewLog(logEntry) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "NEW_LOG", data: logEntry }));
    }
  });
}

// Middleware pour parser le JSON
app.use(express.json());

// Ajouter le middleware CORS
app.use(cors());

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
    console.error("Erreur lors de la synchronisation de la base de données :", error);
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
    broadcastNewLog(logEntry);
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

// Route pour supprimer tous les logs
app.delete("/api/logs", async (req, res) => {
  try {
    await Log.destroy({
      where: {},
      truncate: true, // Utilise truncate pour une suppression rapide et réinitialise les identifiants auto-incrémentés
    });
    res.status(200).json({ message: "Tous les logs ont été supprimés." });
  } catch (error) {
    console.error("Erreur lors de la suppression des logs :", error);
    res.status(500).json({ error: "Erreur lors de la suppression des logs" });
  }
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`HTTP server started on port ${PORT}`);
});
