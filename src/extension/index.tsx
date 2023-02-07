import { createRoot } from 'react-dom/client';
import App from './app';

import './styles/index.css';
import './styles/fonts.css';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
