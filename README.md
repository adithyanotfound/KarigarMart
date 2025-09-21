# KarigarMart - Artisan Marketplace Platform

A comprehensive Next.js-based artisan marketplace platform featuring video-first product showcases, AI-powered content processing, and secure authentication. Built with modern web technologies and designed for scalability.

## 🚀 Features

### Core Features
- **🎨 Artisan Onboarding**: Complete profile setup with optional audio recording support
- **🤖 AI-Powered Content Processing**: Automatic transcription and professional text enhancement
- **📹 Video-First Product Showcase**: Upload and display products with rich video content
- **🔐 Secure Authentication**: NextAuth.js integration with role-based access control
- **🛒 Shopping Cart**: Add products to cart and manage purchases
- **📱 Responsive Design**: Modern UI with Tailwind CSS and Framer Motion animations
- **📱 PWA Support**: Progressive Web App capabilities with offline support

### AI Features
- **🎤 Speech-to-Text**: Convert audio recordings to text using Deepgram AI
- **✍️ Text Enhancement**: Automatically rephrase and improve artisan descriptions using Google Gemini
- **🎯 Smart Onboarding**: Optional audio recording for more natural profile creation

### Technical Features
- **🗄️ Database**: PostgreSQL with Prisma ORM
- **☁️ File Storage**: Cloudinary integration for images and videos
- **🔒 Security**: Password hashing with bcrypt, JWT sessions
- **📊 State Management**: React Query for server state management
- **🎨 UI Components**: Radix UI components with custom styling

## 🏗️ Architecture

### User Flow

#### Artisan Onboarding Flow
1. **Sign Up**: New artisans sign up and are automatically redirected to dashboard
2. **Onboarding Guard**: Dashboard checks if onboarding is completed
3. **Forced Onboarding**: If not completed, artisans are redirected to `/onboarding`
4. **Profile Creation**: Complete profile with optional audio recording and AI enhancement
5. **Access Granted**: Once completed, artisans can access all features

#### Security Features
- **Onboarding Enforcement**: Artisans cannot skip onboarding or access protected features
- **Role-Based Access**: Different user roles (USER, ARTISAN) have different access levels
- **Session Management**: Secure authentication with NextAuth.js

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))

### Required API Keys

You'll need accounts and API keys for the following services:

1. **Google AI** - For text summarization and enhancement
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key

2. **Deepgram** - For speech-to-text transcription
   - Visit [Deepgram Console](https://console.deepgram.com/)
   - Create a new API key

3. **Cloudinary** - For file storage (images and videos)
   - Visit [Cloudinary Dashboard](https://cloudinary.com/console)
   - Get your Cloud Name, API Key, and API Secret

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/karigarmart"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"

# Google AI API (Required for text summarization)
GOOGLE_AI_API_KEY="your-google-ai-api-key"

# Deepgram API (Required for speech-to-text)
DEEPGRAM_API_KEY="your-deepgram-api-key"

# Cloudinary Configuration (Required for file uploads)
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

### Environment Variables Explained

- **DATABASE_URL**: PostgreSQL connection string
- **NEXTAUTH_URL**: Your application URL (change for production)
- **NEXTAUTH_SECRET**: Random secret key for JWT signing (generate with `openssl rand -base64 32`)
- **GOOGLE_AI_API_KEY**: Google AI API key for Gemini model
- **DEEPGRAM_API_KEY**: Deepgram API key for speech recognition
- **CLOUDINARY_***: Cloudinary credentials for file storage

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd google-hack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit the environment variables
nano .env.local
```

### 4. Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with initial data
npx prisma db seed
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📚 API Documentation

### Authentication Endpoints

#### Sign Up
- **POST** `/api/auth/signup`
- **Body**: `{ email, password, name, role }`
- **Response**: `{ success: boolean, user: User }`

#### Sign In
- **POST** `/api/auth/signin`
- **Body**: `{ email, password }`
- **Response**: `{ success: boolean, user: User }`

### Artisan Endpoints

#### Onboarding Status
- **GET** `/api/artisan/onboarding/status`
- **Response**: `{ isOnboarded: boolean }`

#### Complete Onboarding
- **POST** `/api/artisan/onboarding`
- **Body**: `{ story, about }`
- **Response**: `{ success: boolean, profile: ArtisanProfile }`

#### Get Artisan Products
- **GET** `/api/artisan/products`
- **Response**: `{ products: Product[] }`

### Product Endpoints

#### Get All Products
- **GET** `/api/products`
- **Query Parameters**: `?page=1&limit=10&search=term`
- **Response**: `{ products: Product[], total: number }`

#### Get Product by ID
- **GET** `/api/products/[id]`
- **Response**: `{ product: Product }`

#### Search Products
- **GET** `/api/products/search`
- **Query Parameters**: `?q=search-term`
- **Response**: `{ products: Product[] }`

#### Create/Update Product
- **POST** `/api/post`
- **Body**: 
  ```json
  {
    "title": "string",
    "description": "string",
    "price": "number",
    "artisanId": "string (UUID)",
    "videoUrl": "string (valid URL)",
    "imageUrl": "string (optional, valid URL)"
  }
  ```
- **Response**: `{ success: boolean, product: Product }`

### AI Endpoints

#### Speech-to-Text
- **POST** `/api/tts`
- **Body**: `FormData` with `audio` file
- **Response**: `{ success: boolean, transcription: string }`

#### Text Summarization
- **POST** `/api/summary`
- **Body**: `{ text: string }`
- **Response**: `{ success: boolean, summary: string }`

### File Upload

#### Upload Files
- **POST** `/api/upload`
- **Body**: `FormData` with `file`
- **Supported Types**: Images (JPEG, PNG, GIF, WebP), Videos (MP4, MOV, AVI, WebM)
- **Size Limit**: 50MB
- **Response**: `{ success: boolean, data: { url: string, public_id: string } }`

### Cart Endpoints

#### Get Cart Items
- **GET** `/api/cart`
- **Response**: `{ items: CartItem[] }`

#### Add to Cart
- **POST** `/api/cart`
- **Body**: `{ productId: string, quantity: number }`
- **Response**: `{ success: boolean, item: CartItem }`

#### Update Cart Item
- **PUT** `/api/cart`
- **Body**: `{ productId: string, quantity: number }`
- **Response**: `{ success: boolean, item: CartItem }`

#### Remove from Cart
- **DELETE** `/api/cart`
- **Body**: `{ productId: string }`
- **Response**: `{ success: boolean }`

### User Profile

#### Get User Profile
- **GET** `/api/user/profile`
- **Response**: `{ user: User }`

#### Update User Profile
- **PUT** `/api/user/profile`
- **Body**: `{ name: string, email: string }`
- **Response**: `{ success: boolean, user: User }`

## 🗄️ Database Schema

### Models

#### User
```prisma
model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(USER)
  createdAt    DateTime @default(now())
  
  artisanProfile ArtisanProfile?
  cartItems      CartItem[]
}
```

#### ArtisanProfile
```prisma
model ArtisanProfile {
  id     String @id @default(uuid()) @db.Uuid
  userId String @unique @db.Uuid
  story  String @db.Text
  about  String @db.Text
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  products Product[]
}
```

#### Product
```prisma
model Product {
  id          String   @id @default(uuid()) @db.Uuid
  artisanId   String   @db.Uuid
  title       String
  description String   @db.Text
  price       Decimal  @db.Decimal(10, 2)
  imageUrl    String
  videoUrl    String
  publishDate DateTime @default(now())
  
  artisan   ArtisanProfile @relation(fields: [artisanId], references: [id], onDelete: Cascade)
  cartItems CartItem[]
}
```

#### CartItem
```prisma
model CartItem {
  id        String @id @default(uuid()) @db.Uuid
  userId    String @db.Uuid
  productId String @db.Uuid
  quantity  Int    @default(1)
  
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([userId, productId])
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy**: Vercel will automatically deploy on push to main branch

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Manual Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set up production database**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Start the production server**:
   ```bash
   npm start
   ```

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint (currently disabled)
- `npm run db:seed` - Seed the database with initial data

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration-name

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio

# Deploy migrations to production
npx prisma migrate deploy
```

### Code Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── onboarding/       # Onboarding page
│   └── ...
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
└── types/                # TypeScript type definitions
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL format
   - Verify database exists

2. **API Key Issues**
   - Verify all API keys are correctly set
   - Check API key permissions and quotas

3. **File Upload Issues**
   - Verify Cloudinary credentials
   - Check file size limits (50MB max)
   - Ensure supported file formats

4. **Authentication Issues**
   - Check NEXTAUTH_SECRET is set
   - Verify NEXTAUTH_URL matches your domain

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page
- Review the [Next.js Documentation](https://nextjs.org/docs)
- Check [Prisma Documentation](https://www.prisma.io/docs)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, email support@karigarmart.com or join our Discord community.

---

**Built with ❤️ using Next.js, Prisma, and modern web technologies.**