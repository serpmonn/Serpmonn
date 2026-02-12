import ChatWidget from './lib/ChatWidget.svelte';
import { mount } from 'svelte';

const app = mount(ChatWidget, {
	target: document.getElementById('app')!
});

export default app;