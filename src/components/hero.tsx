import type { LightboxContent } from "@/types";
import { heroVideoUrl } from '@/lib/data';
import { Button } from "@/components/ui/button";
import { Maximize } from "lucide-react";

type HeroProps = {
  onOpenLightbox: (content: LightboxContent) => void;
};

export function Hero({ onOpenLightbox }: HeroProps) {
  return (
    <section className="relative w-full overflow-hidden px-4 py-12 lg:px-24 pb-20">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-40 pointer-events-none"></div>
      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="z-10 flex flex-col items-start gap-8 lg:pr-10">
          <div className="inline-block rounded-sm bg-[#FDECC8] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#8F5518]">Hecho en Uruguay</div>
          <h1 className="text-6xl tracking-tight text-foreground md:text-[5.5rem] leading-none">Mesa puesta <br /><span className="text-4xl font-light italic text-muted-foreground/80 md:text-[3.5rem]">con alma textil</span></h1>
          <p className="max-w-lg text-lg font-light leading-relaxed text-muted-foreground/90 md:text-xl">Transforma tus encuentros en momentos especiales con nuestra costura artesanal única.</p>
          <Button asChild size="lg" className="mt-4 h-14 rounded-full px-10 text-base font-bold shadow-md bg-foreground hover:bg-foreground/90 dark:bg-primary dark:hover:bg-primary/90">
            <a href="#productos">Ver Catálogo</a>
          </Button>
        </div>
        <div className="relative flex h-full min-h-[400px] w-full items-center justify-end lg:min-h-[600px]">
          <div
            className="group relative h-full w-full max-w-[550px] cursor-zoom-in aspect-[4/5] overflow-hidden rounded-2xl border-[8px] border-white bg-gray-100 shadow-2xl dark:border-border lg:rotate-2"
            onClick={() => onOpenLightbox({ src: heroVideoUrl, type: 'video' })}
          >
            <video src={heroVideoUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
              <Maximize className="text-white opacity-0 transition-opacity group-hover:opacity-100 h-12 w-12" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
