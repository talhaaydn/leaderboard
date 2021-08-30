const router = require("express").Router();

const PlayerController = require("../controllers/player.controller");

router.post("/player/add-score", PlayerController.addScoreToPlayer);

router.get("/leaderboard", PlayerController.getLeaderboard);

module.exports = router;
