# POST Endpoint Documentation

## Endpoint: `POST /api/post`

This endpoint supports two operations:

### 1. Update Existing Product Video

**Payload Format:**
```json
{
  "productId": "string (UUID)",
  "videoUrl": "string (valid URL)"
}
```

**Example:**
```json
{
  "productId": "ed25e2e8-4d13-4f4a-bae7-078627be1e55",
  "videoUrl": "https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/new-video.mp4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video URL updated successfully",
  "product": {
    "id": "ed25e2e8-4d13-4f4a-bae7-078627be1e55",
    "title": "Handcrafted Silver Bracelet",
    "description": "Elegant silver bracelet...",
    "price": 89.99,
    "imageUrl": "https://...",
    "videoUrl": "https://...",
    "artisan": "Maria Rodriguez",
    "publishDate": "2025-01-19T..."
  }
}
```

### 2. Create New Product

**Payload Format:**
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

**Example:**
```json
{
  "title": "New Handcrafted Item",
  "description": "A beautiful new piece created with traditional techniques",
  "price": 125.50,
  "artisanId": "12345678-1234-1234-1234-123456789abc",
  "videoUrl": "https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/new-product-video.mp4",
  "imageUrl": "https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/new-product-image.jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "id": "new-uuid-generated",
    "title": "New Handcrafted Item",
    "description": "A beautiful new piece...",
    "price": 125.50,
    "imageUrl": "https://...",
    "videoUrl": "https://...",
    "artisan": "Artisan Name",
    "publishDate": "2025-01-19T..."
  }
}
```

## Error Responses

### 400 Bad Request
- Missing required fields
- Invalid UUID format
- Invalid URL format
- Invalid price (must be positive number)

### 404 Not Found
- Product not found (for updates)
- Artisan not found (for creates)

### 500 Internal Server Error
- Database errors
- Unexpected server errors

## Notes

- All UUIDs must be in standard UUID format
- URLs are validated for proper format
- If `imageUrl` is not provided when creating, a default image will be used
- Price must be a positive number
- The endpoint automatically detects whether you're updating or creating based on the presence of `productId` vs `title/description/price`
