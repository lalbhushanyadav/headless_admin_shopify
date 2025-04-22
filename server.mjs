import Fastify from 'fastify';
import cors from '@fastify/cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify();

// CORS setup (adjust frontend URL as needed)
await fastify.register(cors, {
	origin: ['http://localhost:5173', 'https://headless-shopify-rust.vercel.app'],
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	credentials: true
});

// Root route
fastify.get('/', async (req, reply) => {
	reply.send({ message: 'Welcome to Shopify Draft Order API!' });
});

// Draft order creation
fastify.post('/draft-order', async (req, reply) => {
	try {
		const { query, variables } = req.body;

		const response = await axios.post(
			process.env.SHOPIFY_ADMIN_URL,
			{ query, variables },
			{
				headers: {
					'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
					'Content-Type': 'application/json',
				},
			}
		);

		reply.send(response.data);
	} catch (err) {
		reply.code(500).send({ error: 'Shopify draft order failed', details: err.message });
	}
});

// Fetch draft orders by email
fastify.get('/get-draft-orders', async (req, reply) => {
	const email = req.query.email;

	try {
		const query = `
      query {
        draftOrders(first: 50) {
          edges {
            node {
              id
              name
              email
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      price
                      image {
                        url
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

		const response = await axios.post(
			process.env.SHOPIFY_ADMIN_URL,
			{ query },
			{
				headers: {
					'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
					'Content-Type': 'application/json',
				},
			}
		);

		const draftEdges = response?.data?.data?.draftOrders?.edges || [];

		const filtered = draftEdges
			.map(edge => edge.node)
			.filter(order => order.email?.toLowerCase() === email.toLowerCase());

		reply.send({ draftOrders: draftEdges });
	} catch (err) {
		reply.code(500).send({ error: 'Failed to fetch draft orders', details: err.message });
	}
});

// Vercel handler
export default async (req, res) => {
	await fastify.ready();
	fastify.server.emit('request', req, res);
};

// Dev server listener (local only)
if (process.env.NODE_ENV !== 'production') {
	fastify.listen({ port: 3001 }, (err, address) => {
		if (err) throw err;
		console.log(`Fastify running locally at ${address}`);
	});
}
