const { promisify } = require("util");
const redis = require("redis");

const client = redis.createClient({
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
});

client.on("connect", function () {
	console.log("Redis client connection successful.");
});

client.on("error", function (err) {
	console.log(err);
});

const hmget = promisify(client.hmget).bind(client);
const hmset = promisify(client.hmset).bind(client);
const zscore = promisify(client.zscore).bind(client);
const zadd = promisify(client.zadd).bind(client);
const zrevrange = promisify(client.zrevrange).bind(client);
const zrevrank = promisify(client.zrevrank).bind(client);
const zrangebyscore = promisify(client.zrangebyscore).bind(client);
const zrevrangebyscore = promisify(client.zrevrangebyscore).bind(client);
const zcard = promisify(client.zcard).bind(client);
const zremrangebyrank = promisify(client.zremrangebyrank).bind(client);

module.exports = {
	hmget,
	hmset,
	zscore,
	zadd,
	zrevrange,
	zrevrank,
	zrangebyscore,
	zrevrangebyscore,
	zcard,
	zremrangebyrank,
};
