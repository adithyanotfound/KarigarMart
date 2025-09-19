# KarigarMart - Artisan Marketplace

This is a [Next.js](https://nextjs.org) project for an artisan marketplace platform with video-first product showcases and AI-powered features.

## Features

- **Artisan Onboarding**: Complete profile setup with audio recording support
- **AI-Powered Text Processing**: Automatic transcription and professional rephrasing
- **Video-First Product Showcase**: Upload and display products with video content
- **Secure Authentication**: NextAuth.js integration with role-based access
- **Shopping Cart**: Add products to cart and manage purchases
- **Responsive Design**: Modern UI with Tailwind CSS and Framer Motion

## AI Features

- **Speech-to-Text**: Convert audio recordings to text using Google's Gemini AI
- **Text Summarization**: Automatically rephrase and improve artisan descriptions
- **Smart Onboarding**: Optional audio recording for more natural profile creation

## User Flow

### Artisan Onboarding Flow
1. **Sign Up**: New artisans sign up and are automatically redirected to dashboard
2. **Onboarding Guard**: Dashboard checks if onboarding is completed
3. **Forced Onboarding**: If not completed, artisans are redirected to `/onboarding`
4. **Profile Creation**: Complete profile with optional audio recording and AI enhancement
5. **Access Granted**: Once completed, artisans can access all features

### Security Features
- **Onboarding Enforcement**: Artisans cannot skip onboarding or access protected features
- **Role-Based Access**: Different user roles have different access levels
- **Session Management**: Secure authentication with NextAuth.js

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Google AI API key (for TTS and summarization features)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# Google AI API Key (required for TTS and summary features)
GOOGLE_AI_API_KEY="your-google-ai-api-key"
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma migrate dev
npx prisma db seed
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

### TTS (Text-to-Speech)
- `POST /api/tts` - Convert audio files to text using Google's Gemini AI

### Summary
- `POST /api/summary` - Generate professional summaries of text content

### Artisan Onboarding
- `POST /api/artisan/onboarding` - Create artisan profile with AI-enhanced descriptions

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
