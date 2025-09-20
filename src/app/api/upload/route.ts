import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // 1. Validate file existence
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided.' },
        { status: 400 }
      );
    }

    // 2. Validate file type
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
    ];
    if (!allowedMimes.includes(file.type)) {
       return NextResponse.json(
        { success: false, error: `File type ${file.type} not allowed` },
        { status: 400 }
      );
    }
    
    // 3. Validate file size (e.g., 50MB limit)
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds the 50MB limit.' },
        { status: 400 }
      );
    }

    // 4. Convert file to a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 5. Upload to Cloudinary
    // Use a Promise to handle the stream-based upload
    const result: any = await new Promise((resolve, reject) => {
        const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
        
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: resourceType,
                // You can add more options here, like public_id, folders, etc.
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully!',
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        resource_type: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Upload failed', message: errorMessage },
      { status: 500 }
    );
  }
}