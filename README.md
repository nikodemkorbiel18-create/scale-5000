# ScaleAI Systems

An AI-powered operating system that helps educators automate student support, onboarding, analytics, and content workflows to scale their education businesses.

## Overview

ScaleAI Systems is a modern, high-performance landing page built to showcase an AI-powered platform for online educators, course creators, coaches, and mentors. The application helps education businesses scale without increasing manual workload through intelligent automation.

## Features

- **24/7 AI Student Support** - Automated student question answering via Slack, Discord, or Email
- **Automated Onboarding** - Zero-touch student onboarding with contracts, payments, and access granting
- **Content Repurposing** - Transform one Zoom call into multiple social media posts automatically
- **Lead Scoring** - AI-powered lead qualification and prioritization
- **Funnel Analytics** - Unified dashboard with AI-powered recommendations
- **Smart Scheduling** - Intelligent calendar management for mentorship calls
- **Revenue Calculator** - Interactive tool to calculate opportunity costs

## Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Fonts**: Inter, JetBrains Mono (Google Fonts)
- **Animations**: Custom CSS animations optimized for high refresh rates (240Hz)
- **Performance**: RequestAnimationFrame, IntersectionObserver API
- **AI Integration**: ElevenLabs Conversational AI widget

## Performance Optimizations

This landing page is optimized for ultra-smooth 240Hz displays with:
- Hardware-accelerated animations using `transform` and `opacity`
- RequestAnimationFrame for smooth scrolling and cursor effects
- Intersection Observer for efficient scroll reveals
- Optimized transition timings (0.05s - 0.15s) for instant feedback
- GPU acceleration with `translateZ(0)` and `will-change` properties

## Project Structure

```
ScaleAI/
├── index.html          # Main landing page
├── metadata.json       # Project metadata and configuration
├── app.txt            # Application description
├── Index.txt          # Page content description
└── README.md          # This file
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/nikodemkorbiel18-create/scale-5000.git
   cd scale-5000
   ```

2. Open `index.html` in your browser or serve it using a local server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve
   ```

3. Visit `http://localhost:8000` in your browser

## Deployment

This project is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Deploy with default settings

Alternatively, you can deploy to any static hosting platform (Netlify, GitHub Pages, etc.)

## Features Breakdown

### Hero Section
- Animated gradient text
- Call-to-action buttons with hover effects
- Live dashboard preview with animated metrics

### Interactive Calculator
- Revenue opportunity cost calculator
- Real-time calculations with smooth animations
- Dynamic navigation color changes

### Feature Showcase
- Grid layout with 6 core features
- Hover effects on feature cards
- AI code example with syntax highlighting

### Social Proof
- Carousel with 9 customer testimonials
- Auto-advancing slides with manual controls
- Smooth transitions optimized for 240Hz

### Call to Action
- Gradient background with blur effects
- Strategic placement for conversion

## Customization

### Colors
Edit the Tailwind config in `index.html` to customize the color scheme:
```javascript
colors: {
    brand: {
        50: '#f0fdf4',
        100: '#dcfce7',
        500: '#22c55e',
        900: '#14532d',
    }
}
```

### Content
- Update testimonials in the `reviews` array (line 830)
- Modify feature cards in the features section
- Change calculator parameters (line 569)

### Animations
Adjust animation timings in the CSS section for different refresh rates or performance needs.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

All rights reserved © 2025 ScaleAI Systems

## Contact

For questions or support, please visit [ScaleAI Systems](https://github.com/nikodemkorbiel18-create/scale-5000)
