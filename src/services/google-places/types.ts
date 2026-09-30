export type PlacesApiPlace = {
  readonly id: string;
  readonly displayName?: { readonly text: string; readonly languageCode?: string };
  readonly formattedAddress?: string;
  readonly location?: { readonly latitude: number; readonly longitude: number };
  readonly rating?: number;
  readonly userRatingCount?: number;
  readonly googleMapsUri?: string;
  readonly primaryTypeDisplayName?: { readonly text: string };
  readonly businessStatus?: string;
  readonly nationalPhoneNumber?: string;
  readonly internationalPhoneNumber?: string;
  readonly websiteUri?: string;
  readonly priceLevel?: string;
  readonly regularOpeningHours?: { readonly openNow?: boolean; readonly weekdayDescriptions?: string[] };
};

export type PlacesSearchResponse = {
  readonly places?: PlacesApiPlace[];
};

export type Place = {
  readonly placeId: string;
  readonly name: string;
  readonly address?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly type?: string;
  readonly rating?: number;
  readonly ratingCount?: number;
  readonly businessStatus?: string;
  readonly mapsUrl: string;
};

export type PlaceDetails = Place & {
  readonly phone?: string;
  readonly website?: string;
  readonly priceLevel?: string;
  readonly openNow?: boolean;
  readonly openingHours?: string[];
};

export type SearchPlacesOptions = {
  readonly maxResults?: number;
  readonly languageCode?: string;
  readonly regionCode?: string;
};
