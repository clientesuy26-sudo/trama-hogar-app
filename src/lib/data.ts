import type { Product, Extra } from '@/types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id);

export const products: Product[] = [
  { id: 1, name: "Individual Trama Natural", img: getImage('product-1')?.imageUrl || '', price: 195, imageHint: getImage('product-1')?.imageHint || '' },
  { id: 2, name: "Servilletas Estampa", img: getImage('product-2')?.imageUrl || '', price: 195, imageHint: getImage('product-2')?.imageHint || '' },
  { id: 3, name: "Cesta Panera Soft", img: getImage('product-3')?.imageUrl || '', price: 195, imageHint: getImage('product-3')?.imageHint || '' },
  { id: 4, name: "Individual Gris Nórdico", img: getImage('product-4')?.imageUrl || '', price: 195, imageHint: getImage('product-4')?.imageHint || '' },
  { id: 5, name: "Set Cocina Rustik", img: getImage('product-5')?.imageUrl || '', price: 195, imageHint: getImage('product-5')?.imageHint || '' },
  { id: 6, name: "Servilleta Bordado", img: getImage('product-6')?.imageUrl || '', price: 195, imageHint: getImage('product-6')?.imageHint || '' },
  { id: 7, name: "Centro de Mesa Sol", img: getImage('product-7')?.imageUrl || '', price: 195, imageHint: getImage('product-7')?.imageHint || '' },
  { id: 8, name: "Portacubiertos Deco", img: getImage('product-8')?.imageUrl || '', price: 195, imageHint: getImage('product-8')?.imageHint || '' },
  { id: 9, name: "Camino Costa", img: getImage('product-9')?.imageUrl || '', price: 195, imageHint: getImage('product-9')?.imageHint || '' }
];

export const extrasCatalog: Extra[] = [
  { id: 'x1', name: "Anillos para servilletas (8p)", price: 292, img: getImage('extra-1')?.imageUrl || '', suggested: true, imageHint: getImage('extra-1')?.imageHint || '' },
  { id: 'x2', name: "Pegatinas 'Gracias' (500p)", price: 85, img: getImage('extra-2')?.imageUrl || '', suggested: true, imageHint: getImage('extra-2')?.imageHint || '' },
  { id: 'x3', name: "Pétalos de rosa (1008p)", price: 95, img: getImage('extra-3')?.imageUrl || '', suggested: true, imageHint: getImage('extra-3')?.imageHint || '' },
  { id: 'x4', name: "Cinta de Raso Decorativa", price: 120, img: getImage('extra-4')?.imageUrl || '', suggested: false, imageHint: getImage('extra-4')?.imageHint || '' }
];

export const heroVideoUrl = getImage('hero-video')?.imageUrl || '';

export const getTieredPrice = (qty: number): number => {
  if (qty >= 6) return 1100;
  if (qty >= 4) return 750;
  if (qty >= 2) return 390;
  return 195 * qty; // Fallback for quantity 1
};
