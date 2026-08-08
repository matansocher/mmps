export type BookingSearchParams = {
  readonly hotelId: string;
  readonly checkinDate: string; // Format: "YYYY-MM-DD"
  readonly checkoutDate: string; // Format: "YYYY-MM-DD"
  readonly adults?: number;
  readonly roomQty?: number;
  readonly currency?: string;
};

// Parsed representation of a Booking.com hotel URL.
export type ParsedBookingUrl = {
  readonly hotelId: string;
  readonly checkinDate: string | null; // Format: "YYYY-MM-DD"
  readonly checkoutDate: string | null; // Format: "YYYY-MM-DD"
  readonly adults: number | null;
  readonly roomQty: number | null;
};

// Cheapest available offer for the requested stay.
export type HotelPrice = {
  readonly hotelId: string;
  readonly price: number; // total for the whole stay
  readonly currency: string;
  readonly checkinDate: string; // Format: "YYYY-MM-DD"
  readonly checkoutDate: string; // Format: "YYYY-MM-DD"
};

// Minimal shape of the booking-com15 getRoomList response we rely on.
export type RapidApiRoomListResponse = {
  readonly status?: boolean;
  readonly message?: string;
  readonly data?: {
    readonly block?: RapidApiBlock[];
  };
};

export type RapidApiBlock = {
  readonly product_price_breakdown?: {
    readonly gross_amount?: { readonly value?: number; readonly currency?: string };
    readonly all_inclusive_amount?: { readonly value?: number; readonly currency?: string };
  };
};

// Minimal shape of the booking-com15 getHotelDetails response we rely on.
export type RapidApiHotelDetailsResponse = {
  readonly status?: boolean;
  readonly data?: {
    readonly hotel_name?: string;
  };
};
