/**
 * @propolis
 * {
 *   "role": "ENTRY_POINT",
 *   "constraints": [
 *     "Must bind to host '0.0.0.0' and port 3000 for proper container routing",
 *     "Vite middleware must be mounted AFTER API routes so that Vite handles asset serving in development"
 *   ],
 *   "agent_instructions": "This is the main entry point and Composition Root. It instantiates the scraper adapters, wraps them in CachingScraperDecorator, registers them in the ProductAggregatorService, and sets up Express routes."
 * }
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';

import { ProductAggregatorService } from './src/application/ProductAggregatorService';
import { TavexScraper } from './src/infrastructure/scrapers/TavexScraper';
import { AuromScraper } from './src/infrastructure/scrapers/AuromScraper';
import { AvangardScraper } from './src/infrastructure/scrapers/AvangardScraper';
import { NeogoldScraper } from './src/infrastructure/scrapers/NeogoldScraper';
import { BCRScraper } from './src/infrastructure/scrapers/BCRScraper';

import { CachingScraperDecorator } from './src/infrastructure/scrapers/CachingScraperDecorator';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Services (Hexagonal Composition Root)
  const aggregatorService = new ProductAggregatorService();
  
  // Tavex
  const tavexScraper = new TavexScraper();
  const cachedTavexScraper = new CachingScraperDecorator(tavexScraper, 5);
  aggregatorService.registerScraper(cachedTavexScraper);

  // Aurom Investment
  const auromScraper = new AuromScraper();
  const cachedAuromScraper = new CachingScraperDecorator(auromScraper, 5);
  aggregatorService.registerScraper(cachedAuromScraper);

  // Avangard Gold
  const avangardScraper = new AvangardScraper();
  const cachedAvangardScraper = new CachingScraperDecorator(avangardScraper, 5);
  aggregatorService.registerScraper(cachedAvangardScraper);

  // Neogold
  const neogoldScraper = new NeogoldScraper();
  const cachedNeogoldScraper = new CachingScraperDecorator(neogoldScraper, 5);
  aggregatorService.registerScraper(cachedNeogoldScraper);

  // BCR
  const bcrScraper = new BCRScraper();
  const cachedBCRScraper = new CachingScraperDecorator(bcrScraper, 60); // cache for 60 min since it's a daily PDF
  aggregatorService.registerScraper(cachedBCRScraper);

  app.get('/api/benchmark/gold', async (req, res) => {
    try {
      const response = await axios.get('https://www.bnr.ro/nbrfxrates.xml', { timeout: 10000 });
      const xml = response.data;
      const dateMatch = xml.match(/<Cube date="([^"]+)">/);
      const rateMatch = xml.match(/<Rate currency="XAU">([\d\.]+)<\/Rate>/);
      
      if (rateMatch) {
        res.json({
          date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
          price: parseFloat(rateMatch[1]),
          currency: 'RON',
          source: 'BNR'
        });
      } else {
        res.status(404).json({ detail: 'Gold rate not found in BNR XML' });
      }
    } catch (error: any) {
      console.error('Error fetching BNR benchmark:', error);
      res.status(500).json({ detail: `Failed to fetch BNR data: ${error.message}` });
    }
  });

  app.get('/api/scrape/all', async (req, res) => {
    try {
      const results = await aggregatorService.aggregateAll();
      res.json({ data: results });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ detail: `Failed to fetch data: ${error.message}` });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
