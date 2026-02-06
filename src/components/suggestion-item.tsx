'use client';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Extra, LightboxContent } from '@/types';
import { cn } from '@/lib/utils';
import { Sparkles, ZoomIn } from 'lucide-react';

type SuggestionItemProps = {
    item: Extra;
    quantity: number;
    onQuantityChange: (id: string, amount: number) => void;
    onOpenLightbox: (content: LightboxContent) => void;
};

export function SuggestionItem({ item, quantity, onQuantityChange, onOpenLightbox }: SuggestionItemProps) {
    const total = item.price * quantity;

    return (
        <div className={cn("border-2 p-3 rounded-2xl flex items-center justify-between gap-3 bg-background transition-colors", quantity > 0 ? "border-primary bg-primary/5" : "border-border")}>
            <div className="flex items-center gap-3">
                <div className="relative cursor-zoom-in group flex-shrink-0" onClick={() => onOpenLightbox({ src: item.img, type: 'image' })}>
                    <Image src={item.img} alt={item.name} width={64} height={64} data-ai-hint={item.imageHint} className="w-16 h-16 object-cover rounded-xl shadow-sm border bg-white"/>
                     <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                        <ZoomIn className="text-white h-5 w-5" />
                    </div>
                </div>
                <div className="flex flex-col min-w-0">
                    {item.suggested && <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3"/>Sugerido por IA</span>}
                    <div className="text-xs font-bold leading-tight mb-1 truncate">{item.name}</div>
                    <div className="text-muted-foreground font-bold text-[10px]">${item.price} c/u</div>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="flex items-center border-2 rounded-full bg-background overflow-hidden h-10 px-1 shadow-sm">
                    <Button variant="ghost" size="icon" className="w-8 h-full rounded-none text-lg font-black" onClick={() => onQuantityChange(item.id, -1)}>-</Button>
                    <input value={quantity} readOnly className="w-10 text-center border-none focus:ring-0 bg-transparent text-sm font-black"/>
                    <Button variant="ghost" size="icon" className="w-8 h-full rounded-none text-lg font-black" onClick={() => onQuantityChange(item.id, 1)}>+</Button>
                </div>
                <div className={cn("text-xs font-black text-primary", quantity > 0 ? "visible" : "invisible")}>
                    ${total}
                </div>
            </div>
        </div>
    );
}
