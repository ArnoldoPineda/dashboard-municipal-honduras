const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

exports.handler = async (event) => {
  try {
    await client.connect();
    const db = client.db('municipios');
    
    // GET /api/municipalities - obtener todos los municipios
    if (event.path.includes('/api/municipalities') && event.httpMethod === 'GET') {
      const municipalities = await db
        .collection('municipalities')
        .find({})
        .toArray();
      
      return {
        statusCode: 200,
        body: JSON.stringify(municipalities)
      };
    }
    
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    await client.close();
  }
};