chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message reçu dans background.js :", request);
  if (request.type === "createTabs") {
    const { storeName, mainLanguage, filesByLanguage } = request.data;

    const urls = generateUrls(storeName);
    for (const url of urls) {
      chrome.tabs.create({ url }, (tab) => {
        console.log("Opened tab with URL:", tab.url);
        const data = {
          type: "updateTemplate",
          data: {
            mainLanguage,
            filesByLanguage,
            urlPattern: url,
          },
        };

        // Utilisez chrome.tabs.onUpdated pour attendre que la page soit complètement chargée
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === "complete") {
            console.log("Sending updateTemplate message:", data);
            chrome.tabs.sendMessage(tab.id, data);
            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      });
    }
  }
  return true;
});

async function extractTemplatesFromZip(zipFile) {
  const templates = {};
  const zip = new JSZip();

  try {
    const content = await zip.loadAsync(zipFile);
    const fileNames = Object.keys(content.files);

    for (const fileName of fileNames) {
      if (fileName.endsWith(".html")) {
        const fileContent = await content.file(fileName).async("string");
        templates[fileName] = fileContent;
      }
    }
  } catch (error) {
    console.error("Error extracting templates from ZIP file:", error);
  }

  return templates;
}

function generateUrls(storeName) {
  const baseUrl = `https://admin.shopify.com/store/${storeName}/email_templates/`;
  const emailTypes = [
    "customer_account_activate",
    "customer_account_reset",
    "customer_account_welcome",
    "failed_payment_processing",
    "order_cancelled",
    "order_confirmation",
    "order_edited",
    "refund_notification",
    "shipment_delivered",
    "shipment_out_for_delivery",
    "shipping_confirmation",
    "shipping_update",
  ];

  return emailTypes.map((emailType) => `${baseUrl}${emailType}/edit`);
}
function getEmailTypeFromUrl(url) {
  const regex = /email_templates\/(.*)\/edit/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function convertEmailTemplatesToTemplatesByLanguage(emailTemplates) {
  const templatesByLanguage = {};

  for (const { fileName, typeMail, language } of emailTemplates) {
    if (!templatesByLanguage.hasOwnProperty(language)) {
      templatesByLanguage[language] = {};
    }

    templatesByLanguage[language][typeMail] = fileName;
  }

  return templatesByLanguage;
}
