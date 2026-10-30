import { render } from 'solid-js/web';
import App from './app/App';
import { KitGallery } from './kit';
import './kit/tokens.css';
import './kit/components.css';
import './app/styles/index.css';
// `#ui-kit` opens the reference sheet of tokens and components instead of the workspace.
render(() => location.hash === '#ui-kit' ? <KitGallery/> : <App/>, document.getElementById('root')!);
