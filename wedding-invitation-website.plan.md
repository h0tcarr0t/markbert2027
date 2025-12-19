# Wedding Invitation Website

## Architecture

**Layout**: Split-screen design

- Left side (40% width): Fixed 3D Spline canvas that stays visible while scrolling
- Right side (60% width): Scrollable content sections

**Tech Stack**: Vanilla HTML/CSS/JS with Spline Runtime library loaded via CDN

---

## Implementation

### 1. HTML Structure

```html
<body>
  <!-- Fixed 3D model container on left -->
  <div class="spline-container">
    <canvas id="spline-canvas"></canvas>
  </div>
  
  <!-- Scrollable content on right -->
  <main class="content">
    <section id="welcome">...</section>
    <section id="story">...</section>
    <section id="details">...</section>
    <section id="venue">...</section>
    <section id="travel">...</section>
    <section id="rsvp">...</section>
  </main>
</body>
```

### 2. Spline Runtime Integration

Load via CDN and initialize with global mouse tracking:

```html
<script type="module">
  import { Application } from 'https://unpkg.com/@splinetool/runtime@latest/build/runtime.js';

  const canvas = document.getElementById('spline-canvas');
  const app = new Application(canvas);
  
  // PASTE YOUR SPLINE URL HERE (line ~542 in index.html)
  await app.load('YOUR_SPLINE_SCENE_URL');
  
  // Global mouse tracking - works even outside the canvas
  document.addEventListener('mousemove', (e) => {
    app.emitEvent('mouseMove', { x: e.clientX, y: e.clientY });
  });
</script>
```

**Where to paste your Spline URL**: In `index.html`, look for line ~542 with `app.load('YOUR_SPLINE_SCENE_URL')` and replace `YOUR_SPLINE_SCENE_URL` with your actual Spline scene URL (format: `https://prod.spline.design/xxxxx/scene.splinecode`).

### 3. Styling (Minimal and Elegant)

- **Colors**: Warm white (#FDFBF7), soft sage (#9CAF88), muted gold (#C9B037)
- **Typography**: Cormorant Garamond (elegant serif) for headings, Outfit (clean sans) for body
- **Spacing**: Generous padding, sections separated by whitespace
- **Effects**: Subtle fade-in animations on scroll

### 4. Content Sections

| Section | Content |
|---------|---------|
| Welcome | Names, date, hero message |
| Our Story | Brief couple story with timeline |
| Details | Date, time, dress code |
| Venue | Location with embedded map link |
| Travel | Accommodation suggestions |
| RSVP | RSVP instructions/link |

---

## File Output

Single file: `index.html`

---

## Spline Setup Requirement

For the mouse tracking to work globally, your Spline scene needs to have an event listener configured in Spline:

1. In Spline, select your cake model
2. Add an event: "Mouse Move" or custom event
3. Set the rotation behavior to respond to mouse coordinates

---

## To-dos (Completed)

- [x] Create index.html with split-screen layout and all sections
- [x] Integrate Spline Runtime with global mouse tracking
- [x] Apply minimal elegant styling with fonts and animations

