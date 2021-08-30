const moment = require("moment");
moment.locale("tr");

const {
	hmget,
	hmset,
	zscore,
	zadd,
	zrevrange,
	zrevrank,
	zrangebyscore,
	zrevrangebyscore,
	zcard,
} = require("../redis-settings");

const Player = require("../models/player.model");
const PlayerScore = require("../models/player_score.model");
const PrizePool = require("../models/prize_pool.model");

exports.addScoreToPlayer = async (req, res) => {
	const { player_id, score } = req.body;

	try {
		const playerCount = await Player.count({ _id: player_id }).exec();

		if (playerCount < 1) {
			res.status(404).send({ message: "Player doesn't find.", success: false });
		}
	} catch (error) {
		res.status(500).send({ message: error.message, success: false });
	}

	try {
		const player = await Player.findById(player_id);

		// Oyuncu bilgilerini HashMap'den al.
		const hasMapPlayer = await hmget(player_id, ["username", "age", "yesterday_rank"]);

		// HashMap'de oyuncu kayıtlı değilse kayıt et.
		if (hasMapPlayer[0] === null && hasMapPlayer[1] === null && hasMapPlayer[2] === null)
			await hmset(player_id, {
				username: player.username,
				age: player.age,
				yesterday_rank: player.yesterday_rank ?? 0,
			});

		// Oyuncunun puanını Sorted Set'den al.
		let playerScore = await zscore("leaderboard", player_id);

		// Sorted Set'te oyuncu kayıtlı değilse toplam puanı DB'den al.
		let playerTotalScore;
		if (playerScore === null) playerTotalScore = player.score;
		else playerTotalScore = parseInt(playerScore, 10);

		// Ödül havuzuna gidecek para miktarını hesapla.
		// Oyuncunun alacağı puanını hesapla ve toplam puana ekle.
		const prizePoolMoney = score * 0.02;
		const newScore = score - prizePoolMoney;
		playerTotalScore += newScore;

		// Sorted Set'e oyuncunun puanını kayet et.
		await zadd("leaderboard", playerTotalScore, player_id);

		// Oyuncunun kazandığı puanı DB'ye kayıt et.
		await PlayerScore.create({ player_id, score: newScore });

		// Ödül havuzuna ekleme yap.
		await PrizePool.create({ player_id, value: prizePoolMoney });

		// Oyuncunun kazandığı parayı DB'de güncelle.
		player.money = player.money + newScore;
		player.score = player.score + newScore;
		await player.save();

		res.status(201).send({ message: "Score successfully added to player.", success: true });
	} catch (error) {
		res.status(500).send({ message: error.message, success: false });
	}
};

exports.getLeaderboard = async (req, res) => {
	const { player_id } = req.body;

	try {
		// Leaderboard sorted set'de kayıtlı değilse tüm oyuncuları DB'den getir.
		// DB'deki oyuncu score'larını sorted set'e kayıt et.
		// DB'deki oyuncu bilgileri hash map'de kayıtlı değilse kayıt et.
		const leaderboardRecordCountInTheSortedSet = await zcard("leaderboard");
		if (leaderboardRecordCountInTheSortedSet === 0) {
			const players = await Player.find({});

			await Promise.all(
				players.map(async (player) => {
					await zadd("leaderboard", parseInt(player.score), player._id.toString());

					const hasMapPlayer = await hmget(player._id.toString(), ["username", "age", "yesterday_rank"]);

					if (hasMapPlayer[0] === null && hasMapPlayer[1] === null && hasMapPlayer[2] === null)
						await hmset(player._id.toString(), {
							username: player.username,
							age: player.age,
							yesterday_rank: player.yesterday_rank ?? 0,
						});
				})
			);
		}

		const leaderboard = await zrevrange("leaderboard", 0, 99, "withscores");

		// Leaderboard verileri elde edildi.
		let leaderboardData = [];
		for (let i = 0; i < leaderboard.length; i += 2) {
			let player = await hmget(leaderboard[i], ["username", "age", "yesterday_rank"]);
			const rank = i / 2 + 1;

			let rankChange;
			if (player[2] == 0) {
				rankChange = 0;
			} else {
				rankChange = player[2] - rank;
			}

			leaderboardData.push({
				rank,
				rank_change: rankChange,
				player_id: leaderboard[i],
				username: player[0],
				age: player[1],
				score: leaderboard[i + 1],
			});
		}

		// Mevcut oyuncu verileri elde edildi.
		const currentPlayer = await hmget(player_id, ["username", "age", "yesterday_rank"]);
		const currentPlayerRank = await zrevrank("leaderboard", player_id);
		const currentPlayerScore = await zscore("leaderboard", player_id);

		let currentPlayerData = {
			rank: currentPlayerRank + 1,
			rank_change: currentPlayer[2] == 0 ? 0 : currentPlayer[2] - currentPlayerRank + 1,
			player_id,
			username: currentPlayer[0],
			age: currentPlayer[1],
			score: currentPlayerScore,
		};

		const playersFrontOfTheCurrentPlayer = await zrangebyscore(
			"leaderboard",
			currentPlayerScore,
			"+inf",
			"WITHSCORES",
			"LIMIT",
			0,
			4
		);

		const playersBehindOfTheCurrentPlayer = await zrevrangebyscore(
			"leaderboard",
			currentPlayerScore,
			"-inf",
			"WITHSCORES",
			"LIMIT",
			0,
			3
		);

		// Mevcut oyuncunun önündeki oyuncuların bilgileri alındı.
		let playersOfFront = [];
		for (let i = 2, j = 1; i < playersFrontOfTheCurrentPlayer.length; i += 2, j++) {
			let player = await hmget(playersFrontOfTheCurrentPlayer[i], ["username", "age", "yesterday_rank"]);

			playersOfFront.push({
				player_id: playersFrontOfTheCurrentPlayer[i],
				username: player[0],
				age: player[1],
				score: playersFrontOfTheCurrentPlayer[i + 1],
				rank: currentPlayerData.rank - j,
				yesterday_rank: player[2] == 0 ? 0 : player[2] - rank + 1,
			});
		}

		// // Mevcut oyuncunun arkasındaki oyuncuların bilgileri alındı.
		let playersOfBehind = [];
		for (let i = 2, j = 1; i < playersBehindOfTheCurrentPlayer.length; i += 2, j++) {
			let player = await hmget(playersBehindOfTheCurrentPlayer[i], ["username", "age", "yesterday_rank"]);

			playersOfBehind.push({
				player_id: playersBehindOfTheCurrentPlayer[i],
				username: player[0],
				age: player[1],
				score: playersBehindOfTheCurrentPlayer[i + 1],
				rank: currentPlayerData.rank + j,
				yesterday_rank: player[2] == 0 ? 0 : player[2] - rank + 1,
			});
		}

		res.status(200).send({
			leaderboard: leaderboardData,
			playersOfFront: playersOfFront.reverse(),
			currentPlayer: currentPlayerData,
			playersOfBehind,
			success: true,
		});
	} catch (error) {
		res.status(500).send({ message: error.message, success: false });
	}
};
