'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'celesterosa API',
      version: '1.0.0',
      description: 'API e-commerce per negozio di strumenti musicali.',
    },
    servers: [{ url: '/api/v1', description: 'Base path API' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  // I commenti @swagger nelle route alimentano la documentazione.
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
