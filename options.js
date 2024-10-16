document.addEventListener('DOMContentLoaded', () => {
  const addDomainButton = document.getElementById('addDomain');
  const removeDomainButton = document.getElementById('removeDomain');
  const clearDomainsButton = document.getElementById('clearDomains');
  const confirmDomainsButton = document.getElementById('confirmDomains');
  const domainInput = document.getElementById('domain');
  const domainList = document.getElementById('domainList');

  addDomainButton.addEventListener('click', () => {
    const domain = domainInput.value.trim();
    if (domain) {
      const domains = Array.from(domainList.children).map(li => li.textContent);
      if (!domains.includes(domain)) {
        const li = document.createElement('li');
        li.textContent = domain;
        li.addEventListener('click', () => {
          Array.from(domainList.children).forEach(child => child.classList.remove('selected'));
          li.classList.add('selected');
        });
        domainList.appendChild(li);
        domainInput.value = ''; // Clear input field
        showStatus('Domain added.');
      } else {
        showStatus('Domain already exists.');
      }
    } else {
      showStatus('Please enter a valid domain.');
    }
  });

  removeDomainButton.addEventListener('click', () => {
    const selected = domainList.querySelector('.selected');
    if (selected) {
      domainList.removeChild(selected);
      showStatus('Domain removed.');
    } else {
      showStatus('Please select a domain to remove.');
    }
  });

  clearDomainsButton.addEventListener('click', () => {
    domainList.innerHTML = '';
    showStatus('All domains cleared.');
  });

  confirmDomainsButton.addEventListener('click', () => {
    const domains = Array.from(domainList.children).map(li => li.textContent);
    if (domains.length > 0) {
      const permissions = domains.map(domain => {
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
          domain = `https://${domain}`;
        }
        return `${domain}/*`;
      });
      console.log('Requesting permissions for:', permissions); // Log permissions
      chrome.permissions.request({
        origins: permissions
      }, (granted) => {
        console.log('Permission granted:', granted); // Log result
        if (granted) {
          chrome.storage.sync.set({domains: domains}, () => {
            showStatus('Permissions granted and saved.');
          });
        } else {
          showStatus('Permissions not granted.');
        }
      });
    } else {
      showStatus('No domains to confirm.');
    }
  });

  function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  }

  // Load stored domains on initialization
  chrome.storage.sync.get({domains: []}, (data) => {
    data.domains.forEach(domain => {
      const li = document.createElement('li');
      li.textContent = domain;
      li.addEventListener('click', () => {
        Array.from(domainList.children).forEach(child => child.classList.remove('selected'));
        li.classList.add('selected');
      });
      domainList.appendChild(li);
    });
  });
});
