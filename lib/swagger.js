import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Olympiad Platform API',
      version: '1.0.0',
      description: 'Backend API for Online Olympiad Platform',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['student', 'admin', 'owner', 'resolter', 'school-admin', 'school-teacher'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Olympiad: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['test', 'essay', 'mixed'],
            },
            subject: {
              type: 'string',
            },
            startTime: {
              type: 'string',
              format: 'date-time',
            },
            endTime: {
              type: 'string',
              format: 'date-time',
            },
            duration: {
              type: 'number',
              description: 'Duration in seconds',
            },
            status: {
              type: 'string',
              enum: ['draft', 'upcoming', 'active', 'completed'],
            },
            questions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Question',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Question: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            question: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['multiple-choice', 'essay'],
            },
            options: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            correctAnswer: {
              type: 'string',
            },
            points: {
              type: 'number',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            error: {
              type: 'string',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./pages/api/**/*.js'], // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(options);

