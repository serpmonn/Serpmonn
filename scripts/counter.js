async function updateCounter() {
    const response = await fetch('/counter');
    const data = await response.json();
    document.getElementById('userCounter').textContent = data.count;
}
updateCounter();