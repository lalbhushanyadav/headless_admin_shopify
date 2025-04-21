const Fastify = require('fastify');
const cors = require('@fastify/cors');
const axios = require('axios');
const dotenv = require('dotenv');

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
	// console.log("Requested email:", email); // Debugging email

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

		// console.log("Shopify API Response:", JSON.stringify(response.data, null, 2)); // Check the full response

		const draftEdges = response?.data?.data?.draftOrders?.edges;

		if (!draftEdges) {
			return reply.code(500).send({ error: 'Invalid response from Shopify', raw: response.data });
		}

		// Filter by email (case insensitive)
		const filteredSorted = draftEdges
			.map(edge => edge.node)
			.filter(order => order.email && order.email.toLowerCase() === email.toLowerCase()); // Only filter if email exists
		// .sort((a, b) => {
		// 	const aId = parseInt(a.id.split('/').pop());
		// 	const bId = parseInt(b.id.split('/').pop());
		// 	return bId - aId;
		// });


		// Log the result to see if any draft orders match the email
		// console.log("Filtered Orders:", filteredSorted);

		reply.send({ draftOrders: draftEdges });
	} catch (err) {
		reply.code(500).send({ error: 'Failed to fetch draft orders', details: err.message });
	}
});




fastify.listen({ port: 3001 }, () => {
	console.log('Fastify running at http://localhost:3001');
});
