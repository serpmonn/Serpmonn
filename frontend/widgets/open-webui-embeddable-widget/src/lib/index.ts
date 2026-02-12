// Reexport your entry components here
import ChatWidget from './ChatWidget.svelte';
import { mount } from 'svelte';

export { ChatWidget, mount };

// If you want to allow consumers to import the component directly like:
// import ChatWidget from 'your-package-name';
// then you can also add a default export:
export default ChatWidget;
