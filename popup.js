document.addEventListener("DOMContentLoaded", () => {
  const shopNameInput = document.getElementById("shop-name");
  const mainLanguageSelect = document.getElementById("main-language");
  const zipFileInput = document.getElementById("zip-file");
  const importBtn = document.getElementById("import-btn");
  const urlList = document.getElementById("url-list");
  const createEmailsBtn = document.getElementById("create-emails-btn");

  let filesByLanguage = {};
  let templatesByLanguage = {};
  let mainLanguage;

  importBtn.addEventListener("click", async () => {
    console.log("Import button clicked");
    const shopName = shopNameInput.value;
    mainLanguage = mainLanguageSelect.value;

    if (!shopName) {
      alert("Veuillez entrer le nom de la boutique.");
      return;
    }

    if (!zipFileInput.files[0]) {
      alert("Veuillez sélectionner un fichier ZIP.");
      return;
    }

    const zipFile = zipFileInput.files[0];
    filesByLanguage[mainLanguage] = zipFile;

    // Attendez que la fonction extractHtmlFiles ait terminé
    templatesByLanguage = await extractHtmlFiles(filesByLanguage);
    console.log("Templates by language:", templatesByLanguage);

    const urls = generateUrls(shopName);
    console.log("Generated URLs:", urls);
    displayCreatedUrls(urls, templatesByLanguage);
  });

  createEmailsBtn.addEventListener("click", () => {
    const shopName = shopNameInput.value;
    const mainLanguage = mainLanguageSelect.value;

    if (!shopName) {
      alert("Veuillez entrer le nom de la boutique.");
      return;
    }
    console.log("Sending createTabs message");
    chrome.runtime.sendMessage({
      type: "createTabs",
      data: {
        storeName: shopName,
        mainLanguage,
        filesByLanguage,
      },
    });

    console.log("Message envoyé depuis popup.js");
  });

  async function extractHtmlFiles(filesByLanguage) {
    const templatesByLanguage = {};

    for (const language in filesByLanguage) {
      const zipFile = filesByLanguage[language];
      const templates = await extractTemplatesFromZip(zipFile);
      templatesByLanguage[language] = templates;
    }

    return templatesByLanguage;
  }

  async function extractTemplatesFromZip(zipFile) {
    const templates = {};
    const zip = new JSZip();

    try {
      const content = await zip.loadAsync(zipFile);
      const fileNames = Object.keys(content.files);

      for (const fileName of fileNames) {
        if (fileName.endsWith(".html")) {
          const fileContent = await content.file(fileName).async("string");

          // Remove the language prefix and the '/' (slash) from the file name
          const emailType = fileName.split("/")[1].replace(".html", "");

          templates[emailType] = fileContent;
          console.log("Extrait :", fileName, fileContent);
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

  function displayCreatedUrls(urls, templatesByLanguage) {
    // console.log("Templates by language:", templatesByLanguage);
    console.log("Displaying created URLs:", urls);
    console.log("Available templates:", templatesByLanguage[mainLanguage]);
    const ul = document.createElement("ul");
    urls.forEach((url) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.textContent = url;
      li.appendChild(link);

      const previewBtn = document.createElement("button");
      previewBtn.textContent = "Preview";
      previewBtn.addEventListener("click", () => {
        const emailType = getEmailTypeFromUrl(url);
        console.log("Email type:", emailType);

        if (!templatesByLanguage || !templatesByLanguage[mainLanguage]) {
          console.error(
            "Les templates ne sont pas disponibles pour la langue principale."
          );
          return;
        }

        const htmlContent = templatesByLanguage[mainLanguage][emailType];

        if (!htmlContent) {
          console.error(
            "Le contenu HTML pour ce type d'e-mail est introuvable."
          );
          return;
        }

        // Ouvre un nouvel onglet avec le contenu HTML pour ce type d'e-mail
        const newWindow = window.open("", "_blank");
        newWindow.document.write(htmlContent);
      });
      li.appendChild(previewBtn);
      ul.appendChild(li);
    });
    urlList.innerHTML = "";
    urlList.appendChild(ul);
  }
});
