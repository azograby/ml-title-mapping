import { defineStorage } from '@aws-amplify/backend';
import { vars } from '../global-variables';

// Define the storage resource using Amplify's defineStorage function
export const storage = defineStorage({
  name: vars.ASSET_S3_BUCKET_NAME,
  access: (allow) => ({
    'assets/{entity_id}/*': [
      allow.authenticated.to(['read','write','delete']),
    ],
    'config/{entity_id}/*': [
      allow.authenticated.to(['read','write','delete']),
    ]
  })
});