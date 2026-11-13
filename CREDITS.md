# Kaynaklar

- **Hareket verisi ve görselleri:** [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) — Unlicense.
  Veri [wrkout/exercises.json](https://github.com/wrkout/exercises.json) (Ollie Jennings, Unlicense) projesinden türetilmiştir.
  Not: Görsellerin ilk kaynağı iki repoda da belirtilmiyor; uygulama mağazaya çıkarılacaksa görselleri değiştirmek önerilir.
  Güncellemek için: `npm run import-exercises`
- **İkonlar:** Material Symbols (Google, Apache 2.0) — `expo-symbols` üzerinden.
- **Vücut haritası çizimleri:** [MuscleMap](https://github.com/melihcolpan/MuscleMap) — Melih Colpan, MIT Lisansı (metin aşağıda).
  Path verisi `scripts/build-body-paths.mjs` ile bizim kas parçalarımıza eşlendi (bazı parçalar kırpılarak bölündü); çizimin kendisi değiştirilmedi.
- **Tasarım ve özellik fikirleri:** [openGym](https://github.com/DuarteSantos8/openGym) (AGPL v3) — haftalık takvim kartı, antrenman kartlarında mini vücut haritası, antrenmanda ekranın açık kalması. Kod kopyalanmadı; fikirler bu projede yeniden yazıldı.

## MuscleMap lisansı

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
