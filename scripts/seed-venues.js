'use strict';

/**
 * Imports only the venue seed data into an existing database.
 *
 *   npm run seed:venues
 */

const { seedVenues } = require('./venues');

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  await seedVenues();
  await app.destroy();

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
