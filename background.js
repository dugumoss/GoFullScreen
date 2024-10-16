console.log('Background script loaded - ' + new Date().toISOString());

let isProcessing = false;
let isListenerRegistered = false;

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'aboutPage',
    title: 'About GoFullScreen',
    contexts: ['action']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'aboutPage') {
    chrome.tabs.create({ url: 'about.html' });
  }
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
    console.log('Cannot capture this page');
    showErrorNotification("Cannot capture this page", "Browser restrictions prevent capturing on this type of page.");
    return;
  }

  if (isProcessing) {
    console.log('Capture already in progress, skipping');
    return;
  }

  isProcessing = true;

  console.log('isProcessing = true, capture start');

  try {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.scrollTo(0, 0)
    }).then(() => {
      console.log('Page scrolled to top');
      return chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['html2canvas.js']
      });
    }).then(() => {
      console.log('html2canvas script injected successfully');
      return chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    }).then(() => {
      console.log('Content script injected successfully');
      chrome.tabs.sendMessage(tab.id, { action: 'capture' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
          showErrorNotification("Message sending failed", "Unable to connect to content script.");
        } else {
          console.log('Message sent successfully:', response);
        }
      });
    }).catch((error) => {
      console.log('Error:', error);
      showErrorNotification("Capture failed", "Unable to perform capture, please ensure you have permission to access this page.");
      isProcessing = false;
    });
  } catch (error) {
    console.log('Error:', error);
    showErrorNotification("Capture failed", "Unable to perform capture, please ensure you have permission to access this page.");
    isProcessing = false;
  }
});

// Ensure the message listener is only registered once
if (!isListenerRegistered) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureResult') {
      if (request.success && request.dataUrl) {
        console.log('Capture successful');
        chrome.storage.sync.get({savePath: 'Screenshots/'}, function(items) {
          let now = new Date();
          let timestamp = now.getFullYear().toString() +
                          (now.getMonth() + 1).toString().padStart(2, '0') +
                          now.getDate().toString().padStart(2, '0') +
                          now.getHours().toString().padStart(2, '0') +
                          now.getMinutes().toString().padStart(2, '0') +
                          now.getSeconds().toString().padStart(2, '0');
          let filename = items.savePath + 'screenshot_' + timestamp + '.png';
          console.log('Received data URL length:', request.dataUrl.length);
          console.log('Data URL preview:', request.dataUrl.substring(0, 100) + '...');
          chrome.downloads.download({
            url: request.dataUrl,
            filename: filename,
            saveAs: false
          }, function(downloadId) {
            if (chrome.runtime.lastError) {
              console.error('Download error:', chrome.runtime.lastError);
              showErrorNotification("Capture failed", "Error saving screenshot: " + chrome.runtime.lastError.message);
            } else {
              console.log('Screenshot saved successfully, download ID:', downloadId);
              console.log('Saved file path:', filename);
              showSuccessNotification("Capture successful", "Screenshot saved to " + filename);
            }
          });
        });
      } else {
        console.log('Capture failed:', request.error || 'Unknown error');
        showErrorNotification("Capture failed", request.error || "Unknown error");
      }
      
      sendResponse({status: 'received'}); // Confirm message received
      isProcessing = false; // Reset state
    }
    return true; // Ensure sendResponse is asynchronous
  });

  isListenerRegistered = true;
}

function showErrorNotification(title, message) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: title,
      message: message,
      priority: 2
    }, function(notificationId) {
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 3000); // Clear notification after 3 seconds
    });
  } else {
    console.log('Error:', title, message);
  }
}

function showSuccessNotification(title, message) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: title,
      message: message,
      priority: 2
    }, function(notificationId) {
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 3000); // Clear notification after 3 seconds
    });
  } else {
    console.log('Success:', title, message);
  }
}

console.log('Event listener registered');
