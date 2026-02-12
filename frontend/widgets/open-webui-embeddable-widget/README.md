# Open WebUI Chat Widget

A beautifully simple, embeddable chat widget for Open WebUI instances. Add AI-powered chat to any website with just a few lines of code. 

This tool is meant to be extremely simple and is intended for trusted internal user traffic only as it relies on shared API keys or user sessions to call the Open WebUI backend. It is not meant for public web traffic without additional
authentication in place.

**See it in action:**

<div align="center">
  
  <video width="556" src="https://github.com/user-attachments/assets/2b0c7a36-3d89-4573-ac5f-c0429f3afc6e"></video>
</div>

## ✨ Features

- **Dead Simple Integration** - Just 3 lines of HTML to add chat to your site
- **Clean, Modern UI** - Professional chat interface that looks great out of the box
- **Zero Dependencies** - Lightweight, self-contained widget (~15KB)
- **Fully Customizable** - Configure your API endpoint, model, and styling
- **Responsive Design** - Works perfectly on desktop and mobile

## 🚀 Quick Start

### 1. Get Your API Key

First, you'll need an API key from your Open WebUI instance:

1. Log into your Open WebUI
2. Go to **User Settings** → **Account** → **API Keys**
3. Create a new API key and copy it

<img width="883" alt="image" src="https://github.com/user-attachments/assets/6335921a-802c-4888-9ea6-cb0b57a0332b" />

### 2. Add the Widget to Your Site

Add these three lines to your HTML:

```html
<link rel="stylesheet" href="https://your-cdn.com/owui-widget.css">
<div id="chat-widget"></div>
<script type="module">
  import ChatWidget, { mount } from 'https://your-cdn.com/ChatWidget.js';
  mount(ChatWidget, {
    target: document.getElementById('chat-widget')
  });
</script>
```

### 3. Configure with URL Parameters

Add your API key to the page URL:

```
https://yoursite.com/page.html?api_key=YOUR_API_KEY_HERE
```

That's it! Your chat widget is now live. 🎉

## 📋 Configuration Options

Configure the widget by adding parameters to your page URL:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `api_key` | Your Open WebUI API key (required) | `?api_key=sk-abc123...` |
| `model` | AI model to use (optional) | `?api_key=...&model=gpt-4` |
| `endpoint` | Custom API endpoint (optional) | `?api_key=...&endpoint=https://api.example.com/chat` |

### Full Example

```
https://yoursite.com/chat.html?api_key=sk-abc123&model=gpt-4&endpoint=https://my-openwebui.com/api/chat/completions
```

## 🛠️ Self-Hosting

Want to host the widget files yourself? It's easy:

1. **Download the widget files:**
   - `ChatWidget.js`
   - `owui-widget.css`

2. **Host them on your server**

3. **Update the paths in your HTML:**
   ```html
   <link rel="stylesheet" href="/path/to/owui-widget.css">
   <script type="module">
     import ChatWidget, { mount } from '/path/to/ChatWidget.js';
     // ... rest of the code
   </script>
   ```

## 💡 Usage Examples

### Basic Chat Page

Create a simple `chat.html` file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Chat with AI</title>
    <link rel="stylesheet" href="owui-widget.css">
    <style>
        #chat-widget {
            width: 400px;
            height: 600px;
            margin: 50px auto;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div id="chat-widget"></div>
    <script type="module">
        import ChatWidget, { mount } from './ChatWidget.js';
        mount(ChatWidget, {
            target: document.getElementById('chat-widget')
        });
    </script>
</body>
</html>
```

### Embedded in Existing Site

Add a chat widget to your existing website:

```html
<!-- Add this where you want the chat to appear -->
<div id="customer-support-chat" style="width: 350px; height: 500px;"></div>

<!-- Add this before closing </body> -->
<script type="module">
    import ChatWidget, { mount } from 'https://cdn.example.com/ChatWidget.js';
    mount(ChatWidget, {
        target: document.getElementById('customer-support-chat')
    });
</script>
```

## 🎨 Styling

The widget automatically adapts to its container size. Simply set the width and height on your container div:

```html
<div id="chat-widget" style="width: 100%; height: 400px;"></div>
```

## 🔒 Security Notes

- **Never hardcode your API key** in your HTML
- Use URL parameters for development/testing only
- For production, consider implementing a backend proxy to keep your API key secure

## 📦 What's Included

- `ChatWidget.js` - The main widget component
- `owui-widget.css` - Styling for the widget
- Clean, modern UI with smooth animations
- Auto-scrolling message container
- Loading indicators
- Responsive textarea that grows with content

## 🤝 Support

Having issues? The widget is designed to be as simple as possible:

1. Make sure your API key is valid
2. Check that your Open WebUI instance is accessible
3. Verify the endpoint URL is correct (defaults to `/api/chat/completions`)
4. Open your browser's console to see any error messages

## 🎯 Perfect For

- Adding AI chat to documentation sites
- Customer support widgets
- Interactive demos
- Educational tools
- Anywhere that could benefit from AI assistance

---

**That's all there is to it!** This widget is designed to make adding AI chat to your website as simple as possible. No complex setup, no heavy dependencies, just clean, functional chat in minutes.
