const jwt = require("jsonwebtoken");
const pool = require("../transport/pool");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.sendStatus(401);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const query = {
      text: 'SELECT * FROM users WHERE username = $1 AND id = $2',
      values: [decoded.username, decoded.id],
    };
    const result = await pool.query(query);
    if (result.rows.length === 0) {
      return res.sendStatus(403);
    }
  } catch (err) {
    console.error(`Invalid token or user ${err.name}`)
    return res.sendStatus(403)
  } finally {
    next();
  }

}

async function blacklistToken(req, res, next) {
  const token = req.headers['authorization'].split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const query = {
    text: 'INSERT INTO blacklist (token, user_id) VALUES ($1, $2)',
    values: [token, decoded.id],
  };
  await pool.query(query);
  next();
}

async function decodeJwt(jwt_token) {
  return jwt.verify(jwt_token, process.env.JWT_SECRET);
}
async function checkBlacklist(req, res, next) {
  const token = req.headers['authorization'].split(' ')[1];
  const query = {
    text: 'SELECT EXISTS(SELECT 1 FROM blacklist WHERE token = $1)',
    values: [token],
  };
  const result = await pool.query(query);
  if (result.rows[0].exists) {
    return res.sendStatus(401);
  }
  next();
}

function generateToken(payload, expiresIn = 3600) {
  // token default lasts 1 hr
  return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: expiresIn});
}

module.exports = {authenticateToken, blacklistToken, generateToken, checkBlacklist, decodeJwt}