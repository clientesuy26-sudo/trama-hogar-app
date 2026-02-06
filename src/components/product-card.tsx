import Image from "next/image";
import type { Product, LightboxContent } from "@/types";
import { Button } from "./ui/button";

type ProductCardProps = {
  product: Product;
  onOrderClick: (product: Product) => void;
  onImageClick: (content: LightboxContent) => void;
};

export function ProductCard({ product, onOrderClick, onImageClick }: ProductCardProps) {
  return (
    <div className="group bg-card rounded-xl overflow-hidden border hover:shadow-2xl transition-all">
      <div 
        className="aspect-square overflow-hidden relative cursor-zoom-in" 
        onClick={() => onImageClick({ src: product.img, type: 'image' })}
      >
        <Image
          src={product.img}
          alt={product.name}
          fill
          data-ai-hint={product.imageHint}
          className="object-cover group-hover:scale-110 transition-transform duration-700"
        />
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 uppercase tracking-tight text-[16px] text-card-foreground">{product.name}</h3>
        <Button onClick={() => onOrderClick(product)} className="w-full py-4 text-xs font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-md bg-foreground dark:bg-secondary text-background dark:text-secondary-foreground">
          Pedir ahora
        </Button>
      </div>
    </div>
  );
}
