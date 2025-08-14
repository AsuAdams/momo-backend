const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enable CORS for all requests
app.use(cors());

// Parse JSON requests
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Get access token
async function getAccessToken() {
  const url = 'https://sandbox.momodeveloper.mtn.com/collection/token/';
  const auth = Buffer.from(`${process.env.MOMO_USER}:${process.env.MOMO_API_KEY}`).toString('base64');

  try {
    const response = await axios.post(url, null, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Ocp-Apim-Subscription-Key': process.env.MOMO_KEY
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw error;
  }
}

// Payment request endpoint
app.post('/momo-payment', async (req, res) => {
  try {
    const { amount, externalId, payer } = req.body;

    const referenceId = uuidv4();
    const accessToken = await getAccessToken();

    const paymentPayload = {
      amount,
      currency: "UGX", // Fixed currency
      externalId,
      payer,
      payerMessage: "Payment from app",
      payeeNote: "Thank you"
    };

    const url = 'https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay';

    await axios.post(url, paymentPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MOMO_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, referenceId });
  } catch (error) {
    console.error('Error making payment request:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 MoMo backend running on port ${PORT}`));
