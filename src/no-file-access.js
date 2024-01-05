const id = chrome.runtime.id;
const lang = chrome.i18n.getUILanguage() === "ru" ? "ru" : "en";
const langWrap = document.querySelector(`#${lang}`);

langWrap.style.display = "flex";
langWrap.querySelector(".link").addEventListener("click", () =>
  chrome.tabs.create({
    url: `chrome://extensions/?id=${id}#allow-on-file-urls`,
  }),
);

document.querySelector("#title").innerText = chrome.i18n.getMessage("name");
