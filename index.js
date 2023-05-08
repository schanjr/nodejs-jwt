require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('./transport/pool');
const {authenticateToken, blacklistToken, generateToken, checkBlacklist, decodeJwt} = require('./middlewares/jwt');
const {generateMfaSecret, generateMfaQr} = require('./middlewares/totp');
const otplib = require('otplib');
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true,}));

// Part 1 of assignment
app.post('/token', async (req, res) => {
  const {username, password} = req.body;
  const query = {
    text: 'SELECT * FROM users WHERE username = $1',
    values: [username],
  };
  const result = await pool.query(query);
  if (result.rows.length === 0) {
    return res.sendStatus(401);
  }
  const user = result.rows[0];
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.sendStatus(401);
  }
  const token = generateToken({id: user.id, username: username});
  res.json({"token": {"accessToken": token}});
});

// jwt authenticated route
app.get('/about', authenticateToken, checkBlacklist, (req, res) => {
  res.json({data: 'hello world'});
});

// Part 2 of Assignment
// To securely refresh token, we can have the user
// - visit /logout,
// - blacklist the token,
// - visit /token again to get new token
// - for additional security, we can setup a new endpoint that also generates new jwt token but only if user provides correct MFA
//    route /mfa/generate allow user to create new mfa secret, and route /mfa/authenticate issues new jwt token.
// - we could merge /token and /mfa/authenticate together allowing users to login with and without mfa.
app.post('/logout', authenticateToken, blacklistToken, async (req, res) => {
  res.sendStatus(200);
});

// Ensure higher security if password is compromised. Add MFA Layer.
// Use the token created earlier to visit this endpoint. During Login Page in front end, allow the user to use
// this endpoint to generate MFA secret and let them scan the image.
app.post('/mfa/generate', authenticateToken, async (req, res) => {
  // QR will be generated in Postman, scan it using Duo or Google Authenticator.
  const {user_id, user_name} = req.body;
  const secret = generateMfaSecret();
  const query = {
    text: 'INSERT INTO mfa_secrets (user_id, secret) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET secret = $2 RETURNING *',
    values: [user_id, secret],
  };
  try {
    const result = await pool.query(query);
    if (result.rows.length === 0) {
      return res.sendStatus(404);
    }
    const qr = await generateMfaQr(result.rows[0].user_id, secret);
    const buffer = Buffer.from(qr, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error(`Unable to generate MFA secret for user ${user_id}: ${err}`);
    res.sendStatus(500);
  }
});


app.post('/mfa/authenticate', authenticateToken, async (req, res) => {
  // In postman use POST body payload with the mfa token generated from the Authenticator App
  // {"mfaToken":"354437"}
  const {mfaToken} = req.body;
  if (!mfaToken) {
    return res.sendStatus(400);
  }
  const authHeader = req.headers['authorization'];
  const jwtToken = authHeader && authHeader.split(' ')[1];
  const decoded = await decodeJwt(jwtToken)
  const {id, username} = decoded;
  const query = {
    text: 'SELECT * FROM mfa_secrets WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
    values: [id],
  };
  const query_results = await pool.query(query)
  const mfa_secret = await query_results.rows[0].secret;
  const isValid = otplib.authenticator.check(mfaToken.toString(), mfa_secret);
  if (!isValid) {
    return res.sendStatus(401);
  }
  const token = generateToken({id, username});
  res.json({"token": {"accessToken": token}});
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
