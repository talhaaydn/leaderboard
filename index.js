const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

var app = express();

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Dotenv Integration
dotenv.config();

app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
	next();
});

mongoose
	.connect(
		`mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_NAME}?authSource=admin`
	)
	.then(() => console.log("MongoDB is working ..."))
	.catch((err) => console.log(err));

// mongoose
// 	.connect("mongodb://root:pfL5VWkf@localhost:27017/my_game?authSource=admin", { useNewUrlParser: true })
// 	.then(() => console.log("MongoDB is working ..."))
// 	.catch((err) => console.log(err));

app.get("/", (req, res) => {
	res.send("Backend is running ...");
});

// Routes
app.use("/api", require("./routes/player.route"));

// Cron Jobs
require("./cron-jobs")();

app.listen(process.env.PORT || 8080, function () {
	console.log("Express server listening on port %d", this.address().port);
});
