'use client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { LightboxContent } from '@/types';
import Image from 'next/image';

type LightboxProps = {
  isOpen: boolean;
  onClose: () => void;
  content: LightboxContent | null;
};

export function Lightbox({ isOpen, onClose, content }: LightboxProps) {
  if (!content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="bg-transparent border-none shadow-none w-full h-full max-w-none max-h-none flex items-center justify-center p-4"
        onEscapeKeyDown={onClose}
        onPointerDownOutside={onClose}
      >
        <div className="relative w-full h-full max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
          {content.type === 'image' && (
            <Image 
              src={content.src} 
              alt="Lightbox image" 
              fill
              className="object-contain rounded-lg shadow-2xl"
            />
          )}
          {content.type === 'video' && (
            <video 
              src={content.src} 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
              controls 
              autoPlay 
              loop 
              muted 
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
