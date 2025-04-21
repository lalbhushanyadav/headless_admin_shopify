import Fastify from 'fastify';
import cors from '@fastify/cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify();
fastify.register(cors, { origin: '*' });

// Root route (to prevent 404 error)
fastify.get('/', async (req, reply) => {
	reply.send({ message: 'Welcome to Shopify Draft Order API!' });
});

// Draft order creation route
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

		const draftEdges = response?.data?.data?.draftOrders?.edges;

		if (!draftEdges) {
			return reply.code(500).send({ error: 'Invalid response from Shopify', raw: response.data });
		}

		const filteredSorted = draftEdges
			.map(edge => edge.node)
			.filter(order => order.email && order.email.toLowerCase() === email.toLowerCase());

		reply.send({ draftOrders: draftEdges });
	} catch (err) {
		reply.code(500).send({ error: 'Failed to fetch draft orders', details: err.message });
	}
});

fastify.listen({ port: 3001 }, () => {
	console.log('Fastify running at http://localhost:3001');
});
