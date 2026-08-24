import type { ObjectId } from 'mongodb';

// A hotel + stay the user is watching for price drops.
export type HotelWatch = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly hotelId: string; // Booking.com dest_id
  readonly hotelName: string | null;
  readonly url: string; // original Booking.com URL the user pasted
  readonly checkinDate: string; // Format: "YYYY-MM-DD"
  readonly checkoutDate: string; // Format: "YYYY-MM-DD"
  readonly adults: number;
  readonly roomQty: number;
  readonly currency: string;
  readonly lastPrice: number; // cheapest total seen so far, used as the drop baseline
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateHotelWatchData = {
  readonly chatId: number;
  readonly hotelId: string;
  readonly hotelName: string | null;
  readonly url: string;
  readonly checkinDate: string;
  readonly checkoutDate: string;
  readonly adults: number;
  readonly roomQty: number;
  readonly currency: string;
  readonly lastPrice: number;
};
