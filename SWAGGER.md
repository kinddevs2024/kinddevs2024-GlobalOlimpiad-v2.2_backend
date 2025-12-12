# Swagger API Documentation

This backend includes Swagger/OpenAPI documentation for all API endpoints.

## Accessing Swagger UI

Once the server is running, you can access the Swagger UI at:

**Swagger UI:** http://localhost:3001/api-docs

**Swagger JSON:** http://localhost:3001/api/swagger.json

## Features

- 📚 **Interactive API Documentation** - View all endpoints with descriptions
- 🧪 **Try It Out** - Test endpoints directly from the browser
- 🔐 **JWT Authentication** - Use the "Authorize" button to add your JWT token
- 📋 **Request/Response Schemas** - See exact data structures
- 📥 **Download Spec** - Export OpenAPI specification

## Using Swagger UI

### 1. View Endpoints

All endpoints are organized by tags:
- **Authentication** - Login, Register, Get Current User
- **Olympiads** - Get olympiads, submit answers, view results
- **Admin** - Admin-only endpoints
- **Owner** - Owner-only endpoints
- **Health** - Health check

### 2. Authenticate

1. Click the **"Authorize"** button at the top
2. Enter your JWT token in the `bearerAuth` field
3. Click **"Authorize"** then **"Close"**
4. Now you can test protected endpoints

### 3. Test Endpoints

1. Click on any endpoint to expand it
2. Click **"Try it out"**
3. Fill in the required parameters/body
4. Click **"Execute"**
5. View the response below

## Adding Documentation to New Endpoints

To add Swagger documentation to a new endpoint, add JSDoc comments above the handler:

```javascript
/**
 * @swagger
 * /your-endpoint:
 *   get:
 *     summary: Brief description
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 */
export default async function handler(req, res) {
  // Your handler code
}
```

## Swagger Configuration

The Swagger configuration is in `lib/swagger.js`. You can customize:
- API title and description
- Server URLs
- Security schemes
- Common schemas

## Example: Testing Login

1. Go to http://localhost:3001/api-docs
2. Find **POST /auth/login**
3. Click **"Try it out"**
4. Enter test credentials:
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```
5. Click **"Execute"**
6. Copy the `token` from the response
7. Click **"Authorize"** and paste the token
8. Now test protected endpoints!

## Troubleshooting

- **Swagger UI not loading?** Make sure the server is running on port 3001
- **Endpoints not showing?** Check that JSDoc comments are properly formatted
- **Authentication not working?** Make sure you're using a valid JWT token
- **CORS errors?** The Swagger UI should work from the same origin as the API

