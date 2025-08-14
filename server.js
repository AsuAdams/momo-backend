const express = require("express");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (like index.html) from current folder
app.use(express.static("."));

const consumerKey = "o2AgW4YApUqSJAApAbbpt1Vs9mJ8TgT2";
const consumerSecret = "e2smSWZnmWczukRi";
const subscriptionKey = "8f4e90f3ccfa42faa4428e8e68057b9c"; // replace with your real one
const momoBaseUrl = "https://sandbox.momodeveloper.mtn.com"; 
const targetEnvironment = "sandbox";

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

app.post("/pay", async (req, res) => {
    try {
        const { amount, currency, phone } = req.body;
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
