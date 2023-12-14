import * as Sentry from '@sentry/browser';
import { createRoot } from 'react-dom/client';
import App from './app';

import './styles/index.css';
import './styles/fonts.css';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://4a036f974898ba84cb62e04402fec31c@o227269.ingest.sentry.io/4506381926531072',
  });
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
