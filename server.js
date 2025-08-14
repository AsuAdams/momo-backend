const express = require("express");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // for HTML files

// Store users in memory (username → phone)
const users = {};

// MTN MoMo API credentials
const consumerKey = "o2AgW4YApUqSJAApAbbpt1Vs9mJ8TgT2";
const consumerSecret = "e2smSWZnmWczukRi";
const subscriptionKey = "8f4e90f3ccfa42faa4428e8e68057b9c"; // Replace with your real subscription key
const momoBaseUrl = "https://sandbox.momodeveloper.mtn.com";
const targetEnvironment = "sandbox"; // change to "live" for production

async function getAccessToken() {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const res = await fetch(`${momoBaseUrl}/collection/token/`, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`,
            "Ocp-Apim-Subscription-Key": subscriptionKey
        }
    });
    return res.json();
}

// Signup endpoint
app.post("/signup", (req, res) => {
    const { username, phone } = req.body;
    if (!username || !phone) {
        return res.json({ success: false, message: "Username and phone required" });
    }
    users[username] = phone;
    res.json({ success: true, message: "User registered successfully" });
});

// Payment endpoint
app.post("/buy", async (req, res) => {
    try {
        const { username, amount, currency } = req.body;
        const phone = users[username];

        if (!phone) {
            return res.json({ success: false, message: "User not found. Please sign up first." });
        }

        const tokenData = await getAccessToken();
        if (!tokenData.access_token) {
            return res.json({ success: false, message: "Failed to get access token" });
        }

        const referenceId = uuidv4();
        const paymentRes = await fetch(`${momoBaseUrl}/collection/v1_0/requesttopay`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${tokenData.access_token}`,
                "X-Reference-Id": referenceId,
                "X-Target-Environment": targetEnvironment,
                "Ocp-Apim-Subscription-Key": subscriptionKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount.toString(),
                currency,
                externalId: "123456",
                payer: { partyIdType: "MSISDN", partyId: phone },
                payerMessage: "Stock purchase",
                payeeNote: "Thank you for your purchase"
            })
        });

        if (paymentRes.status === 202) {
            res.json({ success: true, referenceId });
        } else {
            const err = await paymentRes.text();
            res.json({ success: false, message: err });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.listen(8080, () => console.log("✅ Server running on port 8080"));
