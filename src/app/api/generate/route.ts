import fs from "fs";
import path from "path";
import FormData from "form-data";
import axios from "axios";
import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import crypto from "crypto";

const PROJECT_ID = process.env.PROJECT_ID;
const LOCATION_ID = process.env.LOCATION_ID;
const MODEL_ID = process.env.MODEL_ID;
const API_ENDPOINT = process.env.API_ENDPOINT;

const ENC_PATH = path.join(process.cwd(), "service-account.json.enc");
const password = process.env.ENCRYPT_PASSWORD!;
if (!password) throw new Error("ENCRYPT_PASSWORD not set");

function decryptServiceAccount() {
  const encryptedData = fs.readFileSync(ENC_PATH);
  const iv = encryptedData.slice(0, 16);
  const ciphertext = encryptedData.slice(16);

  const key = crypto.scryptSync(password, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // Parse JSON directly in memory
  return JSON.parse(decrypted.toString("utf-8"));
}

const serviceAccount = decryptServiceAccount();

const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function getAccessToken() {
    const client = await auth.getClient(); // automatically reads the JSON file
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse?.token) throw new Error("Failed to get access token");
    return tokenResponse.token;
}

// Helper: poll until video is ready
async function pollForResult(operationName: any, token: any) {
    while (true) {
        const response = await fetch(
            `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}:fetchPredictOperation`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ operationName }),
            }
        );
        const data = await response.json();
        if (data.done && data.response?.videos?.length > 0) {
            return data.response.videos[0].bytesBase64Encoded;
        }
        console.log("Video not ready yet... retrying in 10s");
        await new Promise((r) => setTimeout(r, 10000));
    }
}

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        const token = await getAccessToken();

        // Step 1: Start video generation
        const requestBody = {
            instances: [{ prompt }],
            parameters: {
                aspectRatio: "9:16",
                durationSeconds: 8,
                generateAudio: true,
                personGeneration: "allow_adult",
                resolution: "720p",
                enhancePrompt: true,
                sampleCount: 1,
                addWatermark: true,
            },
        };

        const response = await fetch(
            `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}:predictLongRunning`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            }
        );

        const data = await response.json();
        const operationName = data.name;
        console.log("Started operation:", operationName);

        // Step 2: Poll until video is ready
        const videoBase64 = await pollForResult(operationName, token);

        // Step 3: Save video locally
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        const timestamp = Date.now();
        const fileName = `output-${timestamp}.mp4`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(videoBase64, "base64"));

        // Step 4: Upload to object bucket
        const form = new FormData();
        form.append("file", fs.createReadStream(filePath), fileName);

        const uploadResponse = await axios.post(
            `${process.env.UPLOAD_SERVER_URL}/upload`,
            form,
            {
                headers: form.getHeaders(),
            }
        );

        // Step 5: Delete local file
        fs.unlinkSync(filePath);

        // Step 6: Respond with uploaded video URL
        const videoUrl = (uploadResponse as any)?.data?.data?.url || null;
        console.log('Upload response:', uploadResponse); // Debug log
        console.log('Extracted video URL:', videoUrl); // Debug log
        
        return NextResponse.json({
            message: "Video generated and uploaded successfully",
            uploadResponse: (uploadResponse as any)?.data,
            url: videoUrl,
        });

    } catch (err) {
        console.error(err);
        return NextResponse.json(
            {
                error: "Video generation/upload failed",
                details:
                    typeof err === "object" && err !== null
                        ? (err as any).response?.data || (err as any).message || String(err)
                        : String(err),
            },
            { status: 500 }
        );
    }
}