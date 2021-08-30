const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PlayerSchema = Schema({
	name: String,
	username: String,
	age: Number,
	yesterday_rank: Number,
	money: Number,
	score: Number,
});

module.exports = mongoose.model("player", PlayerSchema);
