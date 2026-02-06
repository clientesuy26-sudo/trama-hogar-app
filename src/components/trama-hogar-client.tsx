'use client';

import { useState } from 'react';
import type { Product, LightboxContent } from '@/types';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/hero';
import { ProductSection } from '@/components/product-section';
import { PurchaseModal } from '@/components/purchase-modal';
import { Lightbox } from '@/components/lightbox';
import { ChatWidget } from '@/components/chat-widget';
import { DevLogger } from './dev-logger';

export function TramaHogarClient() {
  const [isPurchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxContent, setLightboxContent] = useState<LightboxContent | null>(null);
  const [isChatOpen, setChatOpen] = useState(false);
  const [initialOrderMessage, setInitialOrderMessage] = useState('');


  const handleOpenPurchaseModal = (product: Product) => {
    setSelectedProduct(product);
    setPurchaseModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleClosePurchaseModal = () => {
    setPurchaseModalOpen(false);
    setSelectedProduct(null);
    document.body.style.overflow = '';
  };

  const handleOpenLightbox = (content: LightboxContent) => {
    setLightboxContent(content);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    setLightboxContent(null);
    if (!isPurchaseModalOpen) {
      document.body.style.overflow = '';
    }
  };
  
  const handleToggleChat = (open?: boolean) => {
    setChatOpen(prev => open === undefined ? !prev : open);
  };
  
  const handleSendOrder = (message: string) => {
    setInitialOrderMessage(message);
    setChatOpen(true);
    handleClosePurchaseModal();
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <Header onChatClick={() => handleToggleChat(true)} />
      <main className="flex-1 flex flex-col items-center w-full">
        <Hero onOpenLightbox={handleOpenLightbox} />
        <ProductSection onOrderClick={handleOpenPurchaseModal} onImageClick={handleOpenLightbox} />
      </main>
      <Footer />
      
      {selectedProduct && (
        <PurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={handleClosePurchaseModal}
          product={selectedProduct}
          onOpenLightbox={handleOpenLightbox}
          onSendOrder={handleSendOrder}
        />
      )}
      
      {lightboxContent && (
        <Lightbox
          isOpen={isLightboxOpen}
          onClose={handleCloseLightbox}
          content={lightboxContent}
        />
      )}
      
      <ChatWidget
        isOpen={isChatOpen}
        onToggle={handleToggleChat}
        initialMessage={initialOrderMessage}
        clearInitialMessage={() => setInitialOrderMessage('')}
      />
      <DevLogger />
    </div>
  );
}
