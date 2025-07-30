import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a database table.
=========================================================================*/
const schema = a.schema({
  // JobStatus: a
  //   .model({
  //     sessionId: a.id().required(),
  //     userId: a.string().required(),
  //     createdAt: a.datetime().required(),
  //     executionTime: a.integer().required(),
  //     status: a.string().required(),
  //     message: a.string(),
  //     filename: a.string(),
  //   })
  //   .identifier(['sessionId', 'createdAt'])
  //   .secondaryIndexes((index) => [
  //     index('userId').sortKeys(['createdAt']),
  //   ])
  //   .authorization((allow) => [allow.authenticated().to(['read', 'create', 'update', 'delete'])]),

  FilmTitlesProcessingQueue: a
    .model({
      mamUUID: a.string().required(),
      contentType: a.string(),
      status: a.string(),
      region: a.string(),
      partner: a.string(),
      partnerID: a.string(),
      title: a.string().required(),
      language: a.string(),
      eidr: a.string(),
      imdb: a.string(),
      genre: a.string(),
      subgenre: a.string(),
      category: a.string(),
      subcategory: a.string(),
      releaseDate: a.string(),
      duration: a.integer(),
      productionCountry: a.string(),
      productionYear: a.integer(),
      productionCompany: a.string(),
      rating: a.string(),
      ratingDescriptors: a.string(),
      producers: a.string(),
      directors: a.string(),
      writers: a.string(),
      actors: a.string(),
      shortDescription: a.string().required(),
      longDescription: a.string().required(),
      createdAt: a.datetime().required(),
    })
    .identifier(['mamUUID'])
    .authorization((allow) => [allow.authenticated().to(['read', 'create', 'delete'])]),

  LogOutput: a
    .model({
      sessionId: a.id().required(), // used for displaying log messages
      userId: a.string().required(),
      message: a.string().required(),
      type: a.string(),
      createdAt: a.datetime().required(),
      ttl: a.integer().required(),
    })
    .identifier(['sessionId', 'createdAt'])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['createdAt']),
      index('sessionId').sortKeys(['createdAt']),
    ])
    .authorization((allow) => [allow.authenticated().to(['read', 'create'])]),

    //.authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
