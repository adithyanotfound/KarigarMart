import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create sample artisan users
  const hashedPassword = await bcrypt.hash('password123', 12)

  const artisan1 = await prisma.user.create({
    data: {
      email: 'artisan1@example.com',
      passwordHash: hashedPassword,
      name: 'Maria Rodriguez',
      role: 'ARTISAN',
      paid: true,
      artisanProfile: {
        create: {
          story: 'I\'ve been crafting handmade jewelry for over 15 years, inspired by my grandmother\'s traditional techniques from Mexico. Each piece tells a story of heritage and modern creativity.',
          about: 'Maria is a passionate jewelry designer who combines traditional Mexican techniques with contemporary design. She specializes in sterling silver pieces that celebrate her cultural heritage while appealing to modern tastes.'
        }
      }
    },
    include: {
      artisanProfile: true
    }
  })

  const artisan2 = await prisma.user.create({
    data: {
      email: 'artisan2@example.com',
      passwordHash: hashedPassword,
      name: 'James Chen',
      role: 'ARTISAN',
      paid: true,
      artisanProfile: {
        create: {
          story: 'After a career in tech, I discovered my passion for woodworking. I create unique furniture pieces using sustainable materials and traditional joinery techniques.',
          about: 'James is a former software engineer who found his true calling in woodworking. He creates sustainable furniture using reclaimed materials and traditional joinery techniques, blending modern functionality with timeless craftsmanship.'
        }
      }
    },
    include: {
      artisanProfile: true
    }
  })

  const artisan3 = await prisma.user.create({
    data: {
      email: 'artisan3@example.com',
      passwordHash: hashedPassword,
      name: 'Sophie Laurent',
      role: 'ARTISAN',
      paid: true,
      artisanProfile: {
        create: {
          story: 'Growing up in France, I learned the art of pottery from my mother. My ceramics blend contemporary design with timeless French traditions.',
          about: 'Sophie is a ceramic artist who brings French elegance to functional pottery. Her work combines traditional techniques passed down through generations with contemporary design sensibilities, creating pieces that are both beautiful and practical.'
        }
      }
    },
    include: {
      artisanProfile: true
    }
  })

  // Sample demo videos from the requirements
  const videoUrls = [
    'https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/3f42e166-6ce9-47f0-a4b9-6cf1cbbddc1c.mp4',
    'https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/4be137dc-5450-43e3-a98b-57206a3e6360.mp4',
    'https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/2f185801-a7b3-4548-822e-1cc16aa478fd.mp4',
    'https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/ae41b08a-794c-4131-93e5-d0a82f6df682.mp4',
    'https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/7985448e-5b0c-42fa-ad02-2e924d9ace90.mp4'
  ]

  const imageUrl = 'https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/d2abc28d-2af7-4ef4-a956-c82f84484933.jpeg'

  // Create sample products
  const products = [
    {
      title: 'Handcrafted Silver Bracelet',
      description: 'Elegant silver bracelet with intricate patterns inspired by traditional Mexican designs. Made with 925 sterling silver.',
      price: 89.99,
      artisanId: artisan1.artisanProfile!.id,
      videoUrl: videoUrls[0],
      imageUrl
    },
    {
      title: 'Reclaimed Wood Coffee Table',
      description: 'Beautiful coffee table made from reclaimed oak, featuring natural wood grains and sustainable craftsmanship.',
      price: 499.99,
      artisanId: artisan2.artisanProfile!.id,
      videoUrl: videoUrls[1],
      imageUrl
    },
    {
      title: 'Ceramic Dinner Set',
      description: 'Elegant 4-piece ceramic dinner set with a contemporary French design. Dishwasher and microwave safe.',
      price: 129.99,
      artisanId: artisan3.artisanProfile!.id,
      videoUrl: videoUrls[2],
      imageUrl
    },
    {
      title: 'Turquoise Statement Necklace',
      description: 'Bold turquoise necklace with silver accents, perfect for making a statement. Each stone is hand-selected.',
      price: 149.99,
      artisanId: artisan1.artisanProfile!.id,
      videoUrl: videoUrls[3],
      imageUrl
    },
    {
      title: 'Handwoven Ceramic Bowl',
      description: 'Unique ceramic bowl with organic textures and glazed finish. Perfect for serving or decoration.',
      price: 45.99,
      artisanId: artisan3.artisanProfile!.id,
      videoUrl: videoUrls[4],
      imageUrl
    },
    {
      title: 'Artisan Wooden Cutting Board',
      description: 'Premium walnut cutting board with food-safe finish. Perfect for kitchen prep and serving cheese.',
      price: 75.99,
      artisanId: artisan2.artisanProfile!.id,
      videoUrl: videoUrls[0], // Reusing videos
      imageUrl
    },
    {
      title: 'Delicate Gold Earrings',
      description: 'Minimalist gold earrings with geometric design. 14k gold filled for lasting beauty.',
      price: 65.99,
      artisanId: artisan1.artisanProfile!.id,
      videoUrl: videoUrls[1],
      imageUrl
    },
    {
      title: 'French Ceramic Vase',
      description: 'Elegant ceramic vase with matte white finish. Perfect for fresh or dried flowers.',
      price: 85.99,
      artisanId: artisan3.artisanProfile!.id,
      videoUrl: videoUrls[2],
      imageUrl
    }
  ]

  for (const product of products) {
    await prisma.product.create({
      data: product
    })
  }

  // Create a sample regular user
  await prisma.user.create({
    data: {
      email: 'user@example.com',
      passwordHash: hashedPassword,
      name: 'John Doe',
      role: 'USER',
      paid: true
    }
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
