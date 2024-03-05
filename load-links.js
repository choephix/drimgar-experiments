async function loadManifestAndCreateLinks() {
  const response = await fetch('./manifest.csv');
  const data = await response.text();
  const items = data
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .sort();

  const listElement = document.createElement('ul');
  items.forEach(item => {
    item = item.substring(1, item.length).replace(/.jpg/g, '');
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = `./?art=${item}`;
    link.textContent = item;
    link.classList.add('link');
    listItem.appendChild(link);
    listElement.appendChild(listItem);
  });

  const sidebarElement = document.querySelector('#links');
  sidebarElement.appendChild(listElement);
}

window.addEventListener('DOMContentLoaded', loadManifestAndCreateLinks);
