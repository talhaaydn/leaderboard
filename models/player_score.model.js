const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PlayerScoreSchema = Schema(
	{
		player_id: { type: Schema.Types.ObjectId, ref: "player" },
		score: Number,
		created_at: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: false }
);

module.exports = mongoose.model("player_score", PlayerScoreSchema);
