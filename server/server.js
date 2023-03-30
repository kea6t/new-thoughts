const express = require('express');
// import apollo server
const { ApolloServer } = require('apollo-server-express');

// import our typeDefs and resolvers
const { typeDefs, resolvers } = require('./schemas');
const db = require('./config/connection');

const PORT = process.env.PORT || 3001;
// create a new Apollo server and pass it in our schema data
const server = new ApolloServer({
  typeDefs,
  resolvers
});
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Create a new instance of an Apollo server with the GraphQl schema
const startApolloServer = async ( typeDefs, resolvers) => {
  await server.start();
  // integrate our Apollo server with the Express application as middleware
  server.applyMiddleware({ app });


  db.once('open', () => {
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}!`);
      // log where we can go to test GQL API
      console.log(`Use GraphQL at http://localhost:${PORT}${server.graphqlPath} 🔥🌌🌳🦝🚀!`);
    });
  });
};

// Call the async function to the start server
startApolloServer(typeDefs, resolvers);

