import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Solana Trading Bot API',
      version: '1.0.0',
      description: 'API for the Solana Trading Bot',
    },
    servers: [
      {
        url: 'http://localhost:3001',
      },
    ],
  },
  apis: ['./src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
