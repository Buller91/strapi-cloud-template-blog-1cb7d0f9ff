'use strict';

/**
 *  venue controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

/**
 * Everything the app needs to render a venue card and its detail view.
 * Components holding media have to be populated explicitly in Strapi 5.
 */
const DEFAULT_POPULATE = {
  cover: true,
  gallery: true,
  socials: true,
  openingHours: true,
  reviews: true,
  photos: { populate: ['image'] },
  menu: { populate: ['image'] },
};

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance between two coordinates in kilometers.
 */
function distanceInKm(from, to) {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

module.exports = createCoreController('api::venue.venue', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = { populate: DEFAULT_POPULATE, ...ctx.query };
    return super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query = { populate: DEFAULT_POPULATE, ...ctx.query };
    return super.findOne(ctx);
  },

  /**
   * GET /api/venues/nearby?latitude=..&longitude=..&radius=5&kind=bar&search=..
   *
   * Returns the published venues around a position, closest one first, with
   * the distance in kilometers attached to every entry.
   */
  async nearby(ctx) {
    const { latitude, longitude, radius, kind, search, limit } = ctx.query;

    const origin = {
      latitude: Number.parseFloat(latitude),
      longitude: Number.parseFloat(longitude),
    };

    if (Number.isNaN(origin.latitude) || Number.isNaN(origin.longitude)) {
      return ctx.badRequest('latitude and longitude are required and must be numbers');
    }

    const filters = {};

    if (kind) {
      filters.kind = { $in: String(kind).split(',') };
    }

    if (search) {
      filters.$or = [
        { name: { $containsi: search } },
        { cuisine: { $containsi: search } },
        { district: { $containsi: search } },
        { city: { $containsi: search } },
        { shortDescription: { $containsi: search } },
      ];
    }

    const venues = await strapi.documents('api::venue.venue').findMany({
      filters,
      populate: DEFAULT_POPULATE,
      status: 'published',
      limit: Number.parseInt(limit, 10) || 200,
    });

    const maxRadius = Number.parseFloat(radius);

    const results = venues
      .map((venue) => ({ ...venue, distanceKm: distanceInKm(origin, venue) }))
      .filter((venue) => (Number.isNaN(maxRadius) ? true : venue.distanceKm <= maxRadius))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const sanitized = await this.sanitizeOutput(results, ctx);

    // sanitizeOutput drops unknown keys, so the distance is merged back in.
    const withDistance = sanitized.map((venue, index) => ({
      ...venue,
      distanceKm: Math.round(results[index].distanceKm * 100) / 100,
    }));

    return this.transformResponse(withDistance, {
      pagination: { total: withDistance.length },
      origin,
    });
  },
}));
