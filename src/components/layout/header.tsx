import { Button } from '@/components/ui/button';

type HeaderProps = {
  onChatClick: () => void;
};

export function Header({ onChatClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 px-6 py-4 backdrop-blur-sm md:px-10 lg:px-40">
      <div className="flex items-center gap-4 text-foreground">
        <h2 className="text-lg font-bold uppercase leading-tight tracking-[-0.015em]">Trama Hogar</h2>
      </div>
      <div className="hidden flex-1 items-center justify-end gap-8 md:flex">
        <nav className="flex items-center gap-9">
          <a className="text-sm font-medium text-muted-foreground/80 hover:text-primary transition-colors" href="#productos">Productos</a>
          <a className="text-sm font-medium text-muted-foreground/80 hover:text-primary transition-colors" href="#nosotros">Nosotros</a>
        </nav>
        <Button onClick={onChatClick} className="rounded-full px-6 font-bold tracking-[0.015em]">
          Habla con nosotros
        </Button>
      </div>
      <div className="md:hidden">
         <Button onClick={onChatClick} size="sm" className="rounded-full px-4 font-bold tracking-[0.015em]">
          Chat
        </Button>
      </div>
    </header>
  );
}
