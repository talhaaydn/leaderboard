const faker = require("faker");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Player = require("./models/player.model");

mongoose
	.connect("mongodb://root:pfL5VWkf@localhost:27017/my_game?authSource=admin", { useNewUrlParser: true })
	.then(() => {
		console.log("[INFO] Successfully connected to mongoDB.");

		let playerData = [];

		console.log("[INFO] Fake data are generating.");

		for (let i = 0; i < 1000; i++) {
			const name = faker.name.firstName() + " " + faker.name.lastName();
			const username = faker.internet.userName();
			const age = faker.datatype.number({ min: 10, max: 60 });
			const yesterday_rank = null;
			const money = faker.datatype.number({ min: 10000, max: 100000 });
			const score = faker.datatype.number({ min: 1, max: 10000 });

			playerData.push({
				name,
				username,
				age,
				yesterday_rank,
				money,
				score,
			});
		}

		console.log("[INFO] Fake data generated.");

		Player.insertMany(playerData)
			.then(function () {
				console.log("[INFO] Fake data inserted.");
			})
			.catch(function (error) {
				console.error(error.message);
			});
	})
	.catch((error) => console.error(error));
