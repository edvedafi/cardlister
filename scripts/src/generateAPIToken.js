import 'zx/globals';
import dotenv from 'dotenv';
import Medusa from '@medusajs/medusa-js';
import { ask } from './utils/ask.js';

dotenv.config();

const medusa = new Medusa({ baseUrl: process.env.MEDUSA_BACKEND_URL, maxRetries: 3 });

await medusa.admin.auth.getToken({
  email: await ask('Email: '),
  password: await ask('Password: '),
});
const response = await medusa.admin.users.update('usr_01HWANK5101RHFYAAG9E5X4GDA', {
  api_token: process.env.MEDUSA_ADMIN_KEY,
});
console.log(response.user.api_token);
