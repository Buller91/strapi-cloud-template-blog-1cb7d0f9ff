'use strict';

/**
 * Seeds the bars, restaurants and clubs used by the venue finder app.
 *
 * Unlike the blog seed this one is idempotent: it can run on an existing
 * database and only creates what is missing, so pulling the venue feature into
 * a project that has already been set up still fills the collection.
 */

const { venues } = require('../data/venues.json');

const PUBLIC_ACTIONS = ['find', 'findOne', 'nearby'];

async function grantPublicVenueAccess() {
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) {
    return;
  }

  for (const action of PUBLIC_ACTIONS) {
    const permissionAction = `api::venue.venue.${action}`;
    const existing = await strapi.query('plugin::users-permissions.permission').findOne({
      where: { action: permissionAction, role: publicRole.id },
    });

    if (!existing) {
      await strapi.query('plugin::users-permissions.permission').create({
        data: { action: permissionAction, role: publicRole.id },
      });
    }
  }
}

async function seedVenues() {
  try {
    await grantPublicVenueAccess();

    let created = 0;

    for (const venue of venues) {
      const existing = await strapi.documents('api::venue.venue').findMany({
        filters: { slug: venue.slug },
        status: 'published',
        limit: 1,
      });

      if (existing.length > 0) {
        continue;
      }

      await strapi.documents('api::venue.venue').create({
        data: { ...venue, publishedAt: new Date() },
        status: 'published',
      });

      created += 1;
    }

    if (created > 0) {
      console.log(`Imported ${created} venue(s). Open http://localhost:1337/app to browse them.`);
    }
  } catch (error) {
    console.log('Could not import the venue seed data');
    console.error(error);
  }
}

module.exports = { seedVenues };
