const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

console.log('Test server starting...');
console.log('PORT:', process.env.PORT);

const app = express();
const PORT = 3000; // Try a different port

app.get('/test', (req, res) => {
  res.json({ message: 'Test server working' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});