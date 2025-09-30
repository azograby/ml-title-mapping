import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a database table.
=========================================================================*/
const schema = a.schema({
  ProcessingQueue: a
    .model({
      indexName: a.string().required(),
      id: a.id().required(),
      createdAt: a.datetime().required(),
      // during runtime, will create more attributes
    })
    .identifier(['indexName', 'id'])
    .authorization((allow) => [allow.authenticated().to(['read', 'create', 'delete'])]),

  IndexConfig: a
    .model({
      indexName: a.string().required(),
      fileName: a.string().required(),
      vectorFieldList: a.string().array().required(),
      exactFieldList: a.string().array().required(),
      searchConfig: a.string(),
      userId: a.string().required(),
      updatedAt: a.datetime().required(),
      createdAt: a.datetime().required(),
    })
    .identifier(['indexName'])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['createdAt']),
    ])
    .authorization((allow) => [allow.authenticated().to(['read', 'create', 'update', 'delete'])]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});