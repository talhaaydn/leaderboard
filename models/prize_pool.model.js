const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PrizePoolSchema = Schema(
	{
		player_id: { type: Schema.Types.ObjectId, ref: "player" },
		value: Number,
		created_at: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: false }
);

module.exports = mongoose.model("prize-pool", PrizePoolSchema);
