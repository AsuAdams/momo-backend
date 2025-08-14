const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// MoMo API environment variables
const PRIMARY_KEY = process.env.PRIMARY_KEY;
const SECONDARY_KEY = process.env.SECONDARY_KEY;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;

const BASE_URL = 'https://sandbox.momodeveloper.mtn.com'; // Change to live when ready

// Generate Access Token
async function generateAccessToken() {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    try {
        const response = await axios.post(
            `${BASE_URL}/collection/token/`,
            {},
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Ocp-Apim-Subscription-Key': PRIMARY_KEY
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error generating access token:', error.response?.data || error.message);
        throw error;
    }
}

// Request to pay
app.post('/pay', async (req, res) => {
    const { amount, phone } = req.body;
    const referenceId = uuidv4();

    try {
        const token = await generateAccessToken();

        await axios.post(
            `${BASE_URL}/collection/v1_0/requesttopay`,
            {
                amount,
                currency: 'UGX',
                externalId: referenceId,
                payer: {
                    partyIdType: 'MSISDN',
                    partyId: phone
                },
                payerMessage: '',
                payeeNote: ''
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'X-Reference-Id': referenceId,
                    'X-Target-Environment': 'sandbox', // Change to 'production' for live
                    'Ocp-Apim-Subscription-Key': PRIMARY_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ success: true, referenceId });
    } catch (error) {
        console.error('Payment request failed:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Payment failed' });
    }
});

// Check payment status
app.get('/status/:referenceId', async (req, res) => {
    const { referenceId } = req.params;

    try {
        const token = await generateAccessToken();
        const response = await axios.get(
            `${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Ocp-Apim-Subscription-Key': PRIMARY_KEY,
                    'X-Target-Environment': 'sandbox'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Status check failed:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Status check failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MoMo backend running on port ${PORT}`);
});
