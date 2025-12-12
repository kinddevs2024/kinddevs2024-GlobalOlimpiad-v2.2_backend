import { swaggerSpec } from '../../lib/swagger.js';

export default function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(swaggerSpec);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

