function addAltChecker() {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  // Create and append the checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'altToggle';
  checkbox.checked = params.has('alt');
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      params.append('alt', '');
    } else {
      params.delete('alt');
    }
    params.set('fscale', checkbox.checked ? '1.2' : '1.0');
    url.search = params.toString();
    window.location.href = url; // refresh the page outright
  });
  const label = document.createElement('label');
  label.htmlFor = 'altToggle';
  label.textContent = 'Toggle alt';

  const sidebarElement = document.querySelector('#links');
  sidebarElement.appendChild(checkbox);
  sidebarElement.appendChild(label);
}

async function loadManifestAndCreateLinks() {
  const response = await fetch('./manifest.csv');
  const data = await response.text();
  const items = data
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .sort();

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  addAltChecker();

  const listElement = document.createElement('ul');
  items.forEach(item => {
    item = item.substring(1, item.length).replace(/.jpg/g, '');
    const listItem = document.createElement('li');
    const link = document.createElement('a');

    params.set('art', item);
    url.search = params.toString();
    link.href = url.toString();
    link.textContent = item;
    link.classList.add('link');
    link.onclick = () => window.setArtPath?.(item);
    listItem.appendChild(link);
    listElement.appendChild(listItem);
  });

  const sidebarElement = document.querySelector('#links');
  sidebarElement.appendChild(listElement);
}

window.addEventListener('DOMContentLoaded', loadManifestAndCreateLinks);
