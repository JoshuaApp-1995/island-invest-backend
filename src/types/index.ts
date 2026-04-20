export type ListingCategory = 'Venta' | 'Alquiler' | 'Terrenos' | 'Casas' | 'Apartamentos' | 'Comercial' | 'Fincas';

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: ListingCategory;
  price: number;
  currency: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  status: string;
  is_premium: boolean;
  payment_status: string;
  payment_receipt: string | null;
  created_at: Date;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  pathname: string;
  type: 'image' | 'video';
  position: number;
  created_at: Date;
}

export interface ListingWithImages extends Listing {
  images: ListingImage[];
  user_name?: string;
  user_avatar?: string;
}
