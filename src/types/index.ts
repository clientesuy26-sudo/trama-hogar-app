export interface Product {
  id: number;
  name: string;
  img: string;
  price: number;
  imageHint: string;
}

export interface Extra {
  id: string;
  name: string;
  price: number;
  img: string;
  suggested: boolean;
  imageHint: string;
  description?: string;
}

export interface CartItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  img: string;
}

export interface LightboxContent {
  src: string;
  type: 'image' | 'video';
}

export interface ChatMessage {
  id: string;
  text: string;
  type: 'sent' | 'received';
  timestamp: number;
}
