/* eslint-env browser */
'use strict';

/**
 * Venue finder – shows bars, restaurants and clubs around a position and
 * opens a detail view with reviews, contact data, socials, photos and prices.
 *
 * Data comes from the Strapi API of this project:
 *   GET /api/venues/nearby?latitude=..&longitude=..&radius=..&kind=..&search=..
 */

var API = '/api/venues';

var DEFAULT_LOCATION = {
  label: 'Berlin, Mitte',
  latitude: 52.5219,
  longitude: 13.4132,
};

var KIND_LABEL = { restaurant: 'Restaurant', bar: 'Bar', club: 'Club' };
var KIND_ICON = { restaurant: '🍽️', bar: '🍸', club: '🎧' };

var DAYS = [
  { key: 'sunday', label: 'Sonntag' },
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
];

var SOCIAL_META = {
  instagram: { icon: '📸', label: 'Instagram' },
  facebook: { icon: '👥', label: 'Facebook' },
  tiktok: { icon: '🎵', label: 'TikTok' },
  x: { icon: '𝕏', label: 'X' },
  youtube: { icon: '▶️', label: 'YouTube' },
  whatsapp: { icon: '💬', label: 'WhatsApp' },
};

var state = {
  location: DEFAULT_LOCATION,
  kind: 'all',
  search: '',
  radius: '5',
  sort: 'distance',
  openNow: false,
  venues: [],
  areas: [],
  menuFilter: 'all',
  loading: false,
};

var el = {
  results: document.getElementById('results'),
  status: document.getElementById('status'),
  search: document.getElementById('search'),
  area: document.getElementById('area'),
  radius: document.getElementById('radius'),
  sort: document.getElementById('sort'),
  openNow: document.getElementById('open-now'),
  locate: document.getElementById('locate'),
  chips: document.querySelectorAll('.chip'),
  detail: document.getElementById('detail'),
  detailBody: document.getElementById('detail-body'),
};

/* ---------------------------------------------------------------- helpers */

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character];
  });
}

function formatNumber(value, decimals) {
  return Number(value).toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPrice(value, currency) {
  return Number(value).toLocaleString('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
  });
}

function formatDistance(km) {
  if (km == null) {
    return '';
  }
  return km < 1 ? Math.round(km * 1000) + ' m' : formatNumber(km, 1) + ' km';
}

/* ------------------------------------------------------------ placeholders */

var GLYPHS = [
  [/pizza/i, '🍕'],
  [/pasta|tagliatelle|nudel/i, '🍝'],
  [/ramen|suppe|nudelsuppe/i, '🍜'],
  [/burger|smash/i, '🍔'],
  [/pommes|fries/i, '🍟'],
  [/fisch|saibling|dorsch|sardin|gambas/i, '🐟'],
  [/brot|sauerteig|brezel|toast/i, '🥖'],
  [/kuchen|zimtschnecke|tiramisu|dessert|künefe|mousse/i, '🍰'],
  [/salat|bowl|gemüse|blumenkohl|vegan/i, '🥗'],
  [/kebap|grill|wurst|schinken/i, '🍢'],
  [/käse|obatzda|ricotta/i, '🧀'],
  [/soleier|rührei|\bei(er)?\b/i, '🥚'],
  [/kaffee|espresso|\blatte\b|mokka|filterkaffee/i, '☕'],
  [/\btee\b|matcha/i, '🍵'],
  [/bier|pils|ipa|stout|pale ale|flight/i, '🍺'],
  [/wein|riesling|chianti|crémant|pét-nat|vermouth|sekt/i, '🍷'],
  [/cocktail|sour|negroni|old fashioned|daiquiri|margarita|spritz|gin|vodka|mule/i, '🍸'],
  [/mate|limonade|saft|wasser|ayran|softdrink|alkoholfrei/i, '🥤'],
  [/korn|kurzer|shot|whisk/i, '🥃'],
];

function glyphFor(text, kind) {
  var haystack = String(text || '');
  for (var i = 0; i < GLYPHS.length; i += 1) {
    if (GLYPHS[i][0].test(haystack)) {
      return GLYPHS[i][1];
    }
  }
  if (kind === 'drink') {
    return '🍹';
  }
  if (kind === 'venue') {
    return '🏙️';
  }
  return '🍽️';
}

/** Deterministic hue so the same caption always gets the same tile colour. */
function hueFor(text) {
  var hash = 0;
  var value = String(text || '');
  for (var i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

/**
 * Renders an uploaded image, an external image URL or – when the venue has no
 * picture yet – a generated tile carrying the caption.
 */
function mediaHtml(source, caption, kind, hideLabel) {
  var url = null;

  if (source && source.image && source.image.url) {
    url = source.image.url;
  } else if (source && source.imageUrl) {
    url = source.imageUrl;
  } else if (source && source.url) {
    url = source.url;
  }

  if (url) {
    return (
      '<div class="media"><img src="' +
      escapeHtml(url) +
      '" alt="' +
      escapeHtml(caption || '') +
      '" loading="lazy" /></div>'
    );
  }

  var hue = hueFor(caption || kind);
  var background =
    'linear-gradient(145deg, hsl(' +
    hue +
    ' 42% 26%), hsl(' +
    ((hue + 40) % 360) +
    ' 38% 15%))';

  return (
    '<div class="media"><div class="ph" style="background:' +
    background +
    '"><span class="ph__glyph">' +
    glyphFor(caption, kind) +
    '</span>' +
    (caption && !hideLabel ? '<span class="ph__label">' + escapeHtml(caption) + '</span>' : '') +
    '</div></div>'
  );
}

/* ------------------------------------------------------------ opening hours */

function minutesOf(time) {
  var parts = String(time || '').split(':');
  var hours = parseInt(parts[0], 10);
  var minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * True when the venue is open right now. Entries whose closing time is smaller
 * than the opening time run past midnight and are therefore also checked
 * against the previous day.
 */
function isOpenNow(venue, now) {
  var hours = venue.openingHours || [];
  if (!hours.length) {
    return null;
  }

  var reference = now || new Date();
  var minutesNow = reference.getHours() * 60 + reference.getMinutes();

  var check = function (dayIndex, offset) {
    var entry = null;
    for (var i = 0; i < hours.length; i += 1) {
      if (hours[i].day === DAYS[dayIndex].key) {
        entry = hours[i];
        break;
      }
    }
    if (!entry || entry.closed) {
      return false;
    }
    var opens = minutesOf(entry.opens);
    var closes = minutesOf(entry.closes);
    if (opens == null || closes == null) {
      return false;
    }
    var end = closes <= opens ? closes + 1440 : closes;
    var current = minutesNow + offset;
    return current >= opens && current < end;
  };

  var today = reference.getDay();
  var yesterday = (today + 6) % 7;

  return check(today, 0) || check(yesterday, 1440);
}

function hoursLabel(entry) {
  if (!entry || entry.closed || !entry.opens || !entry.closes) {
    return 'geschlossen';
  }
  return entry.opens + ' – ' + entry.closes;
}

/* --------------------------------------------------------------- rendering */

function starsHtml(rating) {
  var percentage = Math.max(0, Math.min(5, Number(rating) || 0)) * 20;
  return (
    '<span class="stars"><span class="stars__bg">★★★★★</span>' +
    '<span class="stars__fill" style="width:' +
    percentage +
    '%">★★★★★</span></span>'
  );
}

function ratingHtml(venue) {
  if (!venue.rating) {
    return '<span class="rating"><span class="rating__value">Noch keine Bewertung</span></span>';
  }
  return (
    '<span class="rating">' +
    starsHtml(venue.rating) +
    '<span class="rating__value">' +
    formatNumber(venue.rating, 1) +
    '</span><span>(' +
    formatNumber(venue.reviewCount || 0, 0) +
    ')</span></span>'
  );
}

function priceLevelHtml(level) {
  var value = Math.max(1, Math.min(4, parseInt(level, 10) || 1));
  return (
    '<span class="price-level"><b>' +
    new Array(value + 1).join('€') +
    '</b><span>' +
    new Array(4 - value + 1).join('€') +
    '</span></span>'
  );
}

function openPillHtml(venue) {
  var open = isOpenNow(venue);
  if (open === null) {
    return '';
  }
  return open
    ? '<span class="pill pill--open">● Jetzt geöffnet</span>'
    : '<span class="pill pill--closed">● Geschlossen</span>';
}

function cardHtml(venue) {
  var cover = venue.cover || (venue.photos && venue.photos[0]) || null;
  var coverCaption = (cover && cover.caption) || venue.name;

  return (
    '<button class="card" type="button" data-slug="' +
    escapeHtml(venue.slug) +
    '">' +
    '<div class="card__media">' +
    mediaHtml(cover, coverCaption, venue.kind === 'restaurant' ? 'food' : 'drink') +
    '<div class="card__badges"><span class="pill">' +
    KIND_ICON[venue.kind] +
    ' ' +
    KIND_LABEL[venue.kind] +
    '</span></div>' +
    (venue.distanceKm != null
      ? '<span class="pill card__distance">⌖ ' + formatDistance(venue.distanceKm) + '</span>'
      : '') +
    '<div class="card__status">' +
    openPillHtml(venue) +
    '</div>' +
    '</div>' +
    '<div class="card__body">' +
    '<h2 class="card__title">' +
    escapeHtml(venue.name) +
    '</h2>' +
    '<div class="card__meta">' +
    ratingHtml(venue) +
    '<span>·</span>' +
    priceLevelHtml(venue.priceLevel) +
    '</div>' +
    (venue.cuisine ? '<div class="card__meta"><span>' + escapeHtml(venue.cuisine) + '</span></div>' : '') +
    '<p class="card__desc">' +
    escapeHtml(venue.shortDescription || venue.description || '') +
    '</p>' +
    '<div class="card__meta"><span>📍 ' +
    escapeHtml([venue.district, venue.city].filter(Boolean).join(', ')) +
    '</span></div>' +
    '</div>' +
    '</button>'
  );
}

function contactHtml(venue) {
  var rows = [];
  var address = [venue.address, [venue.postalCode, venue.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  if (address) {
    rows.push(
      '<a href="https://www.openstreetmap.org/?mlat=' +
        venue.latitude +
        '&mlon=' +
        venue.longitude +
        '#map=17/' +
        venue.latitude +
        '/' +
        venue.longitude +
        '" target="_blank" rel="noopener noreferrer">' +
        '<span class="contact__icon">📍</span><span>' +
        escapeHtml(address) +
        '</span><span class="contact__label">Karte</span></a>'
    );
  }

  if (venue.phone) {
    rows.push(
      '<a href="tel:' +
        escapeHtml(venue.phone.replace(/\s+/g, '')) +
        '"><span class="contact__icon">📞</span><span>' +
        escapeHtml(venue.phone) +
        '</span><span class="contact__label">Anrufen</span></a>'
    );
  }

  if (venue.email) {
    rows.push(
      '<a href="mailto:' +
        escapeHtml(venue.email) +
        '"><span class="contact__icon">✉️</span><span>' +
        escapeHtml(venue.email) +
        '</span><span class="contact__label">E-Mail</span></a>'
    );
  }

  if (venue.website) {
    rows.push(
      '<a href="' +
        escapeHtml(venue.website) +
        '" target="_blank" rel="noopener noreferrer">' +
        '<span class="contact__icon">🌐</span><span>' +
        escapeHtml(venue.website.replace(/^https?:\/\//, '')) +
        '</span><span class="contact__label">Website</span></a>'
    );
  }

  if (venue.reservationUrl) {
    rows.push(
      '<a href="' +
        escapeHtml(venue.reservationUrl) +
        '" target="_blank" rel="noopener noreferrer">' +
        '<span class="contact__icon">🗓️</span><span>Tisch oder Ticket buchen</span>' +
        '<span class="contact__label">Reservieren</span></a>'
    );
  }

  return rows.length ? '<div class="contact">' + rows.join('') + '</div>' : '';
}

function socialsHtml(venue) {
  var socials = venue.socials || {};
  var links = Object.keys(SOCIAL_META)
    .filter(function (key) {
      return socials[key];
    })
    .map(function (key) {
      return (
        '<a class="social" href="' +
        escapeHtml(socials[key]) +
        '" target="_blank" rel="noopener noreferrer">' +
        SOCIAL_META[key].icon +
        ' ' +
        SOCIAL_META[key].label +
        '</a>'
      );
    });

  if (!links.length) {
    return '';
  }

  return (
    '<section class="section"><h3 class="section__title">Social Media</h3>' +
    '<div class="socials">' +
    links.join('') +
    '</div></section>'
  );
}

function galleryHtml(venue) {
  var photos = (venue.photos || []).slice();

  (venue.gallery || []).forEach(function (image) {
    photos.push({ image: image, caption: image.caption || image.name, kind: 'venue' });
  });

  if (!photos.length) {
    return '';
  }

  var items = photos
    .map(function (photo) {
      var kindLabel = photo.kind === 'drink' ? '🍹 Getränk' : photo.kind === 'food' ? '🍽️ Essen' : '🏙️ Location';
      return (
        '<figure class="gallery__item" style="margin:0">' +
        mediaHtml(photo, photo.caption, photo.kind, true) +
        '<span class="pill gallery__kind">' +
        kindLabel +
        '</span>' +
        (photo.caption ? '<figcaption class="gallery__caption">' + escapeHtml(photo.caption) + '</figcaption>' : '') +
        '</figure>'
      );
    })
    .join('');

  return (
    '<section class="section"><h3 class="section__title">Bilder vom Essen &amp; von den Getränken</h3>' +
    '<div class="gallery">' +
    items +
    '</div></section>'
  );
}

function menuHtml(venue) {
  var items = (venue.menu || []).filter(function (item) {
    return state.menuFilter === 'all' || item.kind === state.menuFilter;
  });

  if (!(venue.menu || []).length) {
    return '';
  }

  var groups = [];
  var index = {};

  items.forEach(function (item) {
    var section = item.section || 'Karte';
    if (!index[section]) {
      index[section] = [];
      groups.push(section);
    }
    index[section].push(item);
  });

  var body = groups
    .map(function (section) {
      var rows = index[section]
        .map(function (item) {
          return (
            '<div class="menu__item"><div><div class="menu__item-name">' +
            escapeHtml(item.name) +
            (item.popular ? ' <span class="pill">★ beliebt</span>' : '') +
            '</div>' +
            (item.description
              ? '<div class="menu__item-desc">' + escapeHtml(item.description) + '</div>'
              : '') +
            '</div><div class="menu__item-price">' +
            formatPrice(item.price, item.currency || venue.currency) +
            '</div></div>'
          );
        })
        .join('');

      return (
        '<div class="menu__group"><h4 class="menu__group-title">' +
        escapeHtml(section) +
        '</h4>' +
        rows +
        '</div>'
      );
    })
    .join('');

  var tab = function (value, label) {
    return (
      '<button class="chip' +
      (state.menuFilter === value ? ' is-active' : '') +
      '" type="button" data-menu-filter="' +
      value +
      '">' +
      label +
      '</button>'
    );
  };

  var average = venue.averagePrice
    ? '<p class="note">Ø ' + formatPrice(venue.averagePrice, venue.currency) + ' pro Person</p>'
    : '';

  return (
    '<section class="section"><h3 class="section__title">Preise</h3>' +
    '<div class="menu__tabs">' +
    tab('all', 'Alles') +
    tab('food', '🍽️ Essen') +
    tab('drink', '🍹 Getränke') +
    '</div>' +
    (body || '<p class="note">Keine Einträge in dieser Kategorie.</p>') +
    average +
    '</section>'
  );
}

function reviewsHtml(venue) {
  var reviews = venue.reviews || [];

  var summary =
    '<div class="rating-summary"><div class="rating-summary__score">' +
    (venue.rating ? formatNumber(venue.rating, 1) : '–') +
    '</div><div>' +
    starsHtml(venue.rating) +
    '<div class="note" style="margin-top:2px">' +
    formatNumber(venue.reviewCount || 0, 0) +
    ' Bewertungen</div></div>' +
    '<div style="margin-left:auto">' +
    priceLevelHtml(venue.priceLevel) +
    '</div></div>';

  var list = reviews
    .map(function (review) {
      var date = review.date
        ? new Date(review.date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : '';
      return (
        '<article class="review"><div class="review__head">' +
        '<span class="review__author">' +
        escapeHtml(review.author) +
        '</span>' +
        starsHtml(review.rating) +
        '<span class="review__meta">' +
        escapeHtml([review.source, date].filter(Boolean).join(' · ')) +
        '</span></div>' +
        (review.comment ? '<p class="review__text">' + escapeHtml(review.comment) + '</p>' : '') +
        '</article>'
      );
    })
    .join('');

  return (
    '<section class="section"><h3 class="section__title">Bewertungen</h3>' +
    summary +
    (list ? '<div class="reviews">' + list + '</div>' : '<p class="note">Noch keine Gästestimmen.</p>') +
    '</section>'
  );
}

function openingHoursHtml(venue) {
  if (!(venue.openingHours || []).length) {
    return '';
  }

  var today = new Date().getDay();

  var rows = DAYS.map(function (day, index) {
    var entry = null;
    for (var i = 0; i < venue.openingHours.length; i += 1) {
      if (venue.openingHours[i].day === day.key) {
        entry = venue.openingHours[i];
        break;
      }
    }
    return (
      '<tr class="' +
      (index === today ? 'is-today' : '') +
      '"><td>' +
      day.label +
      '</td><td>' +
      hoursLabel(entry) +
      '</td></tr>'
    );
  }).join('');

  return (
    '<section class="section"><h3 class="section__title">Öffnungszeiten</h3>' +
    '<table class="hours"><tbody>' +
    rows +
    '</tbody></table></section>'
  );
}

function detailHtml(venue) {
  var cover = venue.cover || (venue.photos || [])[0] || null;
  var features = (venue.features || [])
    .map(function (feature) {
      return '<span class="tag">' + escapeHtml(feature) + '</span>';
    })
    .join('');

  return (
    '<div class="detail__hero media">' +
    mediaHtml(cover, (cover && cover.caption) || venue.name, 'venue') +
    '</div>' +
    '<div class="detail__head">' +
    '<h2 class="detail__title" id="detail-title">' +
    escapeHtml(venue.name) +
    '</h2>' +
    '<div class="detail__sub">' +
    '<span class="pill">' +
    KIND_ICON[venue.kind] +
    ' ' +
    KIND_LABEL[venue.kind] +
    '</span>' +
    openPillHtml(venue) +
    ratingHtml(venue) +
    '<span>·</span>' +
    priceLevelHtml(venue.priceLevel) +
    (venue.cuisine ? '<span>·</span><span>' + escapeHtml(venue.cuisine) + '</span>' : '') +
    (venue.distanceKm != null
      ? '<span>·</span><span>⌖ ' + formatDistance(venue.distanceKm) + ' entfernt</span>'
      : '') +
    '</div></div>' +
    '<div class="detail__body">' +
    (venue.description
      ? '<section class="section"><p style="margin:0;color:#cdd4e2">' +
        escapeHtml(venue.description) +
        '</p></section>'
      : '') +
    (features ? '<section class="section"><div class="tags">' + features + '</div></section>' : '') +
    '<section class="section"><h3 class="section__title">Kontakt</h3>' +
    contactHtml(venue) +
    '</section>' +
    socialsHtml(venue) +
    galleryHtml(venue) +
    menuHtml(venue) +
    reviewsHtml(venue) +
    openingHoursHtml(venue) +
    '</div>'
  );
}

/* ------------------------------------------------------------------ detail */

function findVenue(slug) {
  for (var i = 0; i < state.venues.length; i += 1) {
    if (state.venues[i].slug === slug) {
      return state.venues[i];
    }
  }
  return null;
}

function openDetail(slug, skipHash) {
  var venue = findVenue(slug);
  if (!venue) {
    return;
  }

  state.menuFilter = 'all';
  state.openSlug = slug;
  el.detailBody.innerHTML = detailHtml(venue);
  el.detail.hidden = false;
  el.detail.querySelector('.sheet__panel').scrollTop = 0;
  document.body.style.overflow = 'hidden';

  if (!skipHash) {
    window.location.hash = '#/venue/' + slug;
  }
}

function closeDetail() {
  el.detail.hidden = true;
  state.openSlug = null;
  document.body.style.overflow = '';
  if (window.location.hash) {
    history.pushState('', document.title, window.location.pathname + window.location.search);
  }
}

/* ------------------------------------------------------------------- fetch */

function buildQuery() {
  var params = new URLSearchParams();
  params.set('latitude', state.location.latitude);
  params.set('longitude', state.location.longitude);

  if (state.radius) {
    params.set('radius', state.radius);
  }
  if (state.kind !== 'all') {
    params.set('kind', state.kind);
  }
  if (state.search) {
    params.set('search', state.search);
  }

  return params.toString();
}

function sortVenues(venues) {
  var sorted = venues.slice();

  if (state.sort === 'rating') {
    sorted.sort(function (a, b) {
      return (b.rating || 0) - (a.rating || 0);
    });
  } else if (state.sort === 'price-asc') {
    sorted.sort(function (a, b) {
      return (a.priceLevel || 0) - (b.priceLevel || 0) || (a.distanceKm || 0) - (b.distanceKm || 0);
    });
  } else if (state.sort === 'price-desc') {
    sorted.sort(function (a, b) {
      return (b.priceLevel || 0) - (a.priceLevel || 0) || (a.distanceKm || 0) - (b.distanceKm || 0);
    });
  } else {
    sorted.sort(function (a, b) {
      return (a.distanceKm || 0) - (b.distanceKm || 0);
    });
  }

  return sorted;
}

function render() {
  var venues = state.venues;

  if (state.openNow) {
    venues = venues.filter(function (venue) {
      return isOpenNow(venue) !== false;
    });
  }

  venues = sortVenues(venues);

  if (!venues.length) {
    el.results.innerHTML =
      '<div class="empty"><p>Nichts gefunden.</p>' +
      (state.radius
        ? '<p class="note">Im Umkreis von ' +
          state.radius +
          ' km gibt es dazu nichts.</p>' +
          '<p><button class="btn btn--primary" type="button" data-expand-radius="true">' +
          'Überall suchen</button></p>'
        : '<p class="note">Versuche einen anderen Suchbegriff oder eine andere Kategorie.</p>') +
      '</div>';
  } else {
    el.results.innerHTML = venues
      .map(function (venue) {
        return cardHtml(venue);
      })
      .join('');
  }

  el.status.textContent =
    (state.loading ? 'Suche …' : venues.length + (venues.length === 1 ? ' Ort' : ' Orte')) +
    ' rund um ' +
    state.location.label +
    (state.radius ? ' · Umkreis ' + state.radius + ' km' : '');
}

function load() {
  state.loading = true;
  render();

  return fetch(API + '/nearby?' + buildQuery(), { headers: { Accept: 'application/json' } })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    })
    .then(function (payload) {
      state.loading = false;
      state.venues = payload.data || [];
      collectAreas(state.venues);
      render();

      var hash = window.location.hash.match(/^#\/venue\/(.+)$/);
      if (hash && !state.openSlug) {
        openDetail(hash[1], true);
      }
    })
    .catch(function (error) {
      state.loading = false;
      state.venues = [];
      el.results.innerHTML =
        '<div class="empty"><p>Die Daten konnten nicht geladen werden.</p>' +
        '<p class="note">Läuft Strapi? Prüfe <code>npm run develop</code> und ob die Rolle ' +
        '„Public“ Zugriff auf <code>venue</code> hat.<br />' +
        escapeHtml(error.message) +
        '</p></div>';
      el.status.textContent = '';
    });
}

/**
 * Builds the location dropdown from the districts that actually exist in the
 * data, so the app stays usable when the browser denies geolocation.
 */
function collectAreas(venues) {
  if (state.areas.length) {
    return;
  }

  var seen = {};
  venues.forEach(function (venue) {
    var label = [venue.district, venue.city].filter(Boolean).join(', ');
    if (label && !seen[label]) {
      seen[label] = { label: label, latitude: venue.latitude, longitude: venue.longitude };
    }
  });

  state.areas = Object.keys(seen)
    .sort()
    .map(function (key) {
      return seen[key];
    });

  el.area.innerHTML =
    '<option value="">' +
    escapeHtml(state.location.label) +
    '</option>' +
    state.areas
      .map(function (area, index) {
        return '<option value="' + index + '">' + escapeHtml(area.label) + '</option>';
      })
      .join('');
}

/* ------------------------------------------------------------------ events */

function debounce(fn, wait) {
  var timer;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
  };
}

el.search.addEventListener(
  'input',
  debounce(function () {
    state.search = el.search.value.trim();
    load();
  }, 300)
);

Array.prototype.forEach.call(el.chips, function (chip) {
  chip.addEventListener('click', function () {
    Array.prototype.forEach.call(el.chips, function (other) {
      other.classList.toggle('is-active', other === chip);
    });
    state.kind = chip.getAttribute('data-kind');
    load();
  });
});

el.radius.addEventListener('change', function () {
  state.radius = el.radius.value;
  load();
});

el.sort.addEventListener('change', function () {
  state.sort = el.sort.value;
  render();
});

el.openNow.addEventListener('change', function () {
  state.openNow = el.openNow.checked;
  render();
});

el.area.addEventListener('change', function () {
  var index = el.area.value;
  state.location = index === '' ? DEFAULT_LOCATION : state.areas[Number(index)];
  load();
});

el.locate.addEventListener('click', function () {
  if (!navigator.geolocation) {
    el.status.textContent = 'Dein Browser unterstützt keine Standortabfrage.';
    return;
  }

  el.locate.disabled = true;
  el.status.textContent = 'Standort wird ermittelt …';

  navigator.geolocation.getCurrentPosition(
    function (position) {
      el.locate.disabled = false;
      state.location = {
        label: 'deinen Standort',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      el.area.value = '';
      load();
    },
    function () {
      el.locate.disabled = false;
      el.status.textContent =
        'Standort nicht verfügbar – es wird ' + DEFAULT_LOCATION.label + ' verwendet.';
      state.location = DEFAULT_LOCATION;
      load();
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
});

el.results.addEventListener('click', function (event) {
  if (event.target.closest('[data-expand-radius]')) {
    state.radius = '';
    el.radius.value = '';
    load();
    return;
  }

  var card = event.target.closest('.card');
  if (card) {
    openDetail(card.getAttribute('data-slug'));
  }
});

el.detail.addEventListener('click', function (event) {
  if (event.target.getAttribute('data-close') === 'true') {
    closeDetail();
    return;
  }

  var tab = event.target.closest('[data-menu-filter]');
  if (tab && state.openSlug) {
    state.menuFilter = tab.getAttribute('data-menu-filter');
    var scroll = el.detail.querySelector('.sheet__panel').scrollTop;
    el.detailBody.innerHTML = detailHtml(findVenue(state.openSlug));
    el.detail.querySelector('.sheet__panel').scrollTop = scroll;
  }
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !el.detail.hidden) {
    closeDetail();
  }
});

window.addEventListener('hashchange', function () {
  var match = window.location.hash.match(/^#\/venue\/(.+)$/);
  if (match) {
    openDetail(match[1], true);
  } else if (!el.detail.hidden) {
    el.detail.hidden = true;
    state.openSlug = null;
    document.body.style.overflow = '';
  }
});

/* -------------------------------------------------------------------- boot */

load();
