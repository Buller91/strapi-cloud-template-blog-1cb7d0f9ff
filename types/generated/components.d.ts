import type { Schema, Struct } from '@strapi/strapi';

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

export interface VenueMenuItem extends Struct.ComponentSchema {
  collectionName: 'components_venue_menu_items';
  info: {
    description: 'A dish or a drink including its price';
    displayName: 'Menu Item';
    icon: 'priceTag';
  };
  attributes: {
    currency: Schema.Attribute.String & Schema.Attribute.DefaultTo<'EUR'>;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    imageUrl: Schema.Attribute.String;
    kind: Schema.Attribute.Enumeration<['food', 'drink']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'food'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    popular: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    price: Schema.Attribute.Decimal & Schema.Attribute.Required;
    section: Schema.Attribute.String;
  };
}

export interface VenueOpeningHour extends Struct.ComponentSchema {
  collectionName: 'components_venue_opening_hours';
  info: {
    description: 'Opening hours for a single weekday';
    displayName: 'Opening Hour';
    icon: 'clock';
  };
  attributes: {
    closed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    closes: Schema.Attribute.String;
    day: Schema.Attribute.Enumeration<
      [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
    > &
      Schema.Attribute.Required;
    opens: Schema.Attribute.String;
  };
}

export interface VenuePhoto extends Struct.ComponentSchema {
  collectionName: 'components_venue_photos';
  info: {
    description: 'A picture of the food, the drinks or the venue itself';
    displayName: 'Photo';
    icon: 'picture';
  };
  attributes: {
    caption: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    imageUrl: Schema.Attribute.String;
    kind: Schema.Attribute.Enumeration<['food', 'drink', 'venue']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'food'>;
  };
}

export interface VenueReview extends Struct.ComponentSchema {
  collectionName: 'components_venue_reviews';
  info: {
    description: 'A guest review of the venue';
    displayName: 'Review';
    icon: 'star';
  };
  attributes: {
    author: Schema.Attribute.String & Schema.Attribute.Required;
    comment: Schema.Attribute.Text;
    date: Schema.Attribute.Date;
    rating: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    source: Schema.Attribute.String;
  };
}

export interface VenueSocialLinks extends Struct.ComponentSchema {
  collectionName: 'components_venue_social_links';
  info: {
    description: 'Social media profiles of a venue';
    displayName: 'Social Links';
    icon: 'instagram';
  };
  attributes: {
    facebook: Schema.Attribute.String;
    instagram: Schema.Attribute.String;
    tiktok: Schema.Attribute.String;
    whatsapp: Schema.Attribute.String;
    x: Schema.Attribute.String;
    youtube: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'venue.menu-item': VenueMenuItem;
      'venue.opening-hour': VenueOpeningHour;
      'venue.photo': VenuePhoto;
      'venue.review': VenueReview;
      'venue.social-links': VenueSocialLinks;
    }
  }
}
