export function Footer() {
  return (
    <footer id="nosotros" className="border-t bg-background px-6 py-16 lg:px-40">
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-foreground">
          <span className="text-xl font-bold uppercase tracking-widest">Trama Hogar</span>
        </div>
        <p className="mx-auto mb-8 max-w-sm text-sm text-muted-foreground/80">Montevideo, Uruguay. Costura artesanal con alma.</p>
        <p className="text-[10px] uppercase text-muted-foreground/60">© {new Date().getFullYear()} Trama Hogar. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
