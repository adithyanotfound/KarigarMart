import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
// NOTE: Use 'speech_v2' client for the latest models like Chirp 3
import { SpeechClient } from "@google-cloud/speech/build/src/v2/speech_client";
import { protos } from "@google-cloud/speech";

// === 1. SERVICE ACCOUNT DECRYPTION AND CLIENT INITIALIZATION ===

// Path to the encrypted service account file
const ENC_PATH = path.join(process.cwd(), "service-account.json.enc");

// NOTE: The environment variable ENCRYPT_PASSWORD must be set
function decryptServiceAccount() {
  const password = process.env.ENCRYPT_PASSWORD;
  if (!password) throw new Error("ENCRYPT_PASSWORD not set");

  const encryptedData = fs.readFileSync(ENC_PATH);
  const iv = encryptedData.slice(0, 16);
  const ciphertext = encryptedData.slice(16);

  const key = crypto.scryptSync(password, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf-8"));
}

let speechClient: SpeechClient | null = null;
let gcpProjectId: string | undefined;

// 🌟 FIX: Use the specific region where the 'karigar-mart' Recognizer exists.
const REGION = "asia-northeast1"; 

try {
  const serviceAccount = decryptServiceAccount();
  gcpProjectId = serviceAccount.project_id;

  // 🌟 FIX: Set the apiEndpoint to the regional endpoint to match the Recognizer resource location.
  speechClient = new SpeechClient({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    apiEndpoint: `${REGION}-speech.googleapis.com`,
  });
} catch (e) {
  console.error("Failed to initialize GCP Speech Client:", e);
}

// === 2. NEXT.JS API ROUTE HANDLER ===

export async function POST(request: NextRequest) {
  if (!speechClient || !gcpProjectId) {
    return NextResponse.json(
      {
        error:
          "GCP Speech Client initialization failed. Check credentials and project ID.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Convert uploaded file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // === GCP STT V2 Transcription (Chirp 3 Model) ===
    let transcription = "";

    try {
      // Recognition config for Chirp 3
      const recognizerConfig: protos.google.cloud.speech.v2.IRecognitionConfig = {
        model: "chirp_3", 
        autoDecodingConfig: {}, 
        languageCodes: ["en-IN", "hi-IN"], 
      };

      // Build recognition request
      const sttRequest = {
        // The resource path uses the region defined above, which matches the client endpoint.
        // NOTE: Ensure process.env.GCP_PROJECT_ID is set correctly for this to work.
        recognizer: `projects/${gcpProjectId}/locations/${REGION}/recognizers/karigar-mart`,
        
        config: recognizerConfig,
        content: audioBuffer,
      };

      // Perform synchronous recognition
      const [response] = await speechClient.recognize(sttRequest);

      // Extract transcript
      transcription =
        response.results
          ?.map((result) => result.alternatives?.[0]?.transcript)
          .join("\n") || "";
    } catch (gcpErr: any) {
      console.error("GCP STT V2 transcription error:", gcpErr);
      return NextResponse.json(
        { error: gcpErr.details || gcpErr.message || "GCP V2 transcription failed" },
        { status: 502 }
      );
    }

    if (!transcription.trim()) {
      return NextResponse.json(
        { error: "No speech detected in the audio file" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transcription: transcription.trim(),
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to process transcription request" },
      { status: 500 }
    );
  }
}