const crypto = require("node:crypto");

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

module.exports = { sha256Hex, randomToken };

