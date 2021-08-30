const cron = require("node-cron");

const Player = require("../models/player.model");
const PrizePool = require("../models/prize_pool.model");

const { hmset, zrevrange, zremrangebyrank } = require("../redis-settings");

module.exports = () => {
	// Her gün saat 00.00'da çalışacak şekilde ayarlandı.
	// Gün sonunda oyuncuların sıralamasını kayıt eder.
	cron.schedule(
		"0 0 * * *",
		async function () {
			console.log("[INFO] Ranking of players are saving.");

			try {
				let leaderboard = await zrevrange("leaderboard", 0, -1);

				for (let i = 0; i < leaderboard.length; i++) {
					await hmset(leaderboard[i], {
						yesterday_rank: i + 1,
					});

					await Player.findByIdAndUpdate(leaderboard[i], {
						yesterday_rank: i + 1,
					});
				}

				console.log("[INFO] Ranking of players successfully saved.");
			} catch (error) {
				console.error("[ERROR] " + error.message);
			}
		},
		{
			scheduled: true,
			timezone: "Turkey",
		}
	);

	// Her pazar 00.00'da çalışacak şekilde ayarlandı.
	// Oyunculara ödül dağıtılır.
	// Sorted Set temizlenir.
	// DB'de yesterday_rank ve score alanları temizlenir.
	// Ödül havuzu temizlenir.
	cron.schedule(
		"0 0 * * 0",
		async function () {
			console.log("[INFO] Players rewards are distributing.");

			try {
				const startOfWeekDate = moment().utc().startOf("week").format("YYYY-MM-DD");
				const endOfWeekDate = moment(startOfWeekDate).add(7, "days").format("YYYY-MM-DD");

				// Hafta boyuncda ödül havuzundaki biriken toplam miktarı bul.
				let totalPrize = await PrizePool.aggregate([
					{ $match: { created_at: { $gte: new Date(startOfWeekDate), $lte: new Date(endOfWeekDate) } } },
					{ $group: { _id: null, total: { $sum: "$value" } } },
				]);
				totalPrize = totalPrize[0].total;

				// Oyuncuların alacağı ödül oranını belirle.
				const firstPlayerReward = totalPrize * 0.2;
				const secondPlayerReward = totalPrize * 0.15;
				const thirdPlayerReward = totalPrize * 0.1;

				totalPrize -= firstPlayerReward + secondPlayerReward + thirdPlayerReward;
				const playerRankTotal = (97 * 98) / 2; // 1 + 2 + 3 + .... + 97
				const rewardRate = totalPrize / playerRankTotal;

				// Oyunculara ödüllerini dağıt.
				let leaderboard = await zrevrange("leaderboard", 0, 99);
				for (let i = 0, j = 100; i < leaderboard.length; i++, j--) {
					let player = await Player.findById(leaderboard[i]);

					if (i == 0) {
						player.money += firstPlayerReward;
					} else if (i == 1) {
						player.money += secondPlayerReward;
					} else if (i == 2) {
						player.money += thirdPlayerReward;
					} else {
						let reward = rewardRate * j;
						player.money += parseFloat(reward.toFixed(2));
					}

					player.save();
				}

				// Sorted Set'de leadearboard temizle.
				await zremrangebyrank("leaderboard", 0, -1);

				// Oyuncuların önceki gün sıralamasını ve hafta boyunca kazandığı puanları sıfırla.
				await Player.updateMany({}, { yesterday_rank: null, score: 0 });

				// Ödül havuzunu temizle.
				await PrizePool.deleteMany({});

				console.log("[INFO] Players rewards distributed.");
			} catch (error) {
				console.error("[ERROR] " + error.message);
			}
		},
		{
			scheduled: true,
			timezone: "Turkey",
		}
	);
};
