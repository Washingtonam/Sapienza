import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { syncDefaultRoles } from './models/Role.js';

await connectDatabase();
await syncDefaultRoles();
app.listen(env.PORT, () => console.log(`Sapienza API listening on port ${env.PORT}`));
