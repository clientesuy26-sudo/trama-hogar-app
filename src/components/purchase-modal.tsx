'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getTieredPrice, extrasCatalog, products } from '@/lib/data';
import type { Product, Extra, LightboxContent } from '@/types';
import { getAiSuggestions, sendOrderToWhatsApp } from '@/lib/actions';
import { SuggestionItem } from './suggestion-item';
import { X, Truck, Store, Bot, LoaderCircle, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { logEvent } from '@/lib/logger';

type PurchaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onOpenLightbox: (content: LightboxContent) => void;
  onSendOrder: (message: string) => void;
};

export function PurchaseModal({ isOpen, onClose, product, onOpenLightbox, onSendOrder }: PurchaseModalProps) {
  const [mainQty, setMainQty] = useState(2);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [shippingMethod, setShippingMethod] = useState<'envio' | 'retiro' | null>(null);
  const [suggestedItems, setSuggestedItems] = useState<Extra[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const allPossibleExtras = useMemo(() => {
    const otherProductsAsExtras: Extra[] = products
        .filter(p => p.id !== product.id)
        .map(p => ({
            id: `p-${p.id}`,
            name: p.name,
            price: p.price,
            img: p.img,
            suggested: false,
            imageHint: p.imageHint,
        }));
    return [...extrasCatalog, ...otherProductsAsExtras];
  }, [product.id]);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setMainQty(2);
      setExtras({});
      setShippingMethod(null);
      setSuggestedItems([]);
      
      const fetchSuggestions = async () => {
        const items = await getAiSuggestions(product);
        setSuggestedItems(items);
      };
      fetchSuggestions();
    }
  }, [isOpen, product]);

  const mainPrice = getTieredPrice(mainQty);
  
  const extrasTotal = useMemo(() => {
    return Object.entries(extras).reduce((total, [id, qty]) => {
      const item = allPossibleExtras.find(e => e.id === id);
      return total + (item ? item.price * qty : 0);
    }, 0);
  }, [extras, allPossibleExtras]);

  const shippingCost = shippingMethod === 'envio' ? 250 : 0;
  const totalPrice = mainPrice + extrasTotal + shippingCost;

  const updateMainQty = (amount: number) => {
    setMainQty(prev => Math.max(1, prev + amount));
  };

  const updateExtraQty = (id: string, amount: number) => {
    setExtras(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + amount),
    }));
  };

  const handleSendOrder = async () => {
    if (!shippingMethod) return;
    setIsLoading(true);

    const extraItemsPayload = Object.entries(extras)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => {
        const item = allPossibleExtras.find(e => e.id === id)!;
        return { name: item.name, img: item.img, quantity, total: item.price * quantity };
      });
      
    const payload = {
      mainItem: { name: product.name, img: product.img, quantity: mainQty, subtotal: mainPrice },
      extraItems: extraItemsPayload,
      shipping: { method: shippingMethod, cost: shippingCost },
      total: totalPrice
    };
    
    logEvent('PurchaseModal', 'info', 'Attempting to send order.', payload);
    const result = await sendOrderToWhatsApp(payload);
    
    if (result.success) {
      logEvent('PurchaseModal', 'success', 'Order sent successfully.', payload);
      const orderMessage = `He realizado un pedido de presupuesto para: ${mainQty}x ${product.name}. Total: $${totalPrice}.`;
      onSendOrder(orderMessage);
      toast({ title: "Pedido enviado", description: "Tu presupuesto ha sido enviado a Maya. Revisa el chat." });
    } else {
      logEvent('PurchaseModal', 'error', 'Error sending order.', { error: result.error, payload });
      toast({ variant: "destructive", title: "Error", description: result.error || "No se pudo enviar el pedido. Intenta de nuevo." });
    }
    
    setIsLoading(false);
  };
  
  const displayedExtras = useMemo(() => {
    const suggestedIds = new Set(suggestedItems.map(i => i.id));
    const otherItems = allPossibleExtras.filter(item => !suggestedIds.has(item.id));
    return [...suggestedItems, ...otherItems];
  }, [suggestedItems, allPossibleExtras]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0" onPointerDownOutside={onClose}>
        <DialogHeader className="p-4 border-b bg-secondary/50 flex-row justify-between items-center">
          <DialogTitle className="uppercase tracking-tighter">Personalizar Pedido</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b">
              <div className="relative group cursor-zoom-in self-start flex-shrink-0" onClick={() => onOpenLightbox({ src: product.img, type: 'image' })}>
                <Image src={product.img} alt={product.name} width={128} height={128} data-ai-hint={product.imageHint} className="w-32 h-32 object-cover rounded-xl shadow-md border-2 bg-white" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                  <ZoomIn className="text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-black text-xl mb-2 uppercase tracking-tighter">{product.name}</h4>
                <p className="text-xs text-muted-foreground mb-4 uppercase font-bold tracking-widest">Cantidad principal</p>
                <div className="flex flex-wrap items-center justify-between gap-4 bg-secondary p-3 rounded-2xl">
                  <div className="flex items-center border-2 rounded-full bg-background overflow-hidden h-12 shadow-inner">
                    <Button variant="ghost" size="icon" className="w-10 h-full rounded-none text-xl font-black" onClick={() => updateMainQty(-1)}>-</Button>
                    <input value={mainQty} type="number" readOnly className="w-14 text-center border-none focus:ring-0 bg-transparent font-black text-lg" />
                    <Button variant="ghost" size="icon" className="w-10 h-full rounded-none text-xl font-black" onClick={() => updateMainQty(1)}>+</Button>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase">Subtotal</div>
                    <span className="font-black text-primary text-2xl tracking-tighter">${mainPrice}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-6">
                <h5 className="font-black text-sm uppercase tracking-widest">Artículos que tal vez quieras agregar</h5>
              </div>
              <div className="flex flex-col gap-4">
                {displayedExtras.map(item => (
                  <SuggestionItem 
                    key={item.id} 
                    item={item} 
                    quantity={extras[item.id] || 0} 
                    onQuantityChange={updateExtraQty}
                    onOpenLightbox={onOpenLightbox}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <div className="p-6 bg-secondary/50 border-t">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Total del presupuesto</span>
              <div className="font-black text-4xl text-foreground tracking-tighter">${totalPrice}</div>
            </div>
            {shippingMethod === 'envio' && (
              <div className="text-right text-[10px] text-muted-foreground font-bold uppercase">
                + Envío ${shippingCost} incluido
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button id="btn-envio" onClick={() => setShippingMethod('envio')} variant="outline" className={cn("py-3 h-auto border-2 rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1", shippingMethod === 'envio' && 'border-primary bg-primary/10 text-primary')}>
              <Truck className="h-5 w-5 mb-1" />
              <span>Solicito Envío (+${250})</span>
            </Button>
            <Button id="btn-retiro" onClick={() => setShippingMethod('retiro')} variant="outline" className={cn("py-3 h-auto border-2 rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1", shippingMethod === 'retiro' && 'border-primary bg-primary/10 text-primary')}>
              <Store className="h-5 w-5 mb-1" />
              <span>Retirar en Local</span>
            </Button>
          </div>
          <Button id="send-order-btn" onClick={handleSendOrder} disabled={!shippingMethod || isLoading} className="w-full h-16 rounded-full shadow-xl transition-all text-sm font-black uppercase tracking-widest">
            {isLoading ? <LoaderCircle className="animate-spin" /> : <><span>Enviar pedido a Maya</span><Bot /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
