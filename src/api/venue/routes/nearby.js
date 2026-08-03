'use strict';

/**
 * Custom venue routes.
 *
 * The file name matters: route files are loaded in alphabetical order and
 * "nearby.js" comes before "venue.js", so /venues/nearby is matched before
 * the core /venues/:documentId route.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/venues/nearby',
      handler: 'venue.nearby',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
