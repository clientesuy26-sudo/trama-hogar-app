import { products } from "@/lib/data";
import type { Product, LightboxContent } from "@/types";
import { ProductCard } from "./product-card";
import { Badge } from "./ui/badge";

type ProductSectionProps = {
  onOrderClick: (product: Product) => void;
  onImageClick: (content: LightboxContent) => void;
};

export function ProductSection({ onOrderClick, onImageClick }: ProductSectionProps) {
  return (
    <section className="w-full max-w-[1400px] px-4 lg:px-24 py-16 flex flex-col gap-12" id="productos">
      <div className="text-center">
        <h2 className="text-4xl italic mb-4 text-foreground">Colección Trama Hogar</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Badge variant="secondary" className="px-4 py-2 text-xs font-bold uppercase rounded-full">2x $390</Badge>
          <Badge variant="outline" className="px-4 py-2 text-xs font-bold uppercase rounded-full border-primary/50 text-primary bg-primary/10">4x $750</Badge>
          <Badge variant="secondary" className="px-4 py-2 text-xs font-bold uppercase rounded-full">6x $1.100</Badge>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map(p => (
          <ProductCard key={p.id} product={p} onOrderClick={onOrderClick} onImageClick={onImageClick} />
        ))}
      </div>
    </section>
  );
}
