# 🎱 ColLoterias — Resultados de Loterías Colombianas

App web para consultar resultados en tiempo real de **loterías colombianas**, **chances** y **Baloto**.

## ✨ Características

- 🔍 **Búsqueda por texto** — filtra por nombre de lotería, tipo o ciudad
- 🎙️ **Búsqueda por voz** (Web Speech API) — precisión con alias colombianos ("Bogotá", "paisa", "costño…")
- 🎱 **Baloto, Revancha y MiLoto** — con acumulado y números especiales
- 🃏 **+30 loterías** colombianas oficiales
- 🎲 **Chances** — Pijao de Oro, La Pata, Cafetero, Super Astro y más
- ⚡ **Filtros rápidos** — Todos / Loterías / Chances / Baloto / Hoy
- 📱 **Responsive** — funciona en móvil, tablet y desktop
- 🌙 **Modo oscuro nativo**

## 📡 Fuentes de datos (en orden de prioridad)

1. **[api-resultadosloterias.com](https://api-resultadosloterias.com)** — API colombiana dedicada
2. **[quecayo.com](https://quecayo.com)** — scraping vía proxy CORS
3. **Horario programado** — fallback con catálogo de loterías y hora de sorteo

## 🚀 Uso

Abre `index.html` directamente en el navegador o despliega en cualquier servidor estático (GitHub Pages, Netlify, Vercel, etc.).

```
No requiere dependencias ni build — HTML/CSS/JS puro.
```

## 🗂️ Estructura

```
ColLoterias/
├── index.html          # Entrada principal
└── src/
    ├── styles.css      # Estilos completos (tema oscuro)
    ├── data.js         # Catálogo de loterías + aliases de voz
    ├── api.js          # Capa de datos (fetch + fallbacks)
    ├── voice.js        # Motor de búsqueda por voz
    └── app.js          # Controlador principal de la app
```

## 🔊 Búsqueda por voz — ejemplos

| Dices | Busca |
|-------|-------|
| "Baloto" | Baloto + Revancha |
| "Bogotá" | Lotería de Bogotá |
| "paisa" | Lotería de Medellín |
| "chance" | Todos los chances |
| "boyacá" | Lotería de Boyacá |

> Requiere Chrome, Edge o Safari (no funciona en Firefox por limitaciones del navegador).

## 📜 Aviso legal

Los resultados son informativos. Verifique siempre en la fuente oficial: [Coljuegos](https://www.coljuegos.gov.co) y [Baloto.com](https://www.baloto.com).
