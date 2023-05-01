console.log("content.js chargé");

window.addEventListener("load", () => {
  console.log("Page loaded, content.js is ready to receive messages.");

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message reçu dans content.js :", request);
    // Votre logique de traitement des messages ici...
  });
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message reçu dans content.js :", request);
  if (request.type === "updateTemplate") {
    console.log("updateTemplate message received with data:", request.data);
    const { mainLanguage, templatesByLanguage, urlPattern } = request.data;
    const emailType = getEmailTypeFromUrl(urlPattern);
    console.log("Email type extracted:", emailType);

    if (emailType) {
      const htmlContent = templatesByLanguage[mainLanguage][emailType];
      console.log("HTML content for email type:", htmlContent);

      if (htmlContent) {
        observeTextBoxElement(htmlContent);
      }
    }
  }
});

function getEmailTypeFromUrl(url) {
  const regex = /email_templates\/(.*)\/edit/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function observeTextBoxElement(htmlContent) {
  window.addEventListener("load", () => {
    // Vérifiez d'abord si les éléments sont déjà dans le DOM
    const textBox = checkElementsInDom();
    if (textBox) {
      replaceContentAndSave(textBox, htmlContent);
      return;
    }

    const container = document.getElementById("PolarisPortalsContainer");

    if (!container) {
      console.error("Le conteneur PolarisPortalsContainer n'a pas été trouvé.");
      return;
    }

    const observer = new MutationObserver((mutations) => {
      console.log("MutationObserver déclenché");

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const modal = node.querySelector(
                'div[id^="modal-Polarisportal"]'
              );
              if (modal) {
                const textBox = modal.querySelector('div[role="textbox"]');
                if (textBox) {
                  observer.disconnect();
                  replaceContentAndSave(textBox, htmlContent);
                  return;
                }
              }
            }
          }
        }
      }
    });

    observer.observe(container, { childList: true, subtree: true });
  });
}

function checkElementsInDom() {
  const container = document.getElementById("PolarisPortalsContainer");

  if (!container) {
    console.error("Le conteneur PolarisPortalsContainer n'a pas été trouvé.");
    return null;
  }

  const modal = container.querySelector('div[id^="modal-Polarisportal"]');

  if (!modal) {
    console.log("Aucun modal trouvé dans le DOM.");
    return null;
  }

  const textBox = modal.querySelector('div[role="textbox"]');

  if (!textBox) {
    console.log("Aucun élément 'textbox' trouvé dans le modal.");
    return null;
  }

  return textBox;
}

function replaceContentAndSave(textBox, htmlContent) {
  textBox.innerHTML = htmlContent;
  textBox.dispatchEvent(
    new Event("input", { bubbles: true, cancelable: true })
  );

  const saveButton = document.querySelector(
    "#SettingsContextualSaveBar button.Polaris-Button--primary"
  );
  if (saveButton) {
    saveButton.click();
  }

  console.log("textBox trouvé :", textBox);
  console.log("saveButton trouvé :", saveButton);
}
