// '*' = her şey (ör. oturum değişti). Yazmalar sunucuda olduğu için yerel değişiklik olayı yok: repo fonksiyonları yazdıkları tabloları buradan duyurur.
type Listener = (tables: ReadonlySet<string>) => void;
const listeners = new Set<Listener>();

export function notify(...tables: string[]) {
  const set = new Set(tables);
  for (const l of listeners) l(set);
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
