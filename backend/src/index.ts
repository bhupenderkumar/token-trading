import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { getBalance, getTokenSupply, requestAirdrop } from './api.js';
import { executeTrade } from './trading.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Check if the server is running
 *     responses:
 *       200:
 *         description: Server is running
 */
app.get('/', (req, res) => {
  res.send('Solana Trading Bot Backend is running!');
});

/**
 * @swagger
 * /get-balance:
 *   post:
 *     summary: Get SOL balance for a public key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publicKey:
 *                 type: string
 *               network:
 *                 type: string
 *                 enum: [mainnet, devnet, localnet]
 *     responses:
 *       200:
 *         description: The balance of the account
 *       400:
 *         description: Missing parameters
 *       500:
 *         description: Server error
 */
app.post('/get-balance', async (req, res) => {
    const { publicKey, network } = req.body;
    if (!publicKey || !network) {
        return res.status(400).json({ error: 'publicKey and network are required' });
    }
    try {
        const balance = await getBalance({ publicKey }, network);
        res.json(balance);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

/**
 * @swagger
 * /get-token-supply:
 *   post:
 *     summary: Get the total supply of an SPL token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mint:
 *                 type: string
 *               network:
 *                 type: string
 *                 enum: [mainnet, devnet, localnet]
 *     responses:
 *       200:
 *         description: The token supply
 *       400:
 *         description: Missing parameters
 *       500:
 *         description: Server error
 */
app.post('/get-token-supply', async (req, res) => {
    const { mint, network } = req.body;
    if (!mint || !network) {
        return res.status(400).json({ error: 'mint and network are required' });
    }
    try {
        const supply = await getTokenSupply({ mint }, network);
        res.json(supply);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

/**
 * @swagger
 * /request-airdrop:
 *   post:
 *     summary: Request a SOL airdrop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publicKey:
 *                 type: string
 *               amount:
 *                 type: number
 *               network:
 *                 type: string
 *                 enum: [devnet, localnet]
 *     responses:
 *       200:
 *         description: The airdrop transaction signature
 *       400:
 *         description: Missing parameters
 *       500:
 *         description: Server error
 */
app.post('/request-airdrop', async (req, res) => {
    const { publicKey, amount, network } = req.body;
    if (!publicKey || !amount || !network) {
        return res.status(400).json({ error: 'publicKey, amount, and network are required' });
    }
    try {
        const response = await requestAirdrop({ publicKey, amount }, network);
        res.json(response);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});


/**
 * @swagger
 * /trade:
 *   post:
 *     summary: Execute a trade (placeholder)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pair:
 *                 type: string
 *               amount:
 *                 type: number
 *               side:
 *                 type: string
 *                 enum: [buy, sell]
 *     responses:
 *       200:
 *         description: The result of the trade
 *       400:
 *         description: Missing parameters
 *       500:
 *         description: Server error
 */
app.post('/trade', async (req, res) => {
    const { pair, amount, side } = req.body;
    if (!pair || !amount || !side) {
        return res.status(400).json({ error: 'pair, amount, and side are required' });
    }
    try {
        const response = await executeTrade({ pair, amount, side });
        res.json(response);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
