import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import crypto from "crypto";

const PROJECT_ID = process.env.PROJECT_ID;
const LOCATION_ID = process.env.LOCATION_ID;
const MODEL_ID = process.env.MODEL_ID;
const API_ENDPOINT = process.env.API_ENDPOINT;

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const GCS_OUTPUT_URI = `gs://${GCS_BUCKET_NAME}/video-outputs/${Date.now()}/`; 

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
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse?.token) throw new Error("Failed to get access token");
    return tokenResponse.token;
}


async function pollForResult(operationName: any, token: any): Promise<string> {
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

        if (data.done) {
            const gcsUri = data.response?.videos?.[0]?.gcsUri;
            if (gcsUri) {
                return gcsUri;
            } 
            if (data.error) {
                throw new Error(`Video generation failed: ${data.error.message}`);
            }
            throw new Error("Operation completed, but no video URI found in response.");
        }
        
        console.log("Video not ready yet... retrying in 10s");
        await new Promise((r) => setTimeout(r, 10000));
    }
}

export async function POST(request: Request) {
    let videoUrl = null; 
    
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        const token = await getAccessToken();
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
                storageUri: GCS_OUTPUT_URI, 
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
        const gcsUri = await pollForResult(operationName, token); 
        videoUrl = gcsUri.replace("gs://", "https://storage.googleapis.com/");
        const timestamp = Date.now();
        const uploadResponse = {
            data: {
                url: videoUrl,
                gcsUri: gcsUri,
                message: "Stored directly to GCS"
            }
        };

        console.log('Upload response:', uploadResponse); // Debug log
        console.log('Extracted video URL (GCS Public):', videoUrl); // Debug log
        
        return NextResponse.json({
            message: "Video generated and stored in GCS successfully",
            uploadResponse: uploadResponse, 
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